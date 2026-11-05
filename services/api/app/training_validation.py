import hashlib
import json
import math
import re
from .architectures import validate_architecture


def validate_payload(data):
    def integer(value, low, high):
        return type(value) is int and low <= value <= high

    def number(value):
        return type(value) in (float, int) and math.isfinite(value) and abs(value) <= 1e12

    def text(value, length=150):
        return isinstance(value, str) and 0 < len(value.strip()) <= length

    if not isinstance(data, dict) or data.get("consent") is not True:
        raise ValueError("Confirma el envío de los conjuntos preparados a la API local.")
    project, a, config, dataset, splits = (data.get(k) for k in ("project", "architecture", "config", "dataset", "splits"))
    if not isinstance(project, dict) or not integer(project.get("id"), 1, 9007199254740991) or not text(project.get("name"), 70) or project.get("status") not in ('Exploración', 'En desarrollo', 'En revisión', 'Completado'):
        raise ValueError("Proyecto inválido o archivado.")
    if not isinstance(a, dict):
        raise ValueError("Falta una arquitectura válida.")
    validation = validate_architecture(a)
    if not validation["valid"]:
        raise ValueError(" ".join(validation["errors"]))
    if validation["parameters"] > 2_000_000:
        raise ValueError("El motor local admite hasta 2 millones de parámetros por trabajo.")
    if not isinstance(config, dict) or not integer(config.get("epochs"), 1, 200) or not integer(config.get("batch"), 16, 128) or config.get("batch") not in (16, 32, 64, 128) or config.get("optimizer") not in ("Adam", "SGD", "RMSprop") or not integer(config.get("modelSeed"), 0, 4294967295) or not number(config.get("learningRate")) or not 1e-6 <= config["learningRate"] <= 1:
        raise ValueError("Revisa épocas, lote, optimizador, semilla y tasa de aprendizaje.")
    if type(config.get("earlyStopping")) is not bool or not integer(config.get("patience"), 1, 200) or (config['earlyStopping'] and config['patience'] > config['epochs']):
        raise ValueError("Configuración de parada temprana inválida.")
    if a["family"] == "GAN" and config["earlyStopping"]:
        raise ValueError("GAN no admite parada temprana automática por pérdida en este motor.")
    if not isinstance(dataset, dict) or not text(dataset.get("id")) or not text(dataset.get("name"), 80) or not integer(dataset.get("version"), 1, 100000) or not isinstance(dataset.get("checksum"), str) or not re.fullmatch(r'[0-9a-f]{64}', dataset['checksum']):
        raise ValueError("Falta una versión identificable de dataset preparado.")
    classes = dataset.get("classes", [])
    if not isinstance(classes, list) or len(classes) > 1024 or any(not text(c, 80) for c in classes) or len(set(classes)) != len(classes):
        raise ValueError("Codificación de clases inválida.")
    family = a["family"]
    task = dataset.get("task", "regression")
    if task not in ('regression', 'binary', 'multiclass'):
        raise ValueError('Tarea de aprendizaje no admitida.')
    if family == 'RNN':
        task = 'regression'
    if family == 'GAN':
        task = 'regression'  # Adversarial objectives are selected by the worker.
    if family == "RNN" and (a["outputUnits"] != 1 or a["outputActivation"] != "Lineal"):
        raise ValueError("RNN requiere una salida de regresión Lineal.")
    if family == "CNN" or (family == "Feedforward" and task != "regression"):
        task = "binary" if a["outputActivation"] == "Sigmoid" else "multiclass"
        if not (len(classes) == 2 and a["outputUnits"] == 1 and a["outputActivation"] == "Sigmoid") and not (len(classes) >= 2 and len(classes) == a["outputUnits"] and a["outputActivation"] == "Softmax"):
            raise ValueError("Las clases no coinciden con la salida de clasificación.")
    elif family == "Feedforward" and (task != "regression" or a["outputUnits"] != 1 or a["outputActivation"] != "Lineal"):
        raise ValueError("Regresión Feedforward necesita una salida Lineal.")
    if not isinstance(splits, dict) or set(splits) != {"train", "validation", "test"}:
        raise ValueError("Se requieren entrenamiento, validación y prueba separados.")
    shape = a["input"]
    seen_indices, seen_inputs, seen_targets = set(), {}, {}
    total_values = total_samples = 0
    train_classes = set()

    def check_shape(value, dimensions):
        nonlocal total_values
        if not dimensions:
            total_values += 1
            if total_values > 1_000_000 or not number(value):
                raise ValueError("Datos no finitos, fuera de rango o mayores a un millón de valores.")
        elif not isinstance(value, list) or len(value) != dimensions[0]:
            raise ValueError("La forma de los datos no coincide con la arquitectura.")
        else:
            for item in value:
                check_shape(item, dimensions[1:])

    for split, rows in splits.items():
        if not isinstance(rows, list) or not 1 <= len(rows) <= 10000:
            raise ValueError("Cada conjunto requiere entre 1 y 10000 muestras.")
        total_samples += len(rows)
        for row in rows:
            if not isinstance(row, dict) or not integer(row.get("sourceIndex"), 0, 10000) or row["sourceIndex"] in seen_indices:
                raise ValueError("Las muestras deben tener índices únicos entre conjuntos.")
            seen_indices.add(row["sourceIndex"])
            expected = [math.prod(shape)] if family in ("CNN", "GAN") else shape
            check_shape(row.get("input"), expected)
            if family != "RNN":
                signature = hashlib.sha256(json.dumps([float(v) if v != 0 else 0.0 for v in row["input"]]).encode()).hexdigest()
                if signature in seen_inputs and seen_inputs[signature] != split:
                    raise ValueError("Hay entradas idénticas compartidas por conjuntos distintos.")
                seen_inputs[signature] = split
            if family == "GAN":
                low = -1 if a["outputActivation"] == "Tanh" else 0
                if any(not low <= v <= 1 for v in row["input"]):
                    raise ValueError("La escala GAN no coincide con su activación de salida.")
            elif family == "CNN":
                if row.get("label") not in classes:
                    raise ValueError("Etiqueta de imagen desconocida.")
                if split == "train":
                    train_classes.add(classes.index(row["label"]))
            elif task == "binary" and family == "Feedforward":
                if row.get("target") not in (0, 1) or type(row.get("target")) is bool:
                    raise ValueError("Objetivo binario inválido.")
                if split == "train":
                    train_classes.add(row["target"])
            elif task == "multiclass" and family == "Feedforward":
                target = row.get("target")
                if not isinstance(target, list) or len(target) != len(classes) or any(type(v) not in (int, float) or v not in (0, 1) for v in target) or sum(target) != 1:
                    raise ValueError("Objetivo one-hot inválido.")
                if split == "train":
                    train_classes.add(target.index(1))
            elif not number(row.get("target")):
                raise ValueError("Objetivo de regresión inválido.")
            if family == 'CNN' or (family == 'Feedforward' and task != 'regression'):
                target = row['label'] if family == 'CNN' else row['target']
                if signature in seen_targets and seen_targets[signature] != target:
                    raise ValueError('Hay entradas idénticas con etiquetas contradictorias.')
                seen_targets[signature] = target
    if total_samples > 10000:
        raise ValueError("El trabajo local admite como máximo 10000 muestras en total.")
    if task in ("binary", "multiclass") and family != "GAN" and len(train_classes) != len(classes):
        raise ValueError("Entrenamiento no contiene todas las clases.")
    # Client file checksum is provenance only; this checksum covers received prepared data.
    dataset = {"id": dataset["id"], "name": dataset["name"], "version": dataset["version"], "checksum": dataset["checksum"], "classes": classes, "task": task, "preparedChecksum": hashlib.sha256(json.dumps(splits, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest(), "counts": {k: len(v) for k, v in splits.items()}}
    config = {key: config[key] for key in ('epochs', 'batch', 'optimizer', 'modelSeed', 'learningRate', 'earlyStopping', 'patience')}
    return {"project": {"id": project["id"], "name": project["name"], "status": project.get("status")}, "architecture": a, "config": config, "dataset": dataset, "splits": splits}
