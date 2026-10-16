# Run FoodBridge and check it on a phone

FoodBridge is one Flask website. Open its root URL in a browser; Flask serves the landing page, and the links take each user to Hotel, NGO, or administrator sign-in and the appropriate workspace. Do not open a template HTML file directly.

This guide covers local development and temporary access to a phone on the same trusted Wi-Fi network. The Flask development server is not a public production server.

## Requirements

- Python 3.10 or newer
- MySQL 8.0 or newer, running on this computer or reachable from it
- A terminal in `FoodBridge_Organized/`

## One-time setup

### 1. Create the MySQL database

Connect to MySQL as an administrator:

```sh
mysql -u root -p
```

At the MySQL prompt, create a database and an application user. Replace the example password with a strong, private password:

```sql
CREATE DATABASE foodbridge CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'foodbridge'@'localhost' IDENTIFIED BY 'replace-with-a-strong-password';
GRANT SELECT, INSERT, UPDATE, DELETE ON foodbridge.* TO 'foodbridge'@'localhost';
EXIT;
```

Import the FoodBridge tables from the `FoodBridge_Organized/` directory:

```sh
mysql -u root -p foodbridge < database/schema.sql
```

If the database is on a different machine, set `FOODBRIDGE_DB_HOST` in `.env` to that database host and ensure MySQL permits this application machine to connect. The phone does not connect directly to MySQL; only the Python app server does.

### 2. Configure private app settings

Create a local environment file:

```sh
cp .env.example .env
```

Edit `.env` and set:

- `FOODBRIDGE_SECRET_KEY` to a long, random private value.
- `FOODBRIDGE_DB_PASSWORD` to the password chosen for the MySQL application user.
- The other `FOODBRIDGE_DB_*` values if your MySQL setup differs from the example.

Never commit `.env`. The shareable `.env.example` contains placeholders only.

### 3. Install Python dependencies

Linux/macOS:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
```

Windows PowerShell:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
```

### 4. Create the administrator account

From `FoodBridge_Organized/`, run:

```sh
.venv/bin/flask --app app create-admin admin@example.org
```

On Windows PowerShell:

```powershell
.\.venv\Scripts\flask --app app create-admin admin@example.org
```

Follow the prompts to enter the administrator name and password. Hotel and NGO users register through the website; administrator registration is intentionally not public.

## Run on this computer

Linux/macOS:

```sh
./start.sh
```

Windows PowerShell:

```powershell
.\.venv\Scripts\flask --app app check-db
.\.venv\Scripts\python run.py
```

The start script checks the database before starting the Python web server. Open **http://127.0.0.1:5000** on the computer running FoodBridge. Press `Ctrl+C` in the server terminal to stop it.

The Python launcher uses `FOODBRIDGE_HOST` and `FOODBRIDGE_PORT` when set. Defaults are `127.0.0.1` and `5000`, and Flask debug mode is disabled.

## Open FoodBridge on a phone on the same Wi-Fi

1. Connect the computer running FoodBridge and the phone to the same trusted Wi-Fi network.
2. Start the server so it listens on the computer's network interfaces.

   Linux/macOS:

   ```sh
   FOODBRIDGE_HOST=0.0.0.0 FOODBRIDGE_PORT=5000 ./start.sh
   ```

   Windows PowerShell, from `FoodBridge_Organized/`:

   ```powershell
   $env:FOODBRIDGE_HOST = "0.0.0.0"
   $env:FOODBRIDGE_PORT = "5000"
   .\.venv\Scripts\flask --app app check-db
   .\.venv\Scripts\python run.py
   ```

   Keep the terminal running. The commands check the database before starting the server.

3. Find the computer's Wi-Fi/LAN IPv4 address:

   - Linux: run `hostname -I` and use its private-network address, commonly starting with `192.168.` or `10.`.
   - macOS: run `ipconfig getifaddr en0` (for Wi-Fi).
   - Windows: run `ipconfig` and find the IPv4 address under the active Wi-Fi adapter.

4. On the phone, open a browser to `http://<computer-LAN-IP>:5000`, replacing the placeholder with the address found above. For example: `http://192.168.1.24:5000`.
5. Use the page normally: create/sign in to an NGO or Hotel account and open that user's workspace. No app installation or HTML file selection is needed.

If the phone cannot connect, confirm both devices are on the same Wi-Fi (not a guest network), the server terminal is still running, and the computer firewall allows inbound TCP port `5000` on its **private/local network**. Do not expose this port to the public internet or configure router port forwarding.

Binding to `0.0.0.0` makes the development server reachable from other devices on the network. Use it only on a trusted network. Debug mode remains off. For a public deployment, use HTTPS, a production WSGI server, secure cookie settings, and an appropriately protected database instead.

## Run tests

From `FoodBridge_Organized/`:

```sh
.venv/bin/python -m unittest discover -s tests -v
```

On Windows PowerShell:

```powershell
.\.venv\Scripts\python -m unittest discover -s tests -v
```

The MySQL integration test is skipped unless `FOODBRIDGE_TEST_DB_NAME` points to a separate disposable database with `database/schema.sql` imported. Never point that test at a database containing data you need.
