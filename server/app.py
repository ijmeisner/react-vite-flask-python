import os
from datetime import datetime, timezone
from urllib.parse import urljoin

from flask import Flask, jsonify, redirect, request, session
from flask_cors import CORS
import msal

app = Flask(__name__)

# Session/cookie config for BFF pattern
app.secret_key = os.environ.get("FLASK_SECRET_KEY", os.urandom(24))
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE=os.environ.get("SESSION_COOKIE_SAMESITE", "Lax"),
    SESSION_COOKIE_SECURE=os.environ.get("SESSION_COOKIE_SECURE", "false").lower()
    in {"1", "true", "yes"},
)

# For dev behind separate origins, allow credentials if needed.
CORS(app, supports_credentials=True)

# Prefix routes with HOME_DIRECTORY (e.g., "/parse") when provided.
# Normalization: "" or "/" -> no prefix; otherwise ensure leading slash, no trailing slash.
_home = os.environ.get("HOME_DIRECTORY", "").strip()
if _home == "/":
    _home = ""
if _home and not _home.startswith("/"):
    _home = "/" + _home
_home = _home.rstrip("/")
API_BASE = f"{_home}/api"

# Azure AD / Entra ID config via env
AZURE_CLIENT_ID = os.environ.get("AZURE_CLIENT_ID")
AZURE_TENANT_ID = os.environ.get("AZURE_TENANT_ID")
AZURE_CLIENT_SECRET = os.environ.get("AZURE_CLIENT_SECRET")
AZURE_AUTHORITY = os.environ.get(
    "AZURE_AUTHORITY",
    f"https://login.microsoftonline.com/{AZURE_TENANT_ID}" if AZURE_TENANT_ID else None,
)
OIDC_SCOPES = os.environ.get(
    "AZURE_OIDC_SCOPES",
    # Minimal OIDC scopes; add resource scopes as needed
    "openid profile email offline_access",
).split()


def _msal_app() -> msal.ConfidentialClientApplication:
    if not (AZURE_CLIENT_ID and AZURE_CLIENT_SECRET and AZURE_AUTHORITY):
        raise RuntimeError(
            "Missing Azure AD env vars: AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_CLIENT_SECRET"
        )
    return msal.ConfidentialClientApplication(
        AZURE_CLIENT_ID, authority=AZURE_AUTHORITY, client_credential=AZURE_CLIENT_SECRET
    )


def _external_url(path: str) -> str:
    """Build absolute URL respecting reverse proxy headers and HOME_DIRECTORY."""
    scheme = request.headers.get("X-Forwarded-Proto", request.scheme)
    host = request.headers.get("Host", request.host)
    base = f"{scheme}://{host}"
    return urljoin(base, path)


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


# --- BFF Auth Endpoints ---

@app.get(f"{API_BASE}/login")
def login_start():
    # Build redirect URI for our callback under the same HOME_DIRECTORY prefix
    redirect_uri = _external_url(f"{API_BASE}/auth/callback")
    auth_url = _msal_app().get_authorization_request_url(
        scopes=OIDC_SCOPES,
        redirect_uri=redirect_uri,
        response_type="code",
        prompt=os.environ.get("AZURE_PROMPT", "select_account"),
    )
    return redirect(auth_url, code=302)


@app.get(f"{API_BASE}/auth/callback")
def auth_callback():
    error = request.args.get("error")
    if error:
        return jsonify(error=error, description=request.args.get("error_description")), 400

    code = request.args.get("code")
    if not code:
        return jsonify(error="missing_code"), 400

    redirect_uri = _external_url(f"{API_BASE}/auth/callback")
    result = _msal_app().acquire_token_by_authorization_code(
        code, scopes=OIDC_SCOPES, redirect_uri=redirect_uri
    )

    if "error" in result:
        return jsonify(error=result.get("error"), description=result.get("error_description")), 400

    # Store minimal identity info in session (no access tokens to the browser)
    id_claims = result.get("id_token_claims") or {}
    session["user"] = {
        "name": id_claims.get("name") or id_claims.get("preferred_username"),
        "preferred_username": id_claims.get("preferred_username"),
        "oid": id_claims.get("oid"),
        "tid": id_claims.get("tid"),
        "sub": id_claims.get("sub"),
        "iat": id_claims.get("iat"),
        "exp": id_claims.get("exp"),
    }

    # Redirect back to the SPA home under the same prefix
    return redirect(f"{_home or ''}/", code=302)


@app.get(f"{API_BASE}/logout")
def logout():
    session.clear()
    # Optional: send user to Microsoft logout endpoint to clear federated session
    post_logout_redirect_uri = _external_url(f"{_home or ''}/")
    if AZURE_AUTHORITY and AZURE_TENANT_ID:
        ms_logout = (
            f"{AZURE_AUTHORITY}/oauth2/v2.0/logout?post_logout_redirect_uri="
            f"{post_logout_redirect_uri}"
        )
        return redirect(ms_logout, code=302)
    return redirect(post_logout_redirect_uri, code=302)


@app.get(f"{API_BASE}/me")
def me():
    user = session.get("user")
    if not user:
        return jsonify(error="unauthorized"), 401
    return jsonify(user=user)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
