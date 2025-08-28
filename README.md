# react-vite-flask-python

## Architecture Overview

- **Client (React + Vite):** Static SPA built with Vite. Nginx serves the built assets under a configurable base path (`HOME_DIRECTORY`) and proxies API/auth requests to the Flask server.
- **Web Server (Nginx):** Serves the SPA and reverse‑proxies these routes to Flask:
  - `/${HOME_DIRECTORY}/api/*` → Flask API
  - `/${HOME_DIRECTORY}/azure_login` → Start Azure auth
  - `/${HOME_DIRECTORY}/authorized` → Azure redirect callback
  - `/${HOME_DIRECTORY}/logout` → Clear session and return to SPA
- **Backend (Flask API):** Provides REST endpoints under `/${HOME_DIRECTORY}/api`. Validates either a logged‑in session (cookie) or a Bearer JWT (optional), and exposes health and sample routes.
- **Authentication (Azure AD via MSAL Python):** Uses the Authorization Code flow on the server. Tokens are cached server‑side via Flask‑Session; the browser only holds a small session cookie. After successful login, users are redirected to the SPA.
- **Session Store (Flask‑Session):** Defaults to `filesystem` (per‑container). For multi‑instance deployments, use Redis or another shared backend.
- **Base Path (`HOME_DIRECTORY`):** Single source of truth for SPA base, Nginx routing, and Flask route prefix (e.g., `/parse`).
- **Containerization (Docker Compose):** Runs `client` (Nginx) and `server` (Flask/gunicorn) on an internal network. Compose defaults let Nginx reach Flask at `server:5000`.

Flow summary
- **Login:** SPA links to `/${HOME_DIRECTORY}/azure_login` → Nginx proxies to Flask → Microsoft login → Azure redirects to `/${HOME_DIRECTORY}/authorized` → Flask finalizes auth → Flask redirects to SPA (`/${HOME_DIRECTORY}/` or `POST_LOGIN_REDIRECT_PATH`).
- **API calls:** SPA calls `/${HOME_DIRECTORY}/api/*` with `credentials: 'include'`. Nginx proxies to Flask. Flask authorizes via session or optional Bearer JWT.
- **Logout:** SPA links to `/${HOME_DIRECTORY}/logout` which clears the session and redirects back to the SPA.

Operational notes
- **HTTPS:** Ensure the external proxy sets `X-Forwarded-Proto=https` or set `AZURE_REDIRECT_URI` explicitly. The value must match the Azure app’s Redirect URI.
- **Cookies:** In production set `SESSION_COOKIE_SECURE=true`. Use `SESSION_COOKIE_SAMESITE=None` only if cross‑site embedding is required.
- **Scaling sessions:** Switch to Redis with `SESSION_TYPE=redis` (and appropriate config) to share sessions across instances.

## Authentication

The app uses server-side authentication via MSAL for Python. Users authenticate with Azure AD through the Flask backend; sessions are stored in secure cookies. The React client is MSAL-free and relies on the backend session.

### Configure Azure App Registration
- Create an app registration in Entra ID and add a client secret.
- Register a redirect URI that matches your deployment, e.g.: `https://<your-domain>${HOME_DIRECTORY}/authorized`
  - You can override the path via `AZURE_REDIRECT_PATH` (must be registered in Azure).

### Environment variables (server)
- `AZURE_CLIENT_ID` – App registration client ID.
- `AZURE_TENANT_ID` – Directory (tenant) ID.
- `AZURE_CLIENT_SECRET` – Client secret value.
- `AZURE_AUTH_SCOPES` – Space-separated delegated scopes to request (e.g., `https://graph.microsoft.com/User.Read`).
- `AZURE_REDIRECT_PATH` – Path part of redirect URI; defaults to `${HOME_DIRECTORY}/authorized`.
- `AZURE_REDIRECT_URI` – Absolute redirect URI override (scheme/host/path must match Azure).
- `POST_LOGIN_REDIRECT_PATH` – Absolute path to redirect users to after successful login; defaults to `${HOME_DIRECTORY}/`.
- `AZURE_ALLOWED_AUDIENCE` – Space-separated accepted audiences for Bearer tokens (optional). Falls back to `AZURE_CLIENT_ID`.
- `AZURE_JWKS_TTL` – Seconds to cache JWKS/OpenID config (default 300).
- `FLASK_SECRET_KEY` – Secret for Flask session cookies.
- `HOME_DIRECTORY` – URL base prefix, e.g., `/parse` (optional).
- `SESSION_COOKIE_SECURE` – `true` for HTTPS; `false` for local HTTP.
- `SESSION_COOKIE_SAMESITE` – `Lax` (default) or `None` if cross-site is required.

