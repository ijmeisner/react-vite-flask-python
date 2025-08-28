import os
import json
import time
from datetime import datetime, timezone
from urllib.parse import urljoin
import logging
import traceback

from flask import Flask, jsonify, request, session, Response, send_file
from flask_cors import CORS
from flask_session import Session
import requests
import jwt

app = Flask(__name__)

# For dev behind separate origins, allow credentials if needed.
CORS(app, supports_credentials=True)

# Optional log level override
_log_level = os.environ.get("APP_LOG_LEVEL", "INFO").upper()
try:
    app.logger.setLevel(getattr(logging, _log_level, logging.INFO))
except Exception:
    app.logger.setLevel(logging.INFO)

# Configure file logger that writes to data/output.txt
LOG_DIR = os.path.join(os.getcwd(), "data")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "output.txt")

try:
    file_handler = logging.FileHandler(LOG_FILE)
    file_handler.setLevel(getattr(logging, _log_level, logging.INFO))
    file_handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
    app.logger.addHandler(file_handler)
    app.logger.info("File logger initialized: %s", LOG_FILE)
except Exception as e:
    app.logger.warning("Failed to initialize file handler: %s", e)

# Prefix routes with HOME_DIRECTORY (e.g., "/parse") when provided.
# Normalization: "" or "/" -> no prefix; otherwise ensure leading slash, no trailing slash.
_home = os.environ.get("HOME_DIRECTORY", "").strip()
if _home == "/":
    _home = ""
if _home and not _home.startswith("/"):
    _home = "/" + _home
_home = _home.rstrip("/")
API_BASE = f"{_home}/api"

"""Azure AD / Entra ID config for JWT validation"""
AZURE_TENANT_ID = os.environ.get("AZURE_TENANT_ID")
AZURE_AUTHORITY = os.environ.get(
    "AZURE_AUTHORITY",
    f"https://login.microsoftonline.com/{AZURE_TENANT_ID}" if AZURE_TENANT_ID else None,
)
# Acceptable audience values for access tokens (space-separated)
AZURE_ALLOWED_AUDIENCE = os.environ.get("AZURE_ALLOWED_AUDIENCE")
if not AZURE_ALLOWED_AUDIENCE:
    # Fall back to AZURE_CLIENT_ID if provided
    fallback_aud = os.environ.get("AZURE_CLIENT_ID")
    AZURE_ALLOWED_AUDIENCE = (fallback_aud or "").strip()
ALLOWED_AUDIENCES = {a for a in (AZURE_ALLOWED_AUDIENCE or "").split() if a}

if not AZURE_TENANT_ID or not AZURE_AUTHORITY:
    app.logger.warning("AZURE_TENANT_ID/AUTHORITY not set; JWT validation may fail")

JWKS_TTL_SECS = int(os.environ.get("AZURE_JWKS_TTL", "300"))

_OPENID_CONFIG = None
_OPENID_CONFIG_FETCHED_AT = 0.0
_JWKS = None
_JWKS_FETCHED_AT = 0.0
AZURE_REDIRECT_URI = os.environ.get("AZURE_REDIRECT_URI")  # Optional absolute URL

# Secret key for Flask session (required for backend auth via MSAL)
_secret_key = os.environ.get("FLASK_SECRET_KEY") or os.environ.get("SECRET_KEY") or "dev-secret-key"
app.secret_key = _secret_key

# Server-side session storage to keep cookies small
app.config["SESSION_TYPE"] = os.environ.get("SESSION_TYPE", "filesystem")
_sess_dir = os.environ.get("SESSION_FILE_DIR")
if _sess_dir:
    app.config["SESSION_FILE_DIR"] = _sess_dir
app.config["SESSION_COOKIE_SAMESITE"] = os.environ.get("SESSION_COOKIE_SAMESITE", "Lax")
app.config["SESSION_COOKIE_SECURE"] = os.environ.get("SESSION_COOKIE_SECURE", "false").lower() == "true"
Session(app)

# Register backend auth blueprint (mounted under HOME_DIRECTORY)
try:
    from auth import auth as auth_blueprint, is_user_logged_in, get_current_user
    app.register_blueprint(auth_blueprint, url_prefix=_home)
except Exception as _e:
    app.logger.info("Auth blueprint not registered: %s", _e)


def _external_url(path: str) -> str:
    """Build absolute URL respecting reverse proxy headers and HOME_DIRECTORY."""
    scheme = request.headers.get("X-Forwarded-Proto", request.scheme)
    host = request.headers.get("Host", request.host)
    base = f"{scheme}://{host}"
    return urljoin(base, path)


