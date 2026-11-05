import copy
import tempfile
import unittest
from pathlib import Path
from workers.training import store
from services.api.app.training_validation import validate_payload


def sample():
    splits = {}
    index = 0
    for name in ('train', 'validation', 'test'):
        splits[name] = []
        for _ in range(4):
            splits[name].append({'sourceIndex': index, 'input': [index / 10], 'target': index % 2})
            index += 1
    return {'project': {'id': 1, 'name': 'Sintético', 'status': 'En desarrollo'}, 'architecture': {'family': 'Feedforward', 'input': [1], 'latent': 2, 'outputUnits': 1, 'outputActivation': 'Sigmoid', 'layers': [{'id': 1, 'kind': 'Dense', 'units': 2, 'activation': 'ReLU'}]}, 'config': {'epochs': 2, 'batch': 16, 'optimizer': 'Adam', 'modelSeed': 42, 'learningRate': .01, 'earlyStopping': False, 'patience': 2}, 'dataset': {'id': 'synthetic-dataset', 'name': 'Sintético', 'version': 1, 'checksum': '0'*64, 'classes': ['A', 'B'], 'task': 'binary'}, 'splits': splits, 'consent': True}


class TrainingValidationTests(unittest.TestCase):
    def test_prepared_checksum_and_counts(self):
        result = validate_payload(sample())
        self.assertEqual(len(result['dataset']['preparedChecksum']), 64)
        self.assertEqual(result['dataset']['counts'], {'train': 4, 'validation': 4, 'test': 4})

    def test_invalid_and_leaking_data(self):
        cases = []
        data = sample(); data['consent'] = False; cases.append(data)
        data = sample(); data['project']['status'] = 'Archivado'; cases.append(data)
        data = sample(); data['splits']['test'][0]['sourceIndex'] = 0; cases.append(data)
        data = sample(); data['splits']['test'][0]['input'] = [0]; cases.append(data)
        data = sample(); data['splits']['train'][0]['input'] = [float('nan')]; cases.append(data)
        data = sample(); data['splits']['train'][0]['target'] = True; cases.append(data)
        data = sample(); data['splits']['train'][1]['input'] = data['splits']['train'][0]['input']; cases.append(data)
        data = sample(); data['config']['batch'] = 16.0; cases.append(data)
        data = sample(); data['architecture']['layers'][0]['units'] = 100000; cases.append(data)
        for index, data in enumerate(cases):
            with self.subTest(case=index), self.assertRaises(ValueError):
                validate_payload(data)


class TrainingStoreTests(unittest.TestCase):
    def setUp(self):
        self.previous = store.DATA
        self.temp = tempfile.TemporaryDirectory(dir=store.ROOT / '.runtime', prefix='training-test-')
        store.DATA = Path(self.temp.name).resolve()
        store.initialize()

    def tearDown(self):
        self.assertTrue(Path(self.temp.name).resolve().is_relative_to((store.ROOT / '.runtime').resolve()))
        store.DATA = self.previous
        self.temp.cleanup()

    def test_idempotency_and_queue_capacity(self):
        payload = validate_payload(sample())
        first = store.create(payload, submission='same-request')
        self.assertEqual(store.create(payload, submission='same-request')['id'], first['id'])
        for _ in range(4):
            store.create(payload)
        with self.assertRaises(ValueError):
            store.create(payload)
        store.cancel(first['id'])
        self.assertEqual(store.get(first['id'])['state'], 'CANCELLED')
        store.create(payload, parent=first['id'])

    def test_explicit_states_journal_and_durability(self):
        job = store.create(validate_payload(sample()))
        with self.assertRaises(ValueError):
            store.update(job['id'], state='RUNNING')
        preparing = store.update(job['id'], state='PREPARING')
        store.update(job['id'], state='RUNNING', epoch=1)
        store.cancel(job['id'])
        final = store.update(job['id'], state='COMPLETED', artifacts=[{'name': 'model.keras'}])
        self.assertEqual(final['state'], 'CANCELLED')
        self.assertEqual(final['artifacts'], [])
        self.assertEqual(store.get(job['id'])['epoch'], 1)
        self.assertEqual(store.events(job['id'], preparing['eventId'])[-1]['state'], 'CANCELLED')
        self.assertEqual(store.update(job['id'], state='RUNNING')['state'], 'CANCELLED')
        store.initialize()
        self.assertEqual(store.list_jobs()[0]['id'], job['id'])
