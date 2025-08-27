# react-vite-flask-python

## Azure AD BFF Authentication

This project now includes a Backend-for-Frontend (BFF) flow with Azure AD (Entra ID). The browser only talks to the Flask backend; tokens are never exposed to the client. The backend manages redirects to Azure, handles the callback, stores identity in an HttpOnly session cookie, and exposes a minimal `GET ${HOME_DIRECTORY}/api/me` endpoint for the SPA to detect authentication.

### Configure Azure App Registration
- Create an app registration in Entra ID.
- Add a client secret.
- Add a redirect URI: `https://<your-domain>${HOME_DIRECTORY}/api/auth/callback`
  - For local reverse-proxy, this should match your public host and prefix.

### Environment variables (server)
- `AZURE_CLIENT_ID` – App registration client ID
- `AZURE_TENANT_ID` – Directory (tenant) ID
- `AZURE_CLIENT_SECRET` – Client secret value
- `FLASK_SECRET_KEY` – Any random string for session integrity
- `HOME_DIRECTORY` – URL base prefix, e.g. `/parse` (optional)
- `SESSION_COOKIE_SECURE` – `true` in HTTPS; `false` in local HTTP
- `SESSION_COOKIE_SAMESITE` – `Lax` (default) or `None` when cross-site is required

### Client build env
- `VITE_HOME_DIRECTORY` – Should match `HOME_DIRECTORY` so routes align.

### Endpoints
- `GET ${HOME_DIRECTORY}/api/login` – Redirects to Azure AD
- `GET ${HOME_DIRECTORY}/api/auth/callback` – Completes sign-in, sets session, redirects to SPA
- `GET ${HOME_DIRECTORY}/api/me` – Returns `{ user }` or `401`
- `GET ${HOME_DIRECTORY}/api/logout` – Clears session (and optionally Azure session)

The SPA shows a login page with a “Sign in with Microsoft” button and gates the home page unless authenticated.

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
