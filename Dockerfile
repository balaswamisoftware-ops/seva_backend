# syntax=docker/dockerfile:1.7

# ---- shared base ----
ARG NODE_VERSION=22-alpine

# 1. Install all deps (incl. dev) — needed to compile TypeScript.
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# 2. Build TypeScript -> dist/
FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json ./
COPY src ./src
RUN npm run build

# 3. Install only production deps (smaller, no tsc/tsx/types).
FROM node:${NODE_VERSION} AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --no-audit --no-fund

# 4. Final runtime image — lean, non-root, tini for signal handling.
FROM node:${NODE_VERSION} AS runtime
RUN apk add --no-cache tini
WORKDIR /app

ENV NODE_ENV=production \
    PORT=4000 \
    UPLOAD_DIR=/app/uploads

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build     /app/dist          ./dist
COPY package.json ./

RUN mkdir -p /app/uploads && chown -R node:node /app
USER node

EXPOSE 4000
VOLUME ["/app/uploads"]

# Probes the real health route. Uses Node's built-in fetch — no curl/wget needed.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# tini reaps zombies and forwards SIGTERM so `docker stop` shuts Node down cleanly.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
