# syntax=docker/dockerfile:1.7

# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package*.json ./
# Use npm ci for reproducible installs; clear cache to reduce layer size
RUN npm ci && npm cache clean --force

# ── Stage 2: build the Vite/React app ────────────────────────────────────────
FROM deps AS build
WORKDIR /app

COPY . .
RUN npm run build

# ── Stage 3: lean nginx runtime ──────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Tell nginx docker-entrypoint to process *.template files
ENV NGINX_ENVSUBST_TEMPLATE_SUFFIX=.template

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

# Fix permissions so the nginx user can write to required dirs
RUN touch /var/run/nginx.pid \
  && chown -R nginx:nginx \
    /etc/nginx/conf.d \
    /etc/nginx/templates \
    /usr/share/nginx/html \
    /var/cache/nginx \
    /var/run/nginx.pid

USER nginx

EXPOSE 8080

# wget is available in nginx:alpine; checks actual serving, not just config
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:8080/health > /dev/null || exit 1
