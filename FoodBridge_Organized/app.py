import os
import re
from contextlib import contextmanager
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from functools import wraps
from pathlib import Path

import click
import pymysql
from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from pymysql.err import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
FOOD_CATEGORIES = {
    "Fresh Produce",
    "Cooked Meals",
    "Bakery",
    "Dairy",
    "Packaged Food",
    "Other",
}

app = Flask(__name__, static_folder="static", template_folder="templates")
app.config.update(
    SECRET_KEY=os.environ.get("FOODBRIDGE_SECRET_KEY"),
    MAX_CONTENT_LENGTH=1 * 1024 * 1024,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("FOODBRIDGE_COOKIE_SECURE") == "1",
)


def database_connection():
    return pymysql.connect(
        host=os.environ.get("FOODBRIDGE_DB_HOST", "localhost"),
        port=int(os.environ.get("FOODBRIDGE_DB_PORT", "3306")),
        user=os.environ.get("FOODBRIDGE_DB_USER", "root"),
        password=os.environ.get("FOODBRIDGE_DB_PASSWORD", ""),
        database=os.environ.get("FOODBRIDGE_DB_NAME", "foodbridge"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )


@contextmanager
def db_connection():
    connection = database_connection()
    try:
        yield connection
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def api_error(message, status):
    return jsonify({"error": message}), status


def body_data():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None
    return data


def require_user(*roles):
    def decorator(handler):
        @wraps(handler)
        def wrapped(*args, **kwargs):
            user_id = session.get("user_id")
            user_role = session.get("role")
            if not user_id:
                return api_error("Please sign in with an authorized account.", 401)
            if roles and user_role not in roles:
                return api_error("This account is not allowed to access this resource.", 403)
            return handler(*args, **kwargs)

        return wrapped

    return decorator


def account_payload(account):
    return {
        "id": account["id"],
        "name": account["name"],
        "email": account["email"],
        "role": account["role"],
    }


def json_safe(value):
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_safe(item) for item in value]
    return value


@app.before_request
def require_secret_key():
    if not app.config["SECRET_KEY"]:
        return api_error(
            "Set FOODBRIDGE_SECRET_KEY before starting the application.", 500
        )
    return None


@app.errorhandler(pymysql.MySQLError)
def database_error(error):
    app.logger.exception("FoodBridge database operation failed", exc_info=error)
    return api_error("The database service is unavailable. Please try again shortly.", 503)


@app.get("/")
def index():
    return render_template("landing.html")


@app.get("/app")
def workspace():
    if not session.get("user_id"):
        return redirect(url_for("login_page"))
    return render_template("index.html")


@app.get("/login")
def login_page():
    if session.get("user_id"):
        return redirect(url_for("workspace"))
    return render_template("login.html")


@app.get("/signup")
def signup_page():
    if session.get("user_id"):
        return redirect(url_for("workspace"))
    return render_template("signup.html")


@app.get("/admin")
def admin_page():
    if session.get("role") == "admin":
        return redirect(url_for("workspace"))
    return render_template("admin.html")


@app.post("/api/register")
def register():
    data = body_data()
    if data is None:
        return api_error("Send registration details as JSON.", 400)

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = data.get("password", "")
    role = data.get("role")

    if len(name) < 2 or len(name) > 160:
        return api_error("Enter an organization name between 2 and 160 characters.", 400)
    if len(email) > 254 or not EMAIL_PATTERN.fullmatch(email):
        return api_error("Enter a valid email address.", 400)
    if not isinstance(password, str) or len(password) < 10 or len(password) > 256:
        return api_error("Password must contain at least 10 characters.", 400)
    if role not in ("hotel", "ngo"):
        return api_error("Choose Hotel or NGO account type.", 400)

    try:
        with db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO accounts (name, email, password_hash, role) "
                    "VALUES (%s, %s, %s, %s)",
                    (name, email, generate_password_hash(password), role),
                )
                account_id = cursor.lastrowid
            connection.commit()
    except IntegrityError:
        return api_error("An account with that email already exists.", 409)

    session.clear()
    session["user_id"] = account_id
    session["role"] = role
    return jsonify({"account": {"id": account_id, "name": name, "email": email, "role": role}}), 201


