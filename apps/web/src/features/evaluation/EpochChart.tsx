import {useEffect, useRef} from 'react';
import {formatMetric} from './metrics';

type Series = {label: string; points: {epoch: number; value?: number}[]; color: string; dashed?: boolean};

export function EpochChart({metric, label, series}: {metric: string; label: string; series: Series[]}) {
 const canvas = useRef<HTMLCanvasElement>(null);

 useEffect(() => {
  const element = canvas.current;
  if (!element) return;
  function draw() {
   if (!element) return;
   const context = element.getContext('2d');
   if (!context) return;
   const width = element.clientWidth;
   const height = element.clientHeight;
   if (!width || !height) return;
   const scale = window.devicePixelRatio || 1;
   element.width = Math.round(width * scale);
   element.height = Math.round(height * scale);
   context.scale(scale, scale);
   const values = series.flatMap(line => line.points.flatMap(point =>
    typeof point.value === 'number' && Number.isFinite(point.value) ? [point.value] : []));
   if (!values.length) return;
   const low = Math.min(0, ...values);
   const high = Math.max(...values, metric === 'accuracy' ? 1 : .000001);
   const lastEpoch = Math.max(1, ...series.flatMap(line => line.points.map(point => point.epoch)));
   const left = 69, right = width - 14, top = 16, bottom = height - 44;
   const x = (epoch: number) => left + (right - left) * (epoch - 1) / Math.max(1, lastEpoch - 1);
   const y = (value: number) => bottom - (bottom - top) * (value - low) / (high - low);
   const style = getComputedStyle(element);
   context.font = '12px system-ui';
   context.fillStyle = style.color;
   context.strokeStyle = style.getPropertyValue('--border').trim() || '#ccc';
   context.textBaseline = 'middle';
   context.textAlign = 'right';
   for (let index = 0; index <= 4; index++) {
    const value = low + (high - low) * index / 4;
    context.beginPath();
    context.moveTo(left, y(value));
    context.lineTo(right, y(value));
    context.stroke();
    context.fillText(formatMetric(metric, value), left - 7, y(value));
   }
   context.textAlign = 'center';
   const epochs = new Set(Array.from({length: 5}, (_, i) => 1 + Math.round((lastEpoch - 1) * i / 4)));
   for (const epoch of epochs) context.fillText(String(epoch), x(epoch), bottom + 14);
   context.fillText('Época', (left + right) / 2, height - 9);
   for (const line of series) {
    const color = style.getPropertyValue(line.color).trim();
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = 2;
    context.setLineDash(line.dashed ? [5, 4] : []);
    context.beginPath();
    let connected = false;
    for (const {epoch, value} of line.points) {
     if (typeof value !== 'number' || !Number.isFinite(value)) { connected = false; continue; }
     if (connected) context.lineTo(x(epoch), y(value));
     else context.moveTo(x(epoch), y(value));
     connected = true;
    }
    context.stroke();
    for (const {epoch, value} of line.points) {
     if (typeof value !== 'number' || !Number.isFinite(value)) continue;
     context.beginPath();
     context.arc(x(epoch), y(value), 2.5, 0, Math.PI * 2);
     context.fill();
    }
   }
  }
  const size = new ResizeObserver(draw);
  const theme = new MutationObserver(draw);
  size.observe(element);
  theme.observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});
  draw();
  return () => { size.disconnect(); theme.disconnect(); };
 }, [metric, series]);

 return <figure className="evaluation-figure">
  <canvas ref={canvas} role="img" aria-label={`${label} por época. Los valores se incluyen en la tabla de métricas.`}/>
  <figcaption>{series.map(line => <span key={line.label}>
   <i style={{borderColor: `var(${line.color})`, borderTopStyle: line.dashed ? 'dashed' : 'solid'}}/>{line.label}
  </span>)}</figcaption>
 </figure>;
}
