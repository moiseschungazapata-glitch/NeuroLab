import unittest
from fastapi import Response
from services.api.app.main import dashboard_system, health, system_snapshot


class DashboardTests(unittest.TestCase):
    def test_real_resources(self):
        data = system_snapshot()
        self.assertGreater(data["memory"]["totalBytes"], 0)
        self.assertGreater(data["disk"]["totalBytes"], 0)
        self.assertGreaterEqual(data["cpuPercent"], 0)
        self.assertLessEqual(data["cpuPercent"], 100)
        self.assertEqual(data["services"]["trainingWorker"], "not_configured")

    def test_no_cache_and_no_false_service_health(self):
        response = Response()
        data = dashboard_system(response)
        self.assertEqual(response.headers["cache-control"], "no-store")
        self.assertEqual(data["services"]["database"], "not_configured")
        self.assertNotIn("hostname", data)
        self.assertNotIn("path", data)
        self.assertEqual(health()["status"], "ok")


if __name__ == "__main__":
    unittest.main()
