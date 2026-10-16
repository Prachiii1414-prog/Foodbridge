import os

from app import app


if __name__ == "__main__":
    host = os.environ.get("FOODBRIDGE_HOST", "127.0.0.1")
    port = int(os.environ.get("FOODBRIDGE_PORT", "5000"))
    app.run(host=host, port=port, debug=False)
