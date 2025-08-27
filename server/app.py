from flask import Flask, jsonify
from flask_cors import CORS
from datetime import datetime, timezone

app = Flask(__name__)
CORS(app)


@app.get("/api/hello")
def hello():
    return jsonify(message="Hello from Flask")


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/notify")
def notify():
    now = datetime.now(timezone.utc).isoformat()
    return jsonify(message=f"Test notification at {now}")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
