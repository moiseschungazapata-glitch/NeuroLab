import type {RealJob} from '../training/service';

export const metrics = [
 {key: 'loss', label: 'Pérdida'},
 {key: 'accuracy', label: 'Exactitud'},
 {key: 'mae', label: 'Error absoluto medio (MAE)'},
 {key: 'g_loss', label: 'Pérdida del generador'},
];

export function metricLabel(job: RealJob, metric: typeof metrics[number]) {
 return job.family === 'GAN' && metric.key === 'loss' ? 'Pérdida del discriminador' : metric.label;
}

export function formatMetric(key: string, value?: number) {
 if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
 if (key === 'accuracy') return value.toLocaleString('es-PE', {style: 'percent', maximumFractionDigits: 2});
 if (value !== 0 && (Math.abs(value) < .0001 || Math.abs(value) >= 1e7)) return value.toExponential(2);
 return value.toLocaleString('es-PE', {maximumFractionDigits: 4});
}

export function canOverlay(a: RealJob, b: RealJob) {
 return a.family === b.family && a.dataset.task === b.dataset.task &&
  Boolean(a.dataset.preparedChecksum) && a.dataset.preparedChecksum === b.dataset.preparedChecksum &&
  (a.family !== 'GAN' || a.architecture.outputActivation === b.architecture.outputActivation);
}
