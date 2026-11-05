"""One job per process; no user code, notebooks or uploaded model loading."""
import hashlib
import json
import math
import os
import sys
import traceback
from . import store


class Cancelled(Exception):
    pass


def run(identifier):
    try:
        if store.get(identifier)["cancelRequested"]:
            raise Cancelled()
        # Import occurs in this subprocess, never in an API request.
        import numpy as np
        import tensorflow as tf
        from .models import build_models
        from services.api.app.architectures import validate_architecture
        payload = store.payload(identifier)
        config, a, dataset = payload["config"], payload["architecture"], payload["dataset"]
        tf.config.threading.set_inter_op_parallelism_threads(1)
        tf.config.threading.set_intra_op_parallelism_threads(2)
        tf.keras.utils.set_random_seed(config["modelSeed"])
        tf.config.experimental.enable_op_determinism()
        models = build_models(a)
        if sum(m.count_params() for m in models) != validate_architecture(a)["parameters"]:
            raise RuntimeError("Parameter count mismatch")
        initial_weights = [m.get_weights() for m in models]
        family, task = a["family"], dataset["task"]
        arrays = {}
        for split, rows in payload["splits"].items():
            x = np.asarray([r["input"] for r in rows], dtype="float32")
            if family in ("CNN", "GAN"):
                x = x.reshape((-1, *a["input"]))
            y = None
            if family == "CNN":
                ids = [dataset["classes"].index(r["label"]) for r in rows]
                y = np.asarray(ids, dtype="float32").reshape(-1, 1) if task == "binary" else np.eye(len(dataset["classes"]), dtype="float32")[ids]
            elif family != "GAN":
                y = np.asarray([r["target"] for r in rows], dtype="float32")
                if y.ndim == 1:
                    y = y.reshape(-1, 1)
            arrays[split] = (x, y)

        def optimizer():
            return getattr(tf.keras.optimizers, config["optimizer"])(learning_rate=config["learningRate"], clipnorm=1.0)

        if family != "GAN":
            model = models[0]
            loss = {"regression": "mse", "binary": "binary_crossentropy", "multiclass": "categorical_crossentropy"}[task]
            metric = "mae" if task == "regression" else "accuracy"
            model.compile(optimizer=optimizer(), loss=loss, metrics=[metric], jit_compile=False)
        else:
            gopt, dopt = optimizer(), optimizer()
            bce = tf.keras.losses.BinaryCrossentropy()

        def cancelled():
            if store.get(identifier)["cancelRequested"]:
                raise Cancelled()

        def gan_batch(x, training):
            generator, discriminator = models
            noise = tf.random.normal((len(x), a["latent"]))
            with tf.GradientTape() as gtape, tf.GradientTape() as dtape:
                generated = generator(noise, training=training)
                real_output = discriminator(x, training=training)
                fake_output = discriminator(generated, training=training)
                dloss = (bce(tf.ones_like(real_output), real_output) + bce(tf.zeros_like(fake_output), fake_output)) / 2
                gloss = bce(tf.ones_like(fake_output), fake_output)
            if training:
                gopt.apply_gradients(zip(gtape.gradient(gloss, generator.trainable_weights), generator.trainable_weights))
                dopt.apply_gradients(zip(dtape.gradient(dloss, discriminator.trainable_weights), discriminator.trainable_weights))
            return {"loss": float(dloss), "g_loss": float(gloss)}

        rng = np.random.default_rng(config["modelSeed"])

        def epoch_metrics(split, training):
            x, y = arrays[split]
            indices = rng.permutation(len(x)) if training else np.arange(len(x))
            values = {}
            if family != "GAN":
                model.reset_metrics()
            for start in range(0, len(x), config["batch"]):
                cancelled()
                ids = indices[start:start+config["batch"]]
                if family == "GAN":
                    result = gan_batch(x[ids], training)
                    for k, v in result.items():
                        values[k] = values.get(k, 0) + v * len(ids) / len(x)
                else:
                    fn = model.train_on_batch if training else model.test_on_batch
                    values = {k: float(v) for k, v in fn(x[ids], y[ids], return_dict=True).items()}
            if not values or any(not math.isfinite(v) for v in values.values()):
                raise FloatingPointError("Non-finite metrics")
            return values

        code_hash = hashlib.sha256((store.ROOT / 'workers/training/worker.py').read_bytes() + (store.ROOT / 'workers/training/models.py').read_bytes()).hexdigest()
        store.update(identifier, state="RUNNING", startedAt=store.now(), tensorflowVersion=tf.__version__, pythonVersion=sys.version.split()[0], workerCodeSha256=code_hash, parameters=sum(m.count_params() for m in models), log="TensorFlow CPU: modelos construidos y datos preparados validados.")
        metrics, best, patience = [], math.inf, 0
        best_weights = None
        stopped_early = False
        for epoch in range(1, config["epochs"] + 1):
            train = epoch_metrics("train", True)
            validation = epoch_metrics("validation", False)
            row = {"epoch": epoch, **train, **{"val_"+k: v for k, v in validation.items()}}
            metrics.append(row)
            store.update(identifier, epoch=epoch, progress=round(epoch/config["epochs"]*100), metrics=metrics, log=f"Época {epoch}/{config['epochs']} registrada.")
            if config["earlyStopping"]:
                if validation["loss"] < best - 1e-7:
                    best, patience = validation["loss"], 0
                    best_weights = model.get_weights()
                else:
                    patience += 1
                    if patience >= config["patience"]:
                        stopped_early = True
                        break
        if best_weights is not None:
            model.set_weights(best_weights)
        cancelled()
        test = epoch_metrics("test", False)
        directory = store.directory(identifier)
        artifacts = []
        for m, name in zip(models, ("generator.keras", "discriminator.keras") if family == "GAN" else ("model.keras",)):
            cancelled()
            path = directory / name
            m.save(path)
            artifacts.append({"name": name, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "bytes": path.stat().st_size})
        changed = any(any(not np.array_equal(old, new) for old, new in zip(before, m.get_weights())) for before, m in zip(initial_weights, models))
        store.update(identifier, state="COMPLETED", progress=100, testMetrics=test, stoppedEarly=stopped_early, weightsChanged=changed, artifacts=artifacts, log="Evaluación final y modelos Keras guardados con checksum.")
    except Cancelled:
        store.update(identifier, state="CANCELLED", log="El worker confirmó la cancelación.")
    except Exception as exc:
        directory = store.directory(identifier)
        (directory / "technical-error.log").write_text(traceback.format_exc(), encoding="utf8")
        store.update(identifier, state="FAILED", error=f"No se pudo completar el entrenamiento ({type(exc).__name__}). El detalle técnico se conserva localmente en el servidor.", log="El worker registró un error controlado; se puede reintentar.")


if __name__ == "__main__":
    run(sys.argv[1])
