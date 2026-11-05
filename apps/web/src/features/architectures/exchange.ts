import {analyzeArchitecture} from './analysis';
import type {Architecture} from './model';

export function parseArchitecture(text:string):Architecture{
 if(new TextEncoder().encode(text).length>256*1024)throw Error('El archivo admite hasta 256 KB.');
 let value:unknown;try{value=JSON.parse(text)}catch{throw Error('El archivo no contiene JSON válido.')}
 const v=value as Record<string,unknown>|null;
 if(!v||Array.isArray(v)||typeof v!=='object')throw Error('Se esperaba un objeto de arquitectura.');
 if(v.schemaVersion!==undefined&&![3,4].includes(v.schemaVersion as number))throw Error('Versión de esquema no admitida.');
 if(!['Feedforward','RNN','CNN','GAN'].includes(String(v.family)))throw Error('Familia no admitida.');
 if(!Array.isArray(v.layers)||!v.layers.length||v.layers.length>30)throw Error('Se requieren entre 1 y 30 bloques.');
 if(v.input!==undefined&&(!Array.isArray(v.input)||v.input.some(n=>typeof n!=='number')))throw Error('La entrada debe contener dimensiones numéricas.');
 for(const l of v.layers){if(!l||typeof l!=='object'||!Number.isSafeInteger(l.id)||l.id<0||typeof l.kind!=='string'||typeof l.units!=='number'||typeof l.activation!=='string')throw Error('Hay un bloque con campos inválidos.');}
 for(const field of ['latent','outputUnits'])if(v[field]!==undefined&&typeof v[field]!=='number')throw Error('Los parámetros deben ser numéricos.');
 if(v.outputActivation!==undefined&&typeof v.outputActivation!=='string')throw Error('La activación de salida debe ser texto.');
 const a:Architecture={family:v.family as Architecture['family'],latent:(v.latent as number)??100,input:v.input as number[]|undefined,outputUnits:v.outputUnits as number|undefined,outputActivation:v.outputActivation as string|undefined,layers:v.layers.map(l=>({id:l.id,kind:l.kind,units:l.units,activation:l.activation,...(l.kernel!==undefined?{kernel:l.kernel}:{}),...(l.stride!==undefined?{stride:l.stride}:{}),...(l.padding!==undefined?{padding:l.padding}:{})}))};
 const result=analyzeArchitecture(a);if(result.errors.length)throw Error(result.errors.join(' '));return result.architecture;
}

export function kerasSource(raw:Architecture):string{
 const result=analyzeArchitecture(raw);if(result.errors.length)throw Error('Corrige la arquitectura antes de exportar código.');
 return `# NeuroLab: construcción de arquitectura, sin entrenamiento ni pesos aprendidos.
# Requiere TensorFlow/Keras instalado en tu entorno Python.
import json
import tensorflow as tf
from tensorflow import keras

config = json.loads(${JSON.stringify(JSON.stringify(result.architecture))})
L = keras.layers
activations = {"Lineal": "linear", "ReLU": "relu", "Tanh": "tanh", "Sigmoid": "sigmoid", "Softmax": "softmax"}

def activate(x, name):
    return L.LeakyReLU(negative_slope=0.3)(x) if name == "LeakyReLU" else L.Activation(activations[name])(x)

def dense(x, units, activation):
    return activate(L.Dense(units)(x), activation)

if config["family"] == "GAN":
    shape = config["input"]
    pixels = shape[0] * shape[1] * shape[2]
    noise = keras.Input(shape=(config["latent"],))
    x = noise
    for layer in config["layers"]:
        if layer["kind"] == "Generador · Dense":
            x = dense(x, layer["units"], layer["activation"])
    generator = keras.Model(noise, L.Reshape(shape)(dense(x, pixels, config["outputActivation"])), name="generator")
    image = keras.Input(shape=tuple(shape))
    x = L.Flatten()(image)
    for layer in config["layers"]:
        if layer["kind"] == "Discriminador · Dense":
            x = dense(x, layer["units"], layer["activation"])
    discriminator = keras.Model(image, L.Dense(1, activation="sigmoid")(x), name="discriminator")
    generator.summary()
    discriminator.summary()
else:
    inputs = keras.Input(shape=tuple(config["input"]))
    x = inputs
    recurrent = {"SimpleRNN": L.SimpleRNN, "LSTM": L.LSTM, "GRU": L.GRU}
    for index, layer in enumerate(config["layers"]):
        kind = layer["kind"]
        if kind in recurrent:
            sequences = any(item["kind"] in recurrent for item in config["layers"][index+1:])
            options = {"reset_after": False} if kind == "GRU" else {}
            activation = L.LeakyReLU(negative_slope=0.3) if layer["activation"] == "LeakyReLU" else activations[layer["activation"]]
            x = recurrent[kind](layer["units"], activation=activation, return_sequences=sequences, **options)(x)
        elif kind == "Conv2D":
            x = L.Conv2D(layer["units"], layer["kernel"], strides=layer["stride"], padding=layer["padding"])(x)
            x = activate(x, layer["activation"])
        elif kind == "MaxPooling2D":
            x = L.MaxPooling2D(layer["units"], strides=layer["stride"], padding=layer["padding"])(x)
        elif kind == "Dense":
            if len(x.shape) > 2:
                x = L.Flatten()(x)
            x = dense(x, layer["units"], layer["activation"])
    if len(x.shape) > 2:
        x = L.Flatten()(x)
    model = keras.Model(inputs, dense(x, config["outputUnits"], config["outputActivation"]), name="neurolab_model")
    model.summary()
# Compilación, función de pérdida, datasets y entrenamiento deben configurarse aparte.
`;
}
