import {AlertTriangle, HelpCircle, X} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {useModalFocus} from '../hooks/useModalFocus';

type PendingAction = {
  button: HTMLButtonElement;
  title: string;
  message: string;
  label: string;
  tone: 'default' | 'danger';
};

const confirmations: Record<string, Omit<PendingAction, 'button'>> = {
  'Crear proyecto': {title: '¿Crear este proyecto?', message: 'El proyecto se guardará en este navegador y se abrirá su espacio de diseño.', label: 'Crear proyecto', tone: 'default'},
  'Guardar cambios': {title: '¿Guardar los cambios del proyecto?', message: 'Se actualizarán el contexto, la familia, el estado y las etiquetas del proyecto.', label: 'Guardar cambios', tone: 'default'},
  'Guardar documentación': {title: '¿Guardar la documentación?', message: 'El documento actual reemplazará la versión guardada del proyecto.', label: 'Guardar documentación', tone: 'default'},
  'Agregar miembro': {title: '¿Registrar este miembro?', message: 'El miembro y su rol se añadirán a la configuración local del proyecto.', label: 'Agregar miembro', tone: 'default'},
  'Crear copia': {title: '¿Duplicar este proyecto?', message: 'Se creará un proyecto independiente con el contexto y las arquitecturas actuales.', label: 'Crear copia', tone: 'default'},
  'Reactivar proyecto': {title: '¿Reactivar este proyecto?', message: 'El proyecto volverá a admitir nuevas simulaciones y entrenamientos.', label: 'Reactivar', tone: 'default'},
  'Probar arquitectura': {title: '¿Probar esta arquitectura?', message: 'Se iniciará una simulación educativa con la configuración actual.', label: 'Iniciar prueba', tone: 'default'},
  'Guardar revisión': {title: '¿Guardar una revisión?', message: 'Se conservará una copia independiente de la arquitectura actual.', label: 'Guardar revisión', tone: 'default'},
  'Ajustar entrada y salida al dataset': {title: '¿Ajustar la arquitectura?', message: 'La forma de entrada y la salida del diseño se modificarán para coincidir con este dataset.', label: 'Ajustar arquitectura', tone: 'default'},
  'Crear versión preparada': {title: '¿Crear la versión preparada?', message: 'Se generará una nueva versión inmutable con las particiones y normalización seleccionadas.', label: 'Crear versión', tone: 'default'},
  'Seleccionar versión': {title: '¿Seleccionar este dataset?', message: 'Esta versión preparada se utilizará en los próximos experimentos del proyecto.', label: 'Seleccionar versión', tone: 'default'},
  'Registrar archivo': {title: '¿Registrar este dataset?', message: 'El archivo será validado y almacenado localmente como una versión original.', label: 'Registrar dataset', tone: 'default'},
  'Entrenar con TensorFlow': {title: '¿Iniciar el entrenamiento real?', message: 'Los conjuntos preparados se enviarán a la API y TensorFlow iniciará un trabajo que puede consumir tiempo y recursos.', label: 'Iniciar entrenamiento', tone: 'default'},
  'Cancelar entrenamiento real': {title: '¿Cancelar el entrenamiento?', message: 'El worker detendrá el trabajo y la ejecución quedará registrada como cancelada.', label: 'Cancelar entrenamiento', tone: 'danger'},
  'Reintentar entrenamiento real': {title: '¿Reintentar este entrenamiento?', message: 'Se creará un trabajo nuevo desde el inicio conservando la ejecución anterior.', label: 'Crear reintento', tone: 'default'},
  'Iniciar simulación': {title: '¿Iniciar la simulación educativa?', message: 'Comenzará un recorrido ilustrativo; no se ajustarán pesos reales.', label: 'Iniciar simulación', tone: 'default'},
  'Guardar versión': {title: '¿Guardar esta versión?', message: 'La configuración y los resultados actuales quedarán registrados en el navegador.', label: 'Guardar versión', tone: 'default'},
  'Guardar evaluación': {title: '¿Guardar esta evaluación?', message: 'Las observaciones y limitaciones quedarán vinculadas a esta ejecución real.', label: 'Guardar evaluación', tone: 'default'},
  'Registrar versión': {title: '¿Registrar esta versión de modelo?', message: 'Se congelarán arquitectura, dataset, configuración, métricas y huellas de artefactos.', label: 'Registrar versión', tone: 'default'},
  'Marcar como revisado': {title: '¿Marcar el modelo como revisado?', message: 'El estado avanzará a Revisado y quedará registrado en el historial.', label: 'Marcar revisado', tone: 'default'},
  'Aprobar versión': {title: '¿Aprobar esta versión?', message: 'El modelo quedará identificado como aprobado para el flujo de demostración.', label: 'Aprobar versión', tone: 'default'},
  'Retirar versión': {title: '¿Retirar esta versión?', message: 'El modelo seguirá en el historial, pero su estado cambiará a Retirado.', label: 'Retirar versión', tone: 'danger'},
  'Historial CSV': {title: '¿Exportar el historial CSV?', message: 'Se descargará el historial visible con el filtro de fuente seleccionado.', label: 'Descargar CSV', tone: 'default'},
  'Reporte PDF': {title: '¿Generar el reporte PDF?', message: 'La API creará un documento con el proyecto, arquitectura, entrenamientos y modelos registrados.', label: 'Generar PDF', tone: 'default'},
};

