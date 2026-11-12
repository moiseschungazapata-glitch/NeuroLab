import {useState} from 'react';
import type {LaboratoryContext} from '../../hooks/useLaboratory';
import {displayDate} from '../projects/model';
import {stateLabel, type RealJob} from '../training/service';
import {EpochChart} from './EpochChart';
import {EvaluationNotes} from './EvaluationNotes';
import {canOverlay, formatMetric, metricLabel, metrics} from './metrics';

function jobLabel(job: RealJob) {
 return `${job.id.slice(0, 8)} · ${job.family} · ${job.dataset.name} v${job.dataset.version} · ${stateLabel[job.state]}`;
}

export function RealEvaluation({context}: {context: LaboratoryContext}) {
 const {training, projects, project, setProject, go} = context;
 const jobs = training.jobs.filter(job => job.projectId === project);
 const job = jobs.find(job => job.id === training.selected) ?? jobs.find(job => job.state === 'COMPLETED') ?? jobs[0];
 return <div className="real-evaluation">
  <div className="panel evaluation-selectors">
   <label>Proyecto de evaluación<select aria-label="Proyecto de evaluación" value={projects.some(item => item.id === project) ? project : ''}
    onChange={event => setProject(Number(event.target.value))}>
    {!projects.length && <option value="">Sin proyectos</option>}
    {projects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
   </select></label>
   <label>Ejecución real<select aria-label="Ejecución real" disabled={!job} value={job?.id ?? ''} onChange={event => training.setSelected(event.target.value)}>
    {!job && <option value="">Sin ejecuciones disponibles</option>}
    {jobs.map(item => <option key={item.id} value={item.id}>{jobLabel(item)}</option>)}
   </select></label>
   <button className="secondary" onClick={() => void training.refresh()}>Actualizar ejecuciones</button>
  </div>
  {!training.online && <p className="dataset-warning" role="status">{training.error || 'Conectando con el historial de entrenamiento…'}</p>}
  {job ? <JobResults key={job.id} job={job} jobs={jobs} context={context}/> : <section className="panel evaluation-panel">
   <h3>Resultados de TensorFlow</h3>
   <p>{training.online ? 'Este proyecto aún no tiene entrenamientos reales.' : 'Las ejecuciones aparecerán cuando se cargue el historial.'}</p>
   <button className="secondary" onClick={() => go(5)}>Ir a Entrenamientos</button>
  </section>}
 </div>;
}

function JobResults({job, jobs, context}: {job: RealJob; jobs: RealJob[]; context: LaboratoryContext}) {
 const [comparisonId, setComparisonId] = useState('');
 const [selectedMetric, setSelectedMetric] = useState('loss');
 const comparison = jobs.find(item => item.id === comparisonId && item.id !== job.id);
 const compatible = comparison && canOverlay(job, comparison);
 const available = metrics.filter(({key}) => job.metrics.some(row => Number.isFinite(row[key]) || Number.isFinite(row[`val_${key}`])));
 const metric = available.find(item => item.key === selectedMetric) ?? available[0];
 const final = metrics.filter(({key}) => Number.isFinite(job.testMetrics?.[key]));
 const latest = job.metrics.at(-1);
 const points = (run: RealJob, key: string) => run.metrics.map(row => ({epoch: row.epoch, value: row[key]}));

 return <>
  <section className="panel evaluation-panel">
   <div className="evaluation-title"><h3>{job.family} · {job.id.slice(0, 8)}</h3><span className="badge">{stateLabel[job.state]}</span></div>
   <p>{job.dataset.name} · versión {job.dataset.version} · {displayDate(job.createdAt)}</p>
   <dl className="evaluation-facts">
    <div><dt>Épocas registradas</dt><dd>{job.epoch} / {job.config.epochs}</dd></div>
    <div><dt>Muestras de entrenamiento</dt><dd>{job.dataset.counts.train}</dd></div>
    <div><dt>Muestras de validación</dt><dd>{job.dataset.counts.validation}</dd></div>
    <div><dt>Muestras de prueba</dt><dd>{job.dataset.counts.test}</dd></div>
   </dl>
   {job.error && <p className="dataset-warning">{job.error}</p>}
   <button className="text-btn" onClick={() => { context.training.setSelected(job.id); context.go(5); }}>Abrir monitor de esta ejecución</button>
  </section>
  <section className="panel evaluation-panel">
   <h3>Métricas por época</h3>
   {metric ? <>
    <label>Métrica del gráfico<select aria-label="Métrica del gráfico" value={metric.key} onChange={event => setSelectedMetric(event.target.value)}>
     {available.map(item => <option key={item.key} value={item.key}>{metricLabel(job, item)}</option>)}
    </select></label>
    <EpochChart metric={metric.key} label={metricLabel(job, metric)} series={[
     {label: 'Entrenamiento', points: points(job, metric.key), color: '--evaluation-train'},
     {label: 'Validación', points: points(job, `val_${metric.key}`), color: '--evaluation-validation', dashed: true},
     ...(compatible && comparison.metrics.some(row => Number.isFinite(row[`val_${metric.key}`])) ? [{
      label: `Validación · ${comparison.id.slice(0, 8)}`, points: points(comparison, `val_${metric.key}`), color: '--evaluation-comparison',
     }] : []),
    ]}/>
    <details><summary>Consultar valores por época</summary>
     <div className="table-wrap"><table><thead><tr><th>Época</th><th>Entrenamiento</th><th>Validación</th>
      {compatible && <th>Validación · comparación</th>}</tr></thead><tbody>
      {Array.from(new Set([...job.metrics, ...(compatible ? comparison.metrics : [])].map(row => row.epoch))).sort((a,b) => a-b).map(epoch => {
       const row = job.metrics.find(item => item.epoch === epoch);
       const other = compatible ? comparison.metrics.find(item => item.epoch === epoch) : undefined;
       return <tr key={epoch}><th scope="row">{epoch}</th><td>{formatMetric(metric.key, row?.[metric.key])}</td>
        <td>{formatMetric(metric.key, row?.[`val_${metric.key}`])}</td>
        {compatible && <td>{formatMetric(metric.key, other?.[`val_${metric.key}`])}</td>}</tr>;
      })}
     </tbody></table></div>
    </details>
   </> : <p>Esta ejecución aún no tiene métricas por época registradas.</p>}
  </section>
  <section className="panel evaluation-panel">
   <h3>Evaluación final sobre prueba</h3>
   {final.length ? <dl className="evaluation-facts">
    {final.map(item => <div key={item.key}><dt>{metricLabel(job, item)}</dt><dd>{formatMetric(item.key, job.testMetrics?.[item.key])}</dd></div>)}
   </dl> : <p>La evaluación sobre prueba aparece cuando el entrenamiento finaliza correctamente.</p>}
   {job.stoppedEarly && <p>La prueba se evaluó con los mejores pesos de validación restaurados por la parada temprana.</p>}
   {job.family === 'GAN' && <p>Las pérdidas del generador y del discriminador describen sus objetivos de entrenamiento. Evalúa también la calidad y diversidad de las muestras generadas.</p>}
  </section>
  <section className="panel evaluation-panel">
   <h3>Comparar ejecuciones</h3>
   <label>Ejecución de comparación<select aria-label="Ejecución de comparación" value={comparison?.id ?? ''} onChange={event => setComparisonId(event.target.value)}>
    <option value="">Seleccionar otra ejecución</option>
    {jobs.filter(item => item.id !== job.id).map(item => <option key={item.id} value={item.id}>{jobLabel(item)}</option>)}
   </select></label>
   {comparison && <>
    <p>{compatible ? 'Ambas ejecuciones usaron la misma familia, tarea y conjuntos preparados. El gráfico incluye la validación de la segunda ejecución cuando hay datos de la métrica.' : 'La familia, tarea o preparación difieren. Revisa esas condiciones antes de interpretar las diferencias de métricas.'}</p>
    <div className="table-wrap"><table><thead><tr><th>Indicador</th><th>{job.id.slice(0, 8)}</th><th>{comparison.id.slice(0, 8)}</th></tr></thead><tbody>
     <tr><th scope="row">Familia</th><td>{job.family}</td><td>{comparison.family}</td></tr>
     <tr><th scope="row">Dataset</th><td>{job.dataset.name} v{job.dataset.version}</td><td>{comparison.dataset.name} v{comparison.dataset.version}</td></tr>
     <tr><th scope="row">Épocas registradas</th><td>{job.epoch}</td><td>{comparison.epoch}</td></tr>
     {metrics.filter(({key}) => Number.isFinite(latest?.[`val_${key}`]) || Number.isFinite(comparison.metrics.at(-1)?.[`val_${key}`])).map(item =>
      <tr key={`val_${item.key}`}><th scope="row">Última validación · {item.label}</th><td>{formatMetric(item.key, latest?.[`val_${item.key}`])}</td><td>{formatMetric(item.key, comparison.metrics.at(-1)?.[`val_${item.key}`])}</td></tr>)}
     {metrics.filter(({key}) => Number.isFinite(job.testMetrics?.[key]) || Number.isFinite(comparison.testMetrics?.[key])).map(item =>
      <tr key={`test_${item.key}`}><th scope="row">Prueba · {item.label}</th><td>{formatMetric(item.key, job.testMetrics?.[item.key])}</td><td>{formatMetric(item.key, comparison.testMetrics?.[item.key])}</td></tr>)}
    </tbody></table></div>
   </>}
  </section>
  <EvaluationNotes jobId={job.id} training={context.training}/>
 </>;
}
