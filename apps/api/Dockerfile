# Build context must be the monorepo root (npm workspaces need the root package.json + lockfile).
# docker build -f apps/api/Dockerfile -t posp-admin-api .

FROM node:22-slim AS build
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm install --workspace=apps/api --workspace=packages/contracts
COPY packages/contracts packages/contracts
COPY apps/api apps/api
RUN npm run build --workspace=apps/api

FROM node:22-slim AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm install --workspace=apps/api --workspace=packages/contracts --omit=dev
COPY packages/contracts packages/contracts
COPY --from=build /repo/apps/api/dist apps/api/dist
COPY apps/api/migrations apps/api/migrations

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 apiuser
USER apiuser

EXPOSE 4000
WORKDIR /repo/apps/api
CMD ["node", "dist/server.js"]
