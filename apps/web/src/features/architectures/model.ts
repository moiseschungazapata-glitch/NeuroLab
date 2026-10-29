export type Family='RNN'|'CNN'|'GAN';
export const families:Family[]=['RNN','CNN','GAN'];
export type Layer={id:number;kind:string;units:number;activation:string;kernel?:number;stride?:number;padding?:'same'|'valid'};
export type Architecture={family:Family;layers:Layer[];latent:number;input?:number[];outputUnits?:number;outputActivation?:string};
export const templates:Record<Family,Architecture>={
 RNN:{family:'RNN',latent:100,layers:[{id:1,kind:'SimpleRNN',units:64,activation:'Tanh'},{id:2,kind:'Dense',units:32,activation:'ReLU'}]},
 CNN:{family:'CNN',latent:100,layers:[{id:1,kind:'Conv2D',units:32,kernel:3,activation:'ReLU'},{id:2,kind:'MaxPooling2D',units:2,activation:'Ninguna'},{id:3,kind:'Conv2D',units:64,kernel:3,activation:'ReLU'}]},
 GAN:{family:'GAN',latent:100,layers:[{id:1,kind:'Generador · Dense',units:128,activation:'ReLU'},{id:2,kind:'Discriminador · Dense',units:64,activation:'LeakyReLU'}]}
};
export const profiles:Record<Family,{dataset:string;input:string;output:string;metric:string;value:number;unit:string;description:string}>={
 RNN:{dataset:'Secuencias demo',input:'24 pasos × 1 variable',output:'1 valor · Lineal',metric:'MAE',value:.084,unit:'',description:'Predicción del siguiente valor de una secuencia normalizada.'},
 CNN:{dataset:'MNIST',input:'28 × 28 × 1 canal',output:'10 clases · Softmax',metric:'Precisión',value:97.8,unit:'%',description:'Clasificación de imágenes mediante filtros de convolución.'},
 GAN:{dataset:'MNIST',input:'Vector de ruido latente',output:'Imagen 28 × 28 · Tanh',metric:'Pérdida G',value:.72,unit:'',description:'Generador y discriminador: dos redes que aprenden en competencia.'}
};
export {analyzeArchitecture,normalizeArchitecture,normalizeBank,shapeLabel} from './analysis';
import {analyzeArchitecture} from './analysis';
export function validArchitecture(a:Architecture){return analyzeArchitecture(a).errors[0]??''}
