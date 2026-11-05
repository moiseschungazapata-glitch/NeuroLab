import json
import unittest
from pathlib import Path
from services.api.app.architectures import validate_architecture


class ArchitectureTests(unittest.TestCase):
    def setUp(self):
        self.feed = {"family": "Feedforward", "input": [2], "outputUnits": 1, "outputActivation": "Sigmoid", "layers": [{"id": 1, "kind": "Dense", "units": 3, "activation": "ReLU"}]}

    def test_known_dense_count(self):
        self.assertEqual(validate_architecture(self.feed)["parameters"], 13)

    def test_rejects_invalid_fields(self):
        for patch in ({"input": [False]}, {"input": [0]}, {"layers": []}, {"outputActivation": "Softmax"}, {"family": "unknown"}, {"layers": [{"id": 1, "kind": "Dense", "units": True, "activation": "ReLU"}]}):
            self.assertFalse(validate_architecture({**self.feed, **patch})["valid"])

    def test_frontend_parity(self):
        path = Path('.runtime/architecture-fixtures.json')
        if not path.exists():
            self.skipTest('Run node tests/architecture-exchange.mjs first')
        for fixture in json.loads(path.read_text()):
            with self.subTest(family=fixture['architecture']['family']):
                result = validate_architecture(fixture['architecture'])
                self.assertTrue(result['valid'])
                self.assertEqual(result['parameters'], fixture['parameters'])
