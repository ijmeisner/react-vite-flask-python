import os
from flask import Flask, jsonify
from flask_cors import CORS
from datetime import datetime, timezone

app = Flask(__name__)
CORS(app)

# Prefix routes with HOME_DIRECTORY (e.g., "/parse") when provided.
# Normalization: "" or "/" -> no prefix; otherwise ensure leading slash, no trailing slash.
_home = os.environ.get("HOME_DIRECTORY", "").strip()
if _home == "/":
    _home = ""
if _home and not _home.startswith("/"):
    _home = "/" + _home
_home = _home.rstrip("/")
API_BASE = f"{_home}/api"


@app.get(f"{API_BASE}/hello")
def hello():
    return jsonify(message="Hello from Flask")


@app.get(f"{API_BASE}/health")
def health():
    return {"status": "ok"}

@app.get(f"{API_BASE}/notify")
def notify():
    now = datetime.now(timezone.utc).isoformat()
    return jsonify(message=f"Test notification at {now}")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