### Client build env
- `VITE_HOME_DIRECTORY` – Should match `HOME_DIRECTORY` so routes align.

### Routes (mounted under `${HOME_DIRECTORY}`)
- `GET ${HOME_DIRECTORY}/azure_login` – Starts the Azure sign-in flow (triggered from the React UI).
- `GET ${HOME_DIRECTORY}/authorized` – OAuth2 redirect/callback.
- `GET ${HOME_DIRECTORY}/logout` – Clears the session and returns to the SPA.

### API Endpoints
- `GET ${HOME_DIRECTORY}/api/health` – Public health endpoint.
- `GET ${HOME_DIRECTORY}/api/hello` – Works with backend session or `Authorization: Bearer <token>`.
- `GET ${HOME_DIRECTORY}/api/notify` – Works with backend session or `Authorization: Bearer <token>`.

The React UI shows a sign-in screen if not authenticated and links to `${HOME_DIRECTORY}/azure_login`. Nginx proxies the backend auth endpoints (`azure_login`, `authorized`, `logout`) to the Flask server; all other non-API routes are served by the SPA.

## Build and Push Docker Images

The project has two images, one for the React client (served by Nginx) and one for the Flask server. The client build embeds a base path using `HOME_DIRECTORY` (for reverse proxy prefixes like `/parse`).

### Prerequisites
- Docker installed and running.
- Logged in to your container registry (e.g., Docker Hub or GHCR):
  - Docker Hub: `docker login`
  - GHCR: `echo <TOKEN> | docker login ghcr.io -u <USERNAME> --password-stdin`

### Recommended environment variables
You can adjust these per your registry and release.

```
export REGISTRY=docker.io
export NAMESPACE=cody00
export VERSION=0.1.0
export HOME_DIRECTORY=/parse
```

### Build images

- Client (builds with `HOME_DIRECTORY` so assets and API calls are prefixed):
```
docker build \
  -f client/Dockerfile \
  --build-arg HOME_DIRECTORY=${HOME_DIRECTORY} \
  -t ${REGISTRY}/${NAMESPACE}/react-vite-client:${VERSION} \
  client
```

- Server:
```
docker build \
  -f server/Dockerfile \
  -t ${REGISTRY}/${NAMESPACE}/flask-server:${VERSION} \
  server
```

### Push images

```
docker push ${REGISTRY}/${NAMESPACE}/react-vite-client:${VERSION}
docker push ${REGISTRY}/${NAMESPACE}/flask-server:${VERSION}
```

### Notes
- The client image expects `HOME_DIRECTORY` at runtime to render the Nginx config. If you run the container directly, set: `-e HOME_DIRECTORY=${HOME_DIRECTORY}`.
- When changing `HOME_DIRECTORY`, rebuild the client so Vite’s `base` and paths are updated.
- Example tags for GHCR: set `REGISTRY=ghcr.io` and `NAMESPACE=<owner>/<repo>`.

### Optional: multi-arch builds with Buildx
```
docker buildx create --use --name multi || true
docker buildx build --no-cache \
  -f client/Dockerfile \
  --build-arg HOME_DIRECTORY=${HOME_DIRECTORY} \
  --platform linux/amd64,linux/arm64 \
  -t ${REGISTRY}/${NAMESPACE}/react-vite-client:${VERSION} \
  --push \
  client

docker buildx build --no-cache \
  -f server/Dockerfile \
  --platform linux/amd64,linux/arm64 \
  -t ${REGISTRY}/${NAMESPACE}/flask-server:${VERSION} \
  --push \
  server
```
