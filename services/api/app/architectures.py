"""Bounded analytic validation; does not instantiate or train TensorFlow models."""
from math import ceil, prod


def validate_architecture(a):
    def integer(v, low, high):
        return type(v) is int and low <= v <= high

    def fail(message):
        return {"valid": False, "errors": [message], "parameters": 0}

    family = a.get("family")
    if family not in ("Feedforward", "RNN", "CNN", "GAN"):
        return fail("Familia no admitida.")
    shape = a.get("input")
    rank = 1 if family == "Feedforward" else 2 if family == "RNN" else 3
    if not isinstance(shape, list) or len(shape) != rank or any(not integer(n, 1, 4 if i == 2 else 512) for i, n in enumerate(shape)):
        return fail("Dimensiones de entrada inválidas.")
    layers = a.get("layers")
    if not isinstance(layers, list) or not 1 <= len(layers) <= 30:
        return fail("Se requieren entre 1 y 30 bloques.")
    allowed = {"Feedforward": ("Dense",), "RNN": ("Dense", "SimpleRNN", "LSTM", "GRU"), "CNN": ("Dense", "Conv2D", "MaxPooling2D"), "GAN": ("Generador · Dense", "Discriminador · Dense")}[family]
    ids = set()
    dense_seen = False
    for layer in layers:
        if not isinstance(layer, dict):
            return fail("Bloque inválido.")
        identifier, kind = layer.get("id"), layer.get("kind")
        if not integer(identifier, 0, 9007199254740991) or identifier in ids:
            return fail("Identificadores de bloque inválidos o repetidos.")
        ids.add(identifier)
        if kind not in allowed or not integer(layer.get("units"), 1, 1024):
            return fail("Tipo de bloque o unidades inválidos.")
        if kind != "MaxPooling2D" and layer.get("activation") not in ("ReLU", "Tanh", "Sigmoid", "LeakyReLU"):
            return fail("Activación de capa inválida.")
        if kind == "Dense":
            dense_seen = True
        elif family in ("RNN", "CNN") and dense_seen:
            return fail("Los bloques recurrentes o espaciales deben preceder a Dense.")
        if kind in ("Conv2D", "MaxPooling2D"):
            if not integer(layer.get("stride"), 1, 8) or layer.get("padding") not in ("same", "valid"):
                return fail("Stride o padding inválidos.")
            if kind == "Conv2D" and (type(layer.get("kernel")) is not int or layer["kernel"] not in (1, 3, 5, 7)):
                return fail("Kernel inválido.")
            if kind == "MaxPooling2D" and layer["units"] > 8:
                return fail("Pooling fuera de rango.")
    kinds = [layer["kind"] for layer in layers]
    if family == "RNN" and not any(k in ("SimpleRNN", "LSTM", "GRU") for k in kinds):
        return fail("RNN necesita una capa recurrente.")
    if family == "CNN" and "Conv2D" not in kinds:
        return fail("CNN necesita Conv2D.")
    if family == "GAN":
        if not integer(a.get("latent"), 2, 512) or a.get("outputActivation") not in ("Tanh", "Sigmoid"):
            return fail("Vector latente o salida GAN inválidos.")
        if not all(k in kinds for k in ("Generador · Dense", "Discriminador · Dense")):
            return fail("GAN necesita ambas ramas.")
    else:
        if not integer(a.get("outputUnits"), 1, 1024) or a.get("outputActivation") not in ("Lineal", "ReLU", "Tanh", "Sigmoid", "Softmax"):
            return fail("Salida inválida.")
        if a["outputActivation"] == "Softmax" and a["outputUnits"] < 2:
            return fail("Softmax necesita al menos dos salidas.")
    total = 0
    if family == "GAN":
        for branch, incoming, outgoing in (("Generador · Dense", a["latent"], prod(shape)), ("Discriminador · Dense", prod(shape), 1)):
            for layer in layers:
                if layer["kind"] == branch:
                    total += (incoming + 1) * layer["units"]
                    incoming = layer["units"]
            total += (incoming + 1) * outgoing
    else:
        current = shape[:]
        for index, layer in enumerate(layers):
            kind, units = layer["kind"], layer["units"]
            if kind in ("SimpleRNN", "LSTM", "GRU"):
                total += {"SimpleRNN": 1, "LSTM": 4, "GRU": 3}[kind] * units * (current[1] + units + 1)
                more = any(k in ("SimpleRNN", "LSTM", "GRU") for k in kinds[index+1:])
                current = [shape[0], units] if more else [units]
            elif kind in ("Conv2D", "MaxPooling2D"):
                kernel = layer["kernel"] if kind == "Conv2D" else units
                stride = layer["stride"]
                dims = [ceil(n / stride) if layer["padding"] == "same" else (n - kernel) // stride + 1 for n in current[:2]]
                if min(dims) < 1:
                    return fail("Una operación produce dimensiones no positivas.")
                if kind == "Conv2D":
                    total += (kernel * kernel * current[2] + 1) * units
                current = dims + [units if kind == "Conv2D" else current[2]]
            else:
                total += (prod(current) + 1) * units
                current = [units]
        total += (prod(current) + 1) * a["outputUnits"]
    return {"valid": True, "errors": [], "parameters": total, "engine": "analytic", "gruResetAfter": False}