@app.post("/api/login")
def login():
    data = body_data()
    if data is None:
        return api_error("Send sign-in details as JSON.", 400)

    email = str(data.get("email", "")).strip().lower()
    password = data.get("password", "")
    if not email or not isinstance(password, str):
        return api_error("Enter your email and password.", 400)

    with db_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id, name, email, password_hash, role FROM accounts "
                "WHERE email = %s AND role IN ('hotel', 'ngo')",
                (email,),
            )
            account = cursor.fetchone()

    if not account or not check_password_hash(account["password_hash"], password):
        return api_error("Email or password is incorrect.", 401)

    session.clear()
    session["user_id"] = account["id"]
    session["role"] = account["role"]
    return jsonify({"account": account_payload(account)})


@app.post("/api/admin/login")
def admin_login():
    data = body_data()
    if data is None:
        return api_error("Send sign-in details as JSON.", 400)

    email = str(data.get("email", "")).strip().lower()
    password = data.get("password", "")
    if not email or not isinstance(password, str):
        return api_error("Enter your email and password.", 400)

    with db_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id, name, email, password_hash, role FROM accounts "
                "WHERE email = %s AND role = 'admin'",
                (email,),
            )
            account = cursor.fetchone()

    if not account or not check_password_hash(account["password_hash"], password):
        return api_error("Admin email or password is incorrect.", 401)

    session.clear()
    session["user_id"] = account["id"]
    session["role"] = "admin"
    return jsonify({"account": account_payload(account)})


@app.get("/api/me")
@require_user()
def current_account():
    with db_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id, name, email, role FROM accounts WHERE id = %s",
                (session["user_id"],),
            )
            account = cursor.fetchone()
    if not account:
        session.clear()
        return api_error("Account no longer exists. Please sign in again.", 401)
    return jsonify({"account": account_payload(account)})


@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify({"ok": True})


@app.get("/api/foods")
@require_user("hotel", "ngo", "admin")
def list_foods():
    role = session["role"]
    with db_connection() as connection:
        with connection.cursor() as cursor:
            if role == "hotel":
                cursor.execute(
                    "SELECT f.*, a.name AS donor_name FROM foods f "
                    "JOIN accounts a ON a.id = f.hotel_id "
                    "WHERE f.hotel_id = %s ORDER BY f.created_at DESC",
                    (session["user_id"],),
                )
            else:
                cursor.execute(
                    "SELECT f.*, a.name AS donor_name FROM foods f "
                    "JOIN accounts a ON a.id = f.hotel_id "
                    "WHERE f.status = 'available' AND f.available_quantity > 0 "
                    "AND f.best_before >= CURRENT_DATE() "
                    "ORDER BY f.best_before, f.created_at DESC"
                )
            foods = cursor.fetchall()
    return jsonify({"foods": json_safe(foods)})