def _fetch_openid_config():
    global _OPENID_CONFIG, _OPENID_CONFIG_FETCHED_AT
    now = time.time()
    if _OPENID_CONFIG and (now - _OPENID_CONFIG_FETCHED_AT) < JWKS_TTL_SECS:
        return _OPENID_CONFIG
    if not AZURE_AUTHORITY:
        raise RuntimeError("AZURE_AUTHORITY is not configured")
    url = f"{AZURE_AUTHORITY}/v2.0/.well-known/openid-configuration"
    resp = requests.get(url, timeout=5)
    resp.raise_for_status()
    _OPENID_CONFIG = resp.json()
    _OPENID_CONFIG_FETCHED_AT = now
    return _OPENID_CONFIG


def _fetch_jwks():
    global _JWKS, _JWKS_FETCHED_AT
    now = time.time()
    if _JWKS and (now - _JWKS_FETCHED_AT) < JWKS_TTL_SECS:
        return _JWKS
    conf = _fetch_openid_config()
    jwks_uri = conf.get("jwks_uri")
    if not jwks_uri:
        raise RuntimeError("jwks_uri missing from openid configuration")
    resp = requests.get(jwks_uri, timeout=5)
    resp.raise_for_status()
    _JWKS = resp.json()
    _JWKS_FETCHED_AT = now
    return _JWKS


def _get_public_key(token: str):
    unverified_header = jwt.get_unverified_header(token)
    kid = unverified_header.get("kid")
    jwks = _fetch_jwks()
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
    raise RuntimeError("Signing key not found for token")


def verify_jwt_from_request(require_auth: bool = True):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        if require_auth:
            return None, (jsonify(error="unauthorized", detail="Missing bearer token"), 401)
        return None, None
    token = auth[len("Bearer "):].strip()
    try:
        key = _get_public_key(token)
        conf = _fetch_openid_config()
        issuer = conf.get("issuer")
        options = {"verify_aud": bool(ALLOWED_AUDIENCES)}
        decoded = jwt.decode(
            token,
            key=key,
            algorithms=["RS256"],
            audience=list(ALLOWED_AUDIENCES) or None,
            issuer=issuer,
            options=options,
        )
        return decoded, None
    except Exception as e:
        app.logger.warning("JWT validation failed: %s", e)
        return None, (jsonify(error="unauthorized", detail="invalid_token"), 401)


@app.get(f"{API_BASE}/hello")
def hello():
    # Allow either session-based login (backend MSAL) or Bearer token
    if 'user' in session:
        user = session['user']
        app.logger.info("Hello endpoint accessed by session user=%s", user.get("username"))
        return jsonify(message="Hello from Flask", user=user.get("username"))
    claims, error = verify_jwt_from_request(require_auth=True)
    if error:
        return error
    app.logger.info("Hello endpoint accessed by bearer sub=%s", claims.get("sub"))
    return jsonify(message="Hello from Flask", sub=claims.get("sub"))


@app.get(f"{API_BASE}/health")
def health():
    return {"status": "ok"}

@app.get(f"{API_BASE}/notify")
def notify():
    if 'user' in session:
        user = session['user']
        now = datetime.now(timezone.utc).isoformat()
        app.logger.info("Notify sent to session user=%s at %s", user.get("username"), now)
        return jsonify(message=f"Test notification at {now}", user=user.get("username"))
    claims, error = verify_jwt_from_request(require_auth=True)
    if error:
        return error
    now = datetime.now(timezone.utc).isoformat()
    app.logger.info("Notify sent to bearer sub=%s at %s", claims.get("sub"), now)
    return jsonify(message=f"Test notification at {now}", sub=claims.get("sub"))


@app.get(f"{API_BASE}/logs")
def get_logs():
    """Return the current contents of output.txt as text/plain.
    Requires either a session (backend login) or a valid Bearer token.
    """
    if 'user' not in session:
        claims, error = verify_jwt_from_request(require_auth=True)
        if error:
            return error
        app.logger.info("Logs accessed by bearer sub=%s", claims.get("sub"))
    else:
        app.logger.info("Logs accessed by session user=%s", session['user'].get('username'))
    try:
        if not os.path.exists(LOG_FILE):
            return Response("", mimetype="text/plain")
        return send_file(LOG_FILE, mimetype="text/plain")
    except Exception as e:
        app.logger.error("Failed to read logs: %s", e)
        return jsonify(error="log_read_error"), 500


"""BFF endpoints were removed in favor of client-side MSAL auth. API now requires Bearer tokens."""


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
