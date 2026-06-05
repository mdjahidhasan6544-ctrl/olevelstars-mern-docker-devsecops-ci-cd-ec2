# syntax=docker/dockerfile:1.7

FROM node:20.15-slim AS deps
WORKDIR /app

COPY package*.json ./
# Lockfile bypass kore ekebare fresh linux native binary install korar jonno
RUN rm -rf package-lock.json node_modules && npm install

FROM deps AS build
WORKDIR /app

COPY . .
RUN npm run build

# Docker registry-te absolute stable mainline image
FROM nginx:1.27.0 AS runtime

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

RUN touch /var/run/nginx.pid \
  && chown -R nginx:nginx \
    /etc/nginx/conf.d \
    /etc/nginx/templates \
    /usr/share/nginx/html \
    /var/cache/nginx \
    /var/run/nginx.pid

USER nginx

EXPOSE 8080

# Nginx container internal test config command
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD nginx -t || exit 1
