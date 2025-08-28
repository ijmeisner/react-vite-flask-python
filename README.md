# react-vite-flask-python

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
docker buildx build \
  -f client/Dockerfile \
  --build-arg HOME_DIRECTORY=${HOME_DIRECTORY} \
  --platform linux/amd64,linux/arm64 \
  -t ${REGISTRY}/${NAMESPACE}/react-vite-client:${VERSION} \
  --push \
  client

docker buildx build \
  -f server/Dockerfile \
  --platform linux/amd64,linux/arm64 \
  -t ${REGISTRY}/${NAMESPACE}/flask-server:${VERSION} \
  --push \
  server
```
