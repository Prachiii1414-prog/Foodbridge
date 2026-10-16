import os
import unittest
from datetime import date, timedelta
from pathlib import Path
import sys

from werkzeug.security import generate_password_hash

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from FoodBridge_Organized import app as foodbridge_app


@unittest.skipUnless(
    os.environ.get("FOODBRIDGE_TEST_DB_NAME"),
    "Set FOODBRIDGE_TEST_DB_NAME to run isolated MySQL workflow tests.",
)
class MySQLWorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ["FOODBRIDGE_DB_NAME"] = os.environ["FOODBRIDGE_TEST_DB_NAME"]
        for test_variable, app_variable in (
            ("FOODBRIDGE_TEST_DB_HOST", "FOODBRIDGE_DB_HOST"),
            ("FOODBRIDGE_TEST_DB_PORT", "FOODBRIDGE_DB_PORT"),
            ("FOODBRIDGE_TEST_DB_USER", "FOODBRIDGE_DB_USER"),
            ("FOODBRIDGE_TEST_DB_PASSWORD", "FOODBRIDGE_DB_PASSWORD"),
        ):
            if test_variable in os.environ:
                os.environ[app_variable] = os.environ[test_variable]
        foodbridge_app.app.config.update(
            TESTING=True,
            SECRET_KEY="test-only-secret-key",
        )

    def setUp(self):
        with foodbridge_app.db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM orders")
                cursor.execute("DELETE FROM foods")
                cursor.execute("DELETE FROM accounts")
                cursor.execute(
                    "INSERT INTO accounts (name, email, password_hash, role) "
                    "VALUES (%s, %s, %s, 'admin')",
                    (
                        "FoodBridge Admin",
                        "admin@foodbridge.test",
                        generate_password_hash("admin-test-password"),
                    ),
                )
            connection.commit()
        self.hotel = foodbridge_app.app.test_client()
        self.ngo = foodbridge_app.app.test_client()
        self.admin = foodbridge_app.app.test_client()

    def test_hotel_listing_is_visible_to_ngo_and_orders_are_shared(self):
        hotel_signup = self.hotel.post(
            "/api/register",
            json={
                "name": "North Hotel",
                "email": "hotel@foodbridge.test",
                "password": "hotel-test-password",
                "role": "hotel",
            },
        )
        self.assertEqual(hotel_signup.status_code, 201)

        food_response = self.hotel.post(
            "/api/foods",
            json={
                "name": "Fresh bread",
                "category": "Bakery",
                "description": "Baked this morning",
                "quantity": "10",
                "unit": "loaves",
                "pickup_address": "10 Market Road, Dehradun",
                "best_before": (date.today() + timedelta(days=1)).isoformat(),
            },
        )
        self.assertEqual(food_response.status_code, 201)
        food_id = food_response.get_json()["id"]

        ngo_signup = self.ngo.post(
            "/api/register",
            json={
                "name": "Hope NGO",
                "email": "ngo@foodbridge.test",
                "password": "ngo-test-password",
                "role": "ngo",
            },
        )
        self.assertEqual(ngo_signup.status_code, 201)
        available_food = self.ngo.get("/api/foods").get_json()["foods"]
        self.assertEqual(len(available_food), 1)
        self.assertEqual(available_food[0]["donor_name"], "North Hotel")

        order_response = self.ngo.post(
            f"/api/foods/{food_id}/orders",
            json={"quantity": "3", "note": "Pickup tomorrow morning"},
        )
        self.assertEqual(order_response.status_code, 201)
        order_id = order_response.get_json()["id"]
        self.assertEqual(
            self.ngo.post(
                f"/api/foods/{food_id}/orders",
                json={"quantity": "1", "note": ""},
            ).status_code,
            409,
        )

        hotel_orders = self.hotel.get("/api/orders").get_json()["orders"]
        self.assertEqual(len(hotel_orders), 1)
        self.assertEqual(hotel_orders[0]["status"], "pending")
        self.assertEqual(
            self.hotel.patch(
                f"/api/orders/{order_id}",
                json={"status": "accepted"},
            ).status_code,
            200,
        )
        self.assertEqual(
            self.ngo.get("/api/orders").get_json()["orders"][0]["status"],
            "accepted",
        )
        remaining = self.ngo.get("/api/foods").get_json()["foods"][0]
        self.assertEqual(remaining["available_quantity"], "7.00")

        self.assertEqual(
            self.admin.post(
                "/api/admin/login",
                json={
                    "email": "admin@foodbridge.test",
                    "password": "admin-test-password",
                },
            ).status_code,
            200,
        )
        summary = self.admin.get("/api/admin/summary").get_json()
        self.assertEqual(summary["counts"]["hotels"], 1)
        self.assertEqual(summary["counts"]["ngos"], 1)
        self.assertEqual(summary["counts"]["foods"], 1)
        self.assertEqual(summary["counts"]["orders"], 1)

        self.assertEqual(
            foodbridge_app.app.test_client().post(
                "/api/login",
                json={
                    "email": "admin@foodbridge.test",
                    "password": "admin-test-password",
                },
            ).status_code,
            401,
        )


if __name__ == "__main__":
    unittest.main()
