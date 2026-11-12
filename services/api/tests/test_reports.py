import unittest
from pypdf import PdfReader
from io import BytesIO

from services.api.app.reports import ReportInput, make_pdf


def sample_report():
    return ReportInput.model_validate({
        'generatedAt': '2026-11-11T20:00:00Z',
        'project': {'id': 7, 'name': 'Clasificación de imágenes', 'description': 'Clasifica imágenes sintéticas.', 'family': 'CNN', 'status': 'En desarrollo', 'documentation': 'Objetivo y alcance del proyecto.', 'tags': ['visión']},
        'architecture': {'family': 'CNN', 'input': [28, 28, 1], 'output': '10 - Softmax', 'parameters': 1234, 'layers': [{'id': 1, 'kind': 'Conv2D', 'units': 32, 'activation': 'ReLU', 'kernel': 3}]},
        'trainings': [{'id': 'job-123', 'source': 'Real', 'family': 'CNN', 'dataset': 'Imágenes v2', 'state': 'COMPLETED', 'createdAt': '2026-11-11T19:00:00Z', 'endedAt': '2026-11-11T19:05:00Z', 'epochs': 5, 'batch': 32, 'optimizer': 'Adam', 'metrics': {'accuracy': .91, 'loss': .2}}],
        'models': [{'version': 'v1.0.0', 'status': 'Aprobado', 'family': 'CNN', 'dataset': 'Imágenes v2', 'jobId': 'job-123', 'artifacts': [{'name': 'model.keras', 'sha256': 'a'*64}]}],
    })


class ReportTests(unittest.TestCase):
    def test_pdf_contains_project_architecture_training_and_model(self):
        body = make_pdf(sample_report())
        self.assertTrue(body.startswith(b'%PDF-'))
        reader = PdfReader(BytesIO(body))
        text = '\n'.join(page.extract_text() or '' for page in reader.pages)
        for expected in ('Clasificación de imágenes', 'Resumen de arquitectura', 'Historial de entrenamiento', 'job-123', 'v1.0.0'):
            self.assertIn(expected, text)
        self.assertGreaterEqual(len(reader.pages), 2)

    def test_report_limits_are_validated(self):
        data = sample_report().model_dump()
        data['project']['name'] = 'x' * 71
        with self.assertRaises(ValueError):
            ReportInput.model_validate(data)

