"""Build only the bounded layer vocabulary accepted by the API."""
def build_models(config):
    from tensorflow import keras
    L = keras.layers
    acts = {"Lineal": "linear", "ReLU": "relu", "Tanh": "tanh", "Sigmoid": "sigmoid", "Softmax": "softmax"}

    def activate(x, name):
        return L.LeakyReLU(negative_slope=0.3)(x) if name == "LeakyReLU" else L.Activation(acts[name])(x)

    def dense(x, units, name):
        return activate(L.Dense(units)(x), name)

    if config["family"] == "GAN":
        import math
        noise = keras.Input(shape=(config["latent"],))
        x = noise
        for layer in config["layers"]:
            if layer["kind"] == "Generador · Dense":
                x = dense(x, layer["units"], layer["activation"])
        generator = keras.Model(noise, L.Reshape(config["input"])(dense(x, math.prod(config["input"]), config["outputActivation"])), name="generator")
        image = keras.Input(shape=tuple(config["input"]))
        x = L.Flatten()(image)
        for layer in config["layers"]:
            if layer["kind"] == "Discriminador · Dense":
                x = dense(x, layer["units"], layer["activation"])
        discriminator = keras.Model(image, L.Dense(1, activation="sigmoid")(x), name="discriminator")
        return generator, discriminator
    inputs = keras.Input(shape=tuple(config["input"]))
    x = inputs
    recurrent = {"SimpleRNN": L.SimpleRNN, "LSTM": L.LSTM, "GRU": L.GRU}
    for index, layer in enumerate(config["layers"]):
        kind = layer["kind"]
        if kind in recurrent:
            sequences = any(item["kind"] in recurrent for item in config["layers"][index+1:])
            options = {"reset_after": False} if kind == "GRU" else {}
            activation = L.LeakyReLU(negative_slope=0.3) if layer["activation"] == "LeakyReLU" else acts[layer["activation"]]
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
    return (keras.Model(inputs, dense(x, config["outputUnits"], config["outputActivation"]), name="neurolab_model"),)
