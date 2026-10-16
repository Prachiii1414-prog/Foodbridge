# FoodBridge — One Website, Three Workspaces

Open one FoodBridge website to create a Hotel or NGO account, sign in, or use the separate administrator sign-in. After sign-in, each account sees its own workspace. Hotel listings and NGO requests are shared through MySQL.

## Project structure
- `app.py`: Flask application and database-backed API
- `run.py`: Python development-server launcher
- `templates/`: public home page, sign-in, sign-up, admin sign-in, and workspace pages
- `static/`: website styles, scripts, and images
- `database/schema.sql`: MySQL tables
- `tests/`: backend and optional MySQL workflow tests

Use [RUNNING.md](./RUNNING.md) for full installation, local startup, Git collaboration, and phone-over-Wi-Fi instructions.

## Quick start

Requirements: Python 3.10 or newer and MySQL 8.0 or newer. The website is served from one URL; Flask chooses the relevant page and workspace, so there is no need to open an HTML file directly.

### One-time database and app setup

1. Create the `foodbridge` database and tables using a MySQL administrator:

   ```sh
   mysql -u root -p
   ```

   At the MySQL prompt, enter:

   ```sql
   CREATE DATABASE foodbridge CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'foodbridge'@'localhost' IDENTIFIED BY 'choose-a-strong-password';
   GRANT SELECT, INSERT, UPDATE, DELETE ON foodbridge.* TO 'foodbridge'@'localhost';
   EXIT;
   ```

   Import the application tables:

   ```sh
   mysql -u root -p foodbridge < database/schema.sql
   ```
2. Create your local settings file:

   ```sh
   cp .env.example .env
   ```
   In `.env`, replace the example app database password and secret with your own values. `.env` is private and ignored by Git.
3. Create the local Python environment and install application dependencies:

   ```sh
   python3 -m venv .venv
   .venv/bin/pip install -r requirements.txt
   ```
4. Create the administrator account once:

   ```sh
   .venv/bin/flask --app app create-admin admin@example.org
   ```

### Start FoodBridge on this computer

After the one-time setup, run the start script from this folder:

```sh
./start.sh
```

Open **http://127.0.0.1:5000**. Register or sign in using the website buttons; the separate Administrator sign-in is linked in the footer.

For access from a phone on the same Wi-Fi, follow the [mobile access guide](./RUNNING.md#open-foodbridge-on-a-phone-on-the-same-wi-fi). The launcher supports this mode and keeps Flask's debug mode disabled.

This built-in server is for development and trusted local-network testing only. For public HTTPS deployment, set `FOODBRIDGE_COOKIE_SECURE=1` and use a production WSGI server.

## Tests

Run tests from this folder:

```sh
.venv/bin/python -m unittest discover -s tests -v
```

The end-to-end MySQL workflow test is skipped unless `FOODBRIDGE_TEST_DB_NAME` names a dedicated disposable database with `database/schema.sql` imported into it. The test overrides `FOODBRIDGE_DB_NAME` with this database name; optionally set `FOODBRIDGE_TEST_DB_HOST`, `FOODBRIDGE_TEST_DB_PORT`, `FOODBRIDGE_TEST_DB_USER`, and `FOODBRIDGE_TEST_DB_PASSWORD` to use separate test credentials. Never point it at a database containing data you need to keep.

## Current status
Hotel and NGO accounts register and sign in through the public pages. Hotels can publish food listings and accept or decline NGO orders. NGOs can see available Hotel listings, request quantities, and track order status. Open listing, order, and admin views refresh every 30 seconds while the page is visible. The application stores accounts, listings, and orders in MySQL; there are no seeded demo accounts or records. Admin accounts are created using the Flask CLI, and server-side role checks protect admin data.

Before changing, adding, or modifying application code, record the planned change, approach, and expected effect in [XREADME.md](./XREADME.md). After the change, update that entry with the result and verification details.

Email verification, password reset, image uploads, delivery tracking, and email notifications are not implemented. Food listings are created as food details and pickup information; the app does not upload food photographs.
