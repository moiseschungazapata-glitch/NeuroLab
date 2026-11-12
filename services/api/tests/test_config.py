import os
import unittest
from unittest.mock import patch

from services.api.app.config import csv_values, normalize_origin


class DeploymentConfigTests(unittest.TestCase):
    def test_csv_values_ignores_empty_entries(self):
        with patch.dict(os.environ, {"NEUROLAB_TEST_VALUES": " uno, dos ,,tres "}):
            self.assertEqual(csv_values("NEUROLAB_TEST_VALUES"), {"uno", "dos", "tres"})

    def test_origin_is_case_and_trailing_slash_independent(self):
        self.assertEqual(normalize_origin(" HTTPS://NeuroLab.Vercel.app/ "), "https://neurolab.vercel.app")


if __name__ == "__main__":
    unittest.main()

