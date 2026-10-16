import unittest
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from FoodBridge_Organized import app as foodbridge_app


class FoodBridgeAppTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        foodbridge_app.app.config.update(
            TESTING=True,
            SECRET_KEY="test-only-secret-key",
        )

    def setUp(self):
        self.client = foodbridge_app.app.test_client()

    def test_authentication_pages_are_served_without_an_admin_signup_option(self):
        for path in ("/login", "/signup", "/admin", "/"):
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200, path)
            page = response.get_data(as_text=True)
            if path == "/":
                self.assertIn("Join as a Hotel", page)
                self.assertIn("Join as an NGO", page)
                self.assertIn("Administrator sign in", page)
            response.close()

        response = self.client.get("/signup")
        signup = response.get_data(as_text=True)
        response.close()
        self.assertIn('value="hotel"', signup)
        self.assertIn('value="ngo"', signup)
        self.assertNotIn('value="admin"', signup)

    def test_workspace_requires_login_and_static_assets_are_served(self):
        response = self.client.get("/app")
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.headers["Location"], "/login")

        response = self.client.get("/static/js/portal.js")
        self.assertEqual(response.status_code, 200)
        response.get_data()
        response.close()

        with self.client.session_transaction() as browser_session:
            browser_session["user_id"] = 1
            browser_session["role"] = "hotel"
        self.assertEqual(self.client.get("/app").status_code, 200)

    def test_public_api_rejects_admin_registration(self):
        response = self.client.post(
            "/api/register",
            json={
                "name": "Private Admin",
                "email": "admin@example.org",
                "password": "long-enough-password",
                "role": "admin",
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Hotel or NGO", response.get_json()["error"])

    def test_public_api_rejects_short_password_before_database_access(self):
        response = self.client.post(
            "/api/register",
            json={
                "name": "Community Hotel",
                "email": "hotel@example.org",
                "password": "short",
                "role": "hotel",
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("10 characters", response.get_json()["error"])

    def test_protected_endpoints_require_an_authorized_session(self):
        for path in ("/api/me", "/api/foods", "/api/orders", "/api/admin/summary"):
            response = self.client.get(path)
            self.assertEqual(response.status_code, 401, path)

    def test_public_user_cannot_access_admin_data(self):
        with self.client.session_transaction() as browser_session:
            browser_session["user_id"] = 1
            browser_session["role"] = "hotel"

        response = self.client.get("/api/admin/summary")
        self.assertEqual(response.status_code, 403)

    def test_decimal_and_date_database_values_are_json_serializable(self):
        value = {
            "quantity": Decimal("12.50"),
            "best_before": date(2026, 10, 17),
            "created_at": datetime(2026, 10, 16, 12, 0),
        }
        self.assertEqual(
            foodbridge_app.json_safe(value),
            {
                "quantity": "12.50",
                "best_before": "2026-10-17",
                "created_at": "2026-10-16T12:00:00",
            },
        )


if __name__ == "__main__":
    unittest.main()
