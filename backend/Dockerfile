# syntax=docker/dockerfile:1.7

FROM node:20.15-slim AS prod-deps
WORKDIR /app

COPY package*.json ./
# Backend eo same bhabe lockfile bypass kora holo jate kono dependency error na ashe
RUN rm -rf package-lock.json node_modules && npm install --omit=dev && npm cache clean --force

FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node server.js ./server.js
COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts

USER node

EXPOSE 5000

CMD ["node", "server.js"]
