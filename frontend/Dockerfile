# syntax=docker/dockerfile:1.7

FROM node:20.15-slim AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app

COPY . .
RUN npm run build

# Nginx slim tag-ti correct kora holo (1.27.0-slim)
FROM nginx:1.27.0-slim AS runtime

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

# Debian slim-e curl default-e na thakle wget use korai safe, 
# tai wget command-ti debian compatible kora holo
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider -q http://0.0.0.0:8080/health || exit 1
