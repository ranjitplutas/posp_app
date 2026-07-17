# Build context must be the monorepo root (npm workspaces need the root package.json + lockfile).
# docker build -f apps/api/Dockerfile -t posp-admin-api .
#
# Runs via tsx (not `tsc build` + `node dist/...`) — apps/api resolves
# @posp-admin/contracts through a tsconfig `paths` entry straight at
# packages/contracts/src, which `tsc`'s emitted JS can't follow at plain-`node`
# runtime (no bare-specifier rewriting, and the workspace's own package.json
# points "main" at a .ts file `node` can't execute). tsx transpiles on the fly,
# exactly like `npm run dev` — same resolution path as local dev, no separate
# runtime-only wiring to keep in sync. Slightly more startup overhead than a
# precompiled JS entrypoint; fine at this API's size.

FROM node:22-slim AS runtime
WORKDIR /repo

# Installed BEFORE NODE_ENV=production is set — npm treats NODE_ENV=production as an
# implicit --omit=dev, which would silently drop tsx (a devDependency) and the app
# wouldn't start. NODE_ENV only needs to be "production" for the running process,
# not for this install step.
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm install --workspace=apps/api --workspace=packages/contracts

COPY packages/contracts packages/contracts
COPY apps/api/src apps/api/src
COPY apps/api/scripts apps/api/scripts
COPY apps/api/migrations apps/api/migrations
COPY apps/api/tsconfig.json apps/api/tsconfig.json

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 --home /home/apiuser apiuser \
  && mkdir -p /home/apiuser && chown apiuser:nodejs /home/apiuser
ENV NODE_ENV=production
ENV HOME=/home/apiuser
USER apiuser

EXPOSE 4000
WORKDIR /repo/apps/api
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Direct binary path, not `npx tsx` — npx falls back to fetching from the registry
# (and failing, as a non-root user with no writable npm cache) if it can't find a
# local install; the hoisted workspace binary is always at this path.
CMD ["/repo/node_modules/.bin/tsx", "src/server.ts"]