function requestedConfirmation(button: HTMLButtonElement) {
  if (button.closest('.confirmation-dialog')) return undefined;
  const explicit = button.dataset.confirmTitle;
  if (explicit) return {
    title: explicit,
    message: button.dataset.confirmMessage ?? 'Revisa la información antes de continuar.',
    label: button.dataset.confirmLabel ?? 'Confirmar',
    tone: button.dataset.confirmTone === 'danger' ? 'danger' as const : 'default' as const,
  };
  const text = button.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const direct = confirmations[text];
  if (direct) return direct;
  if (text === 'Cancelar' && button.closest('.monitor')) return {title: '¿Cancelar la simulación?', message: 'La simulación se detendrá y quedará registrada como cancelada.', label: 'Cancelar simulación', tone: 'danger' as const};
  const accessible = button.getAttribute('aria-label') ?? '';
  if (accessible.startsWith('Descartar alerta:')) return {title: '¿Descartar esta alerta?', message: 'La alerta se ocultará del Dashboard hasta que restaures las alertas descartadas.', label: 'Descartar alerta', tone: 'default' as const};
  return undefined;
}

export function ActionConfirmation() {
  const [pending, setPending] = useState<PendingAction>();
  const approved = useRef<HTMLButtonElement | null>(null);
  const dialog = useRef<HTMLElement>(null);
  const close = () => setPending(undefined);
  useModalFocus(dialog, close, false, Boolean(pending));

  useEffect(() => {
    const intercept = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
      if (!target || target.disabled) return;
      if (target.type === 'submit' && target.form && !target.form.checkValidity()) return;
      if (approved.current === target) {
        approved.current = null;
        return;
      }
      const request = requestedConfirmation(target);
      if (!request) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setPending({button: target, ...request});
    };
    document.addEventListener('click', intercept, true);
    return () => document.removeEventListener('click', intercept, true);
  }, []);

  if (!pending) return null;
  const confirm = () => {
    const button = pending.button;
    approved.current = button;
    setPending(undefined);
    queueMicrotask(() => button.isConnected && button.click());
  };

  return <div className="modal-backdrop confirmation-backdrop" onMouseDown={event=>event.target===event.currentTarget&&close()}>
    <section ref={dialog} className={'modal confirmation-dialog '+(pending.tone==='danger'?'confirmation-danger':'')} role="alertdialog" aria-modal="true" aria-labelledby="confirmation-title" aria-describedby="confirmation-message">
      <button className="icon-btn confirmation-close" aria-label="Cerrar confirmación" onClick={close}><X size={18}/></button>
      <span className="confirmation-icon">{pending.tone==='danger'?<AlertTriangle size={24}/>:<HelpCircle size={24}/>}</span>
      <p className="eyebrow">CONFIRMACIÓN REQUERIDA</p>
      <h2 id="confirmation-title">{pending.title}</h2>
      <p id="confirmation-message">{pending.message}</p>
      <div className="confirmation-actions">
        <button className="secondary" onClick={close}>Cancelar</button>
        <button className={pending.tone==='danger'?'danger-confirm':'primary'} onClick={confirm}>{pending.label}</button>
      </div>
    </section>
  </div>;
}

