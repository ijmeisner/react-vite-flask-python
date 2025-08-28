import os
import msal
from functools import wraps
from flask import Blueprint, request, session, redirect, url_for, abort
from datetime import datetime

# ---------------------------------------------------------------------------------
# Logging helper
# ---------------------------------------------------------------------------------
def log_message(message: str):
    data_dir = os.path.join(os.getcwd(), "data")
    os.makedirs(data_dir, exist_ok=True)
    log_path = os.path.join(data_dir, "output.log")
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(log_path, "a") as f:
        f.write(f"{timestamp} | {message}\n")


auth = Blueprint("auth", __name__)

# ---------------------------------------------------------------------------------
# Environment Config
# ---------------------------------------------------------------------------------
HOME_DIRECTORY = os.environ.get("HOME_DIRECTORY", "").strip()
if HOME_DIRECTORY == "/":
    HOME_DIRECTORY = ""
if HOME_DIRECTORY and not HOME_DIRECTORY.startswith("/"):
    HOME_DIRECTORY = "/" + HOME_DIRECTORY
HOME_DIRECTORY = HOME_DIRECTORY.rstrip("/")

AZURE_CLIENT_ID = os.environ.get("AZURE_CLIENT_ID", "")
AZURE_CLIENT_SECRET = os.environ.get("AZURE_CLIENT_SECRET", "")
AZURE_TENANT_ID = os.environ.get("AZURE_TENANT_ID", "")
AZURE_AUTH_SCOPES = os.environ.get("AZURE_AUTH_SCOPES", "https://graph.microsoft.com/User.Read").split()
AZURE_REDIRECT_PATH = os.environ.get("AZURE_REDIRECT_PATH")  # optional override
AZURE_REDIRECT_URI = os.environ.get("AZURE_REDIRECT_URI")  # optional absolute override
POST_LOGIN_REDIRECT_PATH = os.environ.get("POST_LOGIN_REDIRECT_PATH")  # optional absolute path

AZURE_ENABLED = all([AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID])

if AZURE_ENABLED:
    AUTHORITY = f"https://login.microsoftonline.com/{AZURE_TENANT_ID}"
    SCOPE = AZURE_AUTH_SCOPES or ["User.Read"]
    REDIRECT_PATH = AZURE_REDIRECT_PATH or f"{HOME_DIRECTORY}/authorized"
else:
    AUTHORITY = ""
    SCOPE = []
    REDIRECT_PATH = f"{HOME_DIRECTORY}/no-op"


# ---------------------------------------------------------------------------------
# MSAL helpers
# ---------------------------------------------------------------------------------
def build_msal_app(cache=None):
    return msal.ConfidentialClientApplication(
        AZURE_CLIENT_ID,
        authority=AUTHORITY,
        client_credential=AZURE_CLIENT_SECRET,
        token_cache=cache,
    )


def get_token_from_cache():
    if not AZURE_ENABLED or "token_cache" not in session:
        return None
    cache = msal.SerializableTokenCache()
    try:
        cache.deserialize(session["token_cache"])  # may raise if corrupted
    except Exception:
        return None
    cca = build_msal_app(cache=cache)
    accounts = cca.get_accounts()
    if accounts:
        return cca.acquire_token_silent(SCOPE, account=accounts[0])
    return None


def is_user_logged_in() -> bool:
    # Session-based flag set on successful Azure login
    if session.get("user"):
        return True
    # As a fallback, check token cache presence
    return get_token_from_cache() is not None


def get_current_user():
    return session.get("user")


# ---------------------------------------------------------------------------------
# Custom decorators
# ---------------------------------------------------------------------------------
def login_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if not AZURE_ENABLED:
            return func(*args, **kwargs)
        if not is_user_logged_in():
            # Redirect to SPA root where the React app shows a login UI
            return redirect(f"{HOME_DIRECTORY or '/'}")
        return func(*args, **kwargs)
    return wrapper


def admin_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if not is_user_logged_in():
            return redirect(f"{HOME_DIRECTORY or '/'}")
        user = get_current_user() or {}
        # Minimal placeholder: check a session role flag
        if user.get("role") != "admin":
            abort(403)
        return func(*args, **kwargs)
    return wrapper


# ---------------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------------
@auth.route("/logout")
def logout():
    if session.get("user"):
        log_message(f"User Logged Out: {session['user'].get('username')}")
    session.clear()
    # Return to SPA root; it will show a login screen
    return redirect(f"{HOME_DIRECTORY or '/'}")


@auth.route("/azure_login")
def azure_login():
    if not AZURE_ENABLED:
        return redirect(f"{HOME_DIRECTORY or '/'}")
    cca = build_msal_app()
    # Build absolute redirect URI. Prefer explicit env, else infer from forwarded headers.
    if AZURE_REDIRECT_URI:
        redirect_uri = AZURE_REDIRECT_URI
    else:
        proto = request.headers.get("X-Forwarded-Proto") or request.scheme
        host = request.headers.get("Host", request.host)
        redirect_uri = f"{proto}://{host}{REDIRECT_PATH}"
    auth_url = cca.get_authorization_request_url(scopes=SCOPE, redirect_uri=redirect_uri)
    return redirect(auth_url)


@auth.route("/authorized")
def authorized():
    if not AZURE_ENABLED:
        return redirect(f"{HOME_DIRECTORY or '/'}")

    if "code" in request.args:
        cache = msal.SerializableTokenCache()
        cca = build_msal_app(cache=cache)
        if AZURE_REDIRECT_URI:
            redirect_uri = AZURE_REDIRECT_URI
        else:
            proto = request.headers.get("X-Forwarded-Proto") or request.scheme
            host = request.headers.get("Host", request.host)
            redirect_uri = f"{proto}://{host}{REDIRECT_PATH}"
        result = cca.acquire_token_by_authorization_code(request.args["code"], scopes=SCOPE, redirect_uri=redirect_uri)
        if "access_token" in result:
            session["token_cache"] = cache.serialize()

            claims = result.get("id_token_claims", {})
            username = (
                claims.get("preferred_username")
                or claims.get("email")
                or claims.get("upn")
                or claims.get("oid")
                or "unknown@azure"
            )

            # Minimal session user profile
            session["user"] = {
                "username": username,
                "name": claims.get("name"),
                "oid": claims.get("oid"),
                "roles": claims.get("roles"),
                "role": "user",
                "login_at": datetime.utcnow().isoformat() + "Z",
            }
            log_message(f"User Logged In via Azure: {username}")

    # Redirect to SPA after successful login
    if POST_LOGIN_REDIRECT_PATH:
        return redirect(POST_LOGIN_REDIRECT_PATH)
    return redirect(f"{HOME_DIRECTORY or '/'}")