@app.post("/api/foods")
@require_user("hotel")
def create_food():
    data = body_data()
    if data is None:
        return api_error("Send food details as JSON.", 400)

    name = str(data.get("name", "")).strip()
    category = str(data.get("category", "")).strip()
    description = str(data.get("description", "")).strip()
    unit = str(data.get("unit", "")).strip()
    pickup_address = str(data.get("pickup_address", "")).strip()
    try:
        quantity = Decimal(str(data.get("quantity", "")))
        best_before = date.fromisoformat(str(data.get("best_before", "")))
    except (InvalidOperation, ValueError):
        return api_error("Enter a valid quantity and best-before date.", 400)

    if len(name) < 2 or len(name) > 180:
        return api_error("Food name must be between 2 and 180 characters.", 400)
    if category not in FOOD_CATEGORIES:
        return api_error("Choose a valid food category.", 400)
    if not quantity.is_finite() or quantity <= 0 or quantity > Decimal("999999"):
        return api_error("Quantity must be greater than zero.", 400)
    if not unit or len(unit) > 32:
        return api_error("Enter a quantity unit, such as meals or kg.", 400)
    if len(pickup_address) < 4 or len(pickup_address) > 500:
        return api_error("Enter a pickup address between 4 and 500 characters.", 400)
    if len(description) > 2000:
        return api_error("Description must be 2,000 characters or fewer.", 400)
    if best_before < date.today():
        return api_error("Best-before date cannot be in the past.", 400)

    with db_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO foods "
                "(hotel_id, name, category, description, total_quantity, "
                "available_quantity, unit, pickup_address, best_before) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (
                    session["user_id"],
                    name,
                    category,
                    description,
                    quantity,
                    quantity,
                    unit,
                    pickup_address,
                    best_before,
                ),
            )
            food_id = cursor.lastrowid
        connection.commit()
    return jsonify({"id": food_id}), 201


@app.get("/api/orders")
@require_user("hotel", "ngo", "admin")
def list_orders():
    role = session["role"]
    predicate = "o.hotel_id = %s" if role == "hotel" else "o.ngo_id = %s"
    params = (session["user_id"],) if role != "admin" else ()
    if role == "admin":
        predicate = "1 = 1"
    with db_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT o.*, f.name AS food_name, f.unit, "
                "h.name AS hotel_name, n.name AS ngo_name "
                "FROM orders o JOIN foods f ON f.id = o.food_id "
                "JOIN accounts h ON h.id = o.hotel_id "
                "JOIN accounts n ON n.id = o.ngo_id "
                f"WHERE {predicate} ORDER BY o.created_at DESC",
                params,
            )
            orders = cursor.fetchall()
    return jsonify({"orders": json_safe(orders)})


@app.post("/api/foods/<int:food_id>/orders")
@require_user("ngo")
def place_order(food_id):
    data = body_data()
    if data is None:
        return api_error("Send order details as JSON.", 400)
    try:
        quantity = Decimal(str(data.get("quantity", "")))
    except InvalidOperation:
        return api_error("Enter a valid order quantity.", 400)
    note = str(data.get("note", "")).strip()
    if not quantity.is_finite() or quantity <= 0:
        return api_error("Order quantity must be greater than zero.", 400)
    if len(note) > 1000:
        return api_error("Order note must be 1,000 characters or fewer.", 400)

    with db_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id, hotel_id, available_quantity, status, best_before FROM foods "
                "WHERE id = %s FOR UPDATE",
                (food_id,),
            )
            food = cursor.fetchone()
            if (
                not food
                or food["status"] != "available"
                or food["best_before"] < date.today()
            ):
                return api_error("This food listing is no longer available.", 404)
            cursor.execute(
                "SELECT id FROM orders WHERE food_id = %s AND ngo_id = %s "
                "AND status IN ('pending', 'accepted') LIMIT 1",
                (food_id, session["user_id"]),
            )
            if cursor.fetchone():
                return api_error("You already have an active request for this listing.", 409)
            cursor.execute(
                "SELECT COALESCE(SUM(quantity), 0) AS pending_quantity FROM orders "
                "WHERE food_id = %s AND status = 'pending'",
                (food_id,),
            )
            pending = cursor.fetchone()["pending_quantity"]
            if quantity + pending > food["available_quantity"]:
                return api_error("Requested quantity exceeds the unreserved amount.", 409)
            cursor.execute(
                "INSERT INTO orders (food_id, hotel_id, ngo_id, quantity, note) "
                "VALUES (%s, %s, %s, %s, %s)",
                (food_id, food["hotel_id"], session["user_id"], quantity, note),
            )
            order_id = cursor.lastrowid
        connection.commit()
    return jsonify({"id": order_id, "status": "pending"}), 201


