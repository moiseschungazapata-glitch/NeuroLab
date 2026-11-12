import {RealTrainingSummary} from '../training/RealTrainingSummary';
import {useState} from 'react';
import {SystemHealth} from './SystemHealth';
import {DashboardOperations} from './DashboardOperations';
import {DashboardNetwork} from './DashboardNetwork';
import {dashboardSummary} from './summary';
import {Activity, ArrowRight, Box, Check, ChevronRight, FlaskConical, FolderKanban, GitBranch, Layers} from 'lucide-react';
import type {LaboratoryContext} from '../../hooks/useLaboratory';
import {ProjectCard} from '../projects/ProjectCard';
import {ExperimentTable} from '../training/ExperimentTable';

export function DashboardPage({context}: {context: LaboratoryContext}) {
  const [scope, setScope] = useState('all');
  const scoped = scope === 'all' ? context : {
    ...context,
    projects: context.projects.filter(project => String(project.id) === scope),
    runs: context.runs.filter(run => String(run.projectId) === scope),
    versions: context.versions.filter(version => String(version.projectId) === scope),
    running: context.running && String(context.job?.projectId) === scope,
  };
  const {projects, versions, openProject, go} = scoped;
  const summary = dashboardSummary(scoped);
  const recent = {...scoped, runs: scoped.runs.slice(0, 5)};

  return <>
    <div className="dashboard-filter">
      <label>Resumen de
        <select aria-label="Filtrar dashboard por proyecto" value={scope} onChange={event=>{
          setScope(event.target.value);
          if (event.target.value !== 'all') context.setProject(Number(event.target.value));
        }}>
          <option value="all">Todos los proyectos</option>
          {context.projects.map(project=><option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </label>
      <p>Datos locales · Los resultados de entrenamiento son simulados.</p>
    </div>

    <section className="hero">
      <div>
        <div className="hero-pill"><i/> TU PRÓXIMO DESCUBRIMIENTO EMPIEZA AQUÍ</div>
        <h2>Ideas que se conectan.<br/><span>Modelos que aprenden.</span></h2>
        <p>Explora arquitecturas, diseña redes neuronales y sigue<br className="desktop"/> cada paso de tus experimentos en un solo lugar.</p>
        <button onClick={()=>go(3)}>Abrir diseñador <ArrowRight size={16}/></button>
      </div>
      <DashboardNetwork/>
    </section>

    <section className="stats">
      {[
        [FolderKanban, 'Proyectos', projects.length, 'Registrados en este navegador'],
        [Layers, 'Arquitecturas válidas', summary.validArchitectures, 'Del proyecto seleccionado · 4 familias de diseño'],
        [Activity, 'Simulaciones', summary.total, 'Finalizados y simulación en curso'],
        [Box, 'Versiones de modelos', versions.length, 'Configuraciones guardadas localmente'],
      ].map(([Icon, label, value, caption], index)=>{
        const StatIcon = Icon as typeof Box;
        return <article className="stat" key={index}>
          <div><span>{label as string}</span><StatIcon size={19}/></div>
          <strong>{value as number}</strong>
          <p>{caption as string}</p>
        </article>;
      })}
    </section>

    <DashboardOperations context={scoped}/>
    <SystemHealth/>
    <RealTrainingSummary context={scoped}/>

    <div className="dashboard-grid">
      <section className="panel">
        <div className="section-title">
          <div><h3>Simulaciones recientes</h3><p>Cada iteración, un paso más cerca.</p></div>
          <button className="text-btn" onClick={()=>go(5)}>Ver todos <ArrowRight size={14}/></button>
        </div>
        {recent.runs.length
          ? <ExperimentTable context={recent}/>
          : <div className="dashboard-empty"><p>No hay experimentos registrados en esta selección.</p><button className="secondary" onClick={()=>go(5)}>Configurar experimento</button></div>}
        <div className="panel-foot"><span className="subtle-dot"/> Registros del navegador · Incluye ejemplos y simulaciones</div>
      </section>

      <section className="panel workflow">
        <div className="section-title"><h3>Tu ruta de experimentación</h3><GitBranch size={18}/></div>
        {[
          ['Define el problema', 'Crea y organiza tu proyecto', 1],
          ['Diseña tu arquitectura', 'Elige las capas y conexiones', 3],
          ['Entrena y evalúa', 'Explora métricas y resultados', 5],
          ['Conserva tu mejor versión', 'Documenta tu aprendizaje', 7],
        ].map(([title, caption, destination], index)=><button key={index} onClick={()=>go(Number(destination))}>
          <span className={'step '+(index === 0 && projects.length ? 'done' : '')}>{index === 0 && projects.length ? <Check size={15}/> : index + 1}</span>
          <div><strong>{title}</strong><small>{caption}</small></div><ChevronRight size={14}/>
        </button>)}
        <div className="tip"><FlaskConical size={16}/><span>Semana 11 <strong>De la teoría a la práctica.</strong></span></div>
      </section>
    </div>

    <div className="section-title lower">
      <h3>Proyectos en tu radar <span className="count">{projects.length}</span></h3>
      <button className="text-btn" onClick={()=>go(1)}>Explorar proyectos <ArrowRight size={14}/></button>
    </div>
    <div className="project-grid">
      {!projects.length && <div className="panel dashboard-empty"><p>No tienes proyectos todavía.</p><button className="primary" onClick={()=>context.setModal(true)}>Crear primer proyecto</button></div>}
      {projects.slice(0, 3).map((project, index)=><ProjectCard key={project.id} p={project} i={index} onClick={()=>openProject(project.id)}/>)}
    </div>
  </>;
}
