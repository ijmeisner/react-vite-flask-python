# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS build
ARG HOME_DIRECTORY=/parse
ENV VITE_HOME_DIRECTORY=${HOME_DIRECTORY}
WORKDIR /app

# Install deps
COPY package.json ./
RUN npm install --no-audit --no-fund

# Build app
COPY index.html ./index.html
COPY vite.config.ts ./vite.config.ts
COPY src ./src
RUN npm run build

FROM nginx:1.27-alpine
ARG HOME_DIRECTORY=/parse
ENV HOME_DIRECTORY=${HOME_DIRECTORY}
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