@app.patch("/api/orders/<int:order_id>")
@require_user("hotel")
def update_order(order_id):
    data = body_data()
    if data is None or data.get("status") not in ("accepted", "rejected"):
        return api_error("Choose accepted or rejected.", 400)
    new_status = data["status"]
    with db_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT o.id, o.food_id, o.quantity, o.status, f.available_quantity "
                "FROM orders o JOIN foods f ON f.id = o.food_id "
                "WHERE o.id = %s AND o.hotel_id = %s FOR UPDATE",
                (order_id, session["user_id"]),
            )
            order = cursor.fetchone()
            if not order:
                return api_error("Order request not found.", 404)
            if order["status"] != "pending":
                return api_error("This order request has already been processed.", 409)
            if new_status == "accepted":
                if order["quantity"] > order["available_quantity"]:
                    return api_error("Not enough food remains to accept this request.", 409)
                remaining = order["available_quantity"] - order["quantity"]
                cursor.execute(
                    "UPDATE foods SET available_quantity = %s, "
                    "status = IF(%s = 0, 'fulfilled', status) WHERE id = %s",
                    (remaining, remaining, order["food_id"]),
                )
            cursor.execute(
                "UPDATE orders SET status = %s WHERE id = %s",
                (new_status, order_id),
            )
        connection.commit()
    return jsonify({"id": order_id, "status": new_status})


@app.get("/api/admin/summary")
@require_user("admin")
def admin_summary():
    with db_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id, name, email, role, created_at FROM accounts "
                "ORDER BY created_at DESC"
            )
            accounts = cursor.fetchall()
            cursor.execute(
                "SELECT f.*, a.name AS donor_name FROM foods f "
                "JOIN accounts a ON a.id = f.hotel_id ORDER BY f.created_at DESC"
            )
            foods = cursor.fetchall()
            cursor.execute(
                "SELECT o.*, f.name AS food_name, f.unit, "
                "h.name AS hotel_name, n.name AS ngo_name "
                "FROM orders o JOIN foods f ON f.id = o.food_id "
                "JOIN accounts h ON h.id = o.hotel_id "
                "JOIN accounts n ON n.id = o.ngo_id ORDER BY o.created_at DESC"
            )
            orders = cursor.fetchall()
    return jsonify(json_safe({
        "accounts": accounts,
        "foods": foods,
        "orders": orders,
        "counts": {
            "accounts": len(accounts),
            "hotels": sum(account["role"] == "hotel" for account in accounts),
            "ngos": sum(account["role"] == "ngo" for account in accounts),
            "foods": len(foods),
            "open_foods": sum(food["status"] == "available" for food in foods),
            "orders": len(orders),
            "pending_orders": sum(order["status"] == "pending" for order in orders),
        },
    }))


@app.cli.command("create-admin")
@click.argument("email")
def create_admin(email):
    """Create an administrator account; there is no public admin registration."""
    email = email.strip().lower()
    if not EMAIL_PATTERN.fullmatch(email):
        raise click.ClickException("Enter a valid email address.")
    name = click.prompt("Administrator name").strip()
    if len(name) < 2 or len(name) > 160:
        raise click.ClickException("Name must contain 2 to 160 characters.")
    password = click.prompt("Administrator password", hide_input=True, confirmation_prompt=True)
    if len(password) < 10 or len(password) > 256:
        raise click.ClickException("Password must contain 10 to 256 characters.")
    try:
        with db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO accounts (name, email, password_hash, role) "
                    "VALUES (%s, %s, %s, 'admin')",
                    (name, email, generate_password_hash(password)),
                )
            connection.commit()
    except IntegrityError as error:
        raise click.ClickException("An account with that email already exists.") from error
    click.echo("Administrator account created. Sign in at /admin.")


@app.cli.command("check-db")
def check_database():
    """Check that FoodBridge can connect to its configured MySQL database."""
    with db_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    click.echo("FoodBridge database connection is ready.")


if __name__ == "__main__":
    app.run()
