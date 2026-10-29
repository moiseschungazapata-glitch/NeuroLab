import {NeuronLab} from './NeuronLab';
import {GuidedExamples} from './GuidedExamples';
import {Glossary} from './Glossary';
import { ArrowRight,Network } from 'lucide-react';
import type { LaboratoryContext } from '../../hooks/useLaboratory';
import { families } from '../architectures/model';

export function FundamentalsPage({context}:{context:LaboratoryContext}){
const {project,chooseFamily,go}=context;
return (<><section className="concept-banner"><Network size={40}/><div><h2>Una red aprende ajustando sus conexiones.</h2><p>Las redes neuronales permiten aprender patrones para clasificar, predecir o generar datos. Su estructura y sus objetivos cambian según la familia.</p></div></section><nav className="fundamentals-links" aria-label="Contenido de fundamentos"><a href="#neuron-title">Explorar una neurona</a><a href="#guided-examples">Ejemplos guiados</a><a href="#glossary">Consultar glosario</a></nav><div className="concept-grid">{[['01','Neurona','Combina entradas y pesos, suma un sesgo y aplica una función de activación.','y = activación(Σ wᵢxᵢ + b)'],['02','Capas y conexiones','La capa de entrada recibe datos; las ocultas descubren patrones; la salida produce la predicción.','Entrada → Ocultas → Salida'],['03','Pesos y sesgos','Los pesos regulan la influencia de cada entrada. El sesgo desplaza la respuesta de una neurona.','Aprender = ajustar w y b'],['04','Funciones de activación','ReLU permite respuestas no lineales; Sigmoid devuelve valores de 0 a 1; Softmax distribuye probabilidades.','ReLU(x) = max(0, x)']].map(([n,a,b,c])=><article className="panel concept" key={n}><span>{n}</span><h3>{a}</h3><p>{b}</p><code>{c}</code></article>)}</div><h3 className="lower">Tres familias, diferentes problemas</h3><div className="project-grid families">{families.map((f,i)=><article className="panel concept" key={f}><h3>{f}</h3><p>{['Secuencias y series temporales. Conserva información de pasos anteriores.','Imágenes y patrones espaciales. Utiliza filtros de convolución.','Generación de datos. Un generador y un discriminador aprenden compitiendo.'][i]}</p><button className="text-btn" onClick={()=>{chooseFamily(f);go(3)}}>Explorar arquitectura <ArrowRight size={14}/></button></article>)}</div><NeuronLab/><GuidedExamples/><Glossary/></>);
}

