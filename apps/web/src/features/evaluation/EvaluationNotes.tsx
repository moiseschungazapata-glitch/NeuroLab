import {useEffect, useState} from 'react';
import type {LaboratoryContext} from '../../hooks/useLaboratory';
import {displayDate} from '../projects/model';
import type {JobEvaluation} from '../training/service';

export function EvaluationNotes({jobId, training}: {jobId: string; training: LaboratoryContext['training']}) {
 const {getEvaluation, saveEvaluation, online} = training;
 const [saved, setSaved] = useState<JobEvaluation>();
 const [draft, setDraft] = useState<JobEvaluation>();
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState('');
 const [conflict, setConflict] = useState(false);
 const [reload, setReload] = useState(0);
 const dirty = draft && saved && (draft.observations !== saved.observations || draft.limitations !== saved.limitations);

 useEffect(() => {
  const controller = new AbortController();
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]);
  setLoading(true);
  setError('');
  getEvaluation(jobId, signal).then(result => {
   if (controller.signal.aborted) return;
   setSaved(result);
   setDraft(result);
   setConflict(false);
  }).catch(() => {
   if (!controller.signal.aborted) setError('No se pudieron cargar las notas. Reintenta cuando la API esté disponible.');
  }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
  return () => controller.abort();
 }, [jobId, getEvaluation, reload]);

 async function save() {
  if (!draft || !dirty || saving || conflict) return;
  setSaving(true);
  setError('');
  try {
   const result = await saveEvaluation(jobId, draft);
   setSaved(result);
   setDraft(result);
  } catch (cause) {
   if ((cause as {status?: number}).status === 409) {
    setConflict(true);
    setError('Las notas cambiaron en otra sesión. Copia tu borrador antes de cargar la versión del servidor.');
   } else {
    setError('No se pudieron guardar las notas. El borrador sigue disponible en este formulario.');
   }
  } finally { setSaving(false); }
 }

 return <section className="panel evaluation-panel">
  <h3>Observaciones y limitaciones</h3>
  {loading && <p role="status">Cargando notas…</p>}
  {error && <p role="alert">{error}</p>}
  {!loading && (!draft || conflict) && <button className="secondary" onClick={() => setReload(value => value + 1)}>
   {conflict ? 'Descartar borrador y cargar notas' : 'Volver a cargar notas'}
  </button>}
  {draft && <form onSubmit={event => { event.preventDefault(); void save(); }}>
   <label>Observaciones<textarea aria-label="Observaciones" maxLength={4000} disabled={saving || loading} value={draft.observations}
    onChange={event => setDraft({...draft, observations: event.target.value})}/></label>
   <label>Limitaciones<textarea aria-label="Limitaciones" maxLength={4000} disabled={saving || loading} value={draft.limitations}
    onChange={event => setDraft({...draft, limitations: event.target.value})}/></label>
   <button type="submit" className="primary" disabled={!dirty || saving || loading || conflict || !online}>Guardar evaluación</button>
   <p className="muted" role="status">{saving ? 'Guardando…' : dirty ? 'Cambios sin guardar' : saved?.updatedAt ? `Guardado en el servidor · ${displayDate(saved.updatedAt)}` : 'Las notas se guardan con esta ejecución.'}</p>
  </form>}
 </section>;
}
