# Multi-stage build: dependencies and the build toolchain never reach the final image.

# --- Shared base with Yarn -------------------------------------------------------------------
FROM node:26-alpine AS base
WORKDIR /app
# Node 25+ no longer bundles Corepack; install it so Yarn comes from the packageManager pin.
RUN npm install --global corepack@latest && corepack enable
ENV NEXT_TELEMETRY_DISABLED=1

# --- 1. Dependencies -------------------------------------------------------------------------
FROM base AS deps
# The in-memory MongoDB is only for tests; skip downloading its binary.
ENV MONGOMS_DISABLE_POSTINSTALL=1
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# --- 2. Build --------------------------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# output: "standalone" traces the server's imports into .next/standalone (with a minimal
# node_modules). Building on Alpine means the musl build of the Argon2 binary is the one traced.
RUN yarn build

# --- 3. Runtime ------------------------------------------------------------------------------
FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Files stay owned by root and read-only for the app: the process cannot modify its own code.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

USER node
EXPOSE 3000

# BusyBox wget ships with Alpine (curl does not).
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health > /dev/null || exit 1

CMD ["node", "server.js"]
