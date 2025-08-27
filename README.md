# react-vite-flask-python

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
