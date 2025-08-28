# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS build
ARG HOME_DIRECTORY=/parse
ENV VITE_HOME_DIRECTORY=${HOME_DIRECTORY}
WORKDIR /app

# Install deps (use lockfile for reproducibility)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy build configs required by Tailwind/PostCSS and Vite
COPY index.html ./index.html
COPY vite.config.ts ./vite.config.ts
COPY tsconfig.json ./tsconfig.json
COPY tailwind.config.ts ./tailwind.config.ts
COPY postcss.config.cjs ./postcss.config.cjs

# App source
COPY src ./src
# Optional public assets (if present)
# COPY public ./public

# Build production assets (Tailwind will run via PostCSS)
RUN npm run build

FROM nginx:1.27-alpine
ARG HOME_DIRECTORY=/parse
ENV HOME_DIRECTORY=${HOME_DIRECTORY}
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
