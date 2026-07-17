# Build context must be the monorepo root.
# docker build -f apps/web/Dockerfile -t posp-admin-web .

FROM node:22-slim AS build
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm install --workspace=apps/web --workspace=packages/contracts
COPY packages/contracts packages/contracts
COPY apps/web apps/web
RUN npm run build --workspace=apps/web

FROM node:22-slim AS runtime
WORKDIR /repo/apps/web
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 webuser
COPY --from=build --chown=webuser:nodejs /repo/apps/web/.next/standalone ./
COPY --from=build --chown=webuser:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=webuser:nodejs /repo/apps/web/public ./apps/web/public

USER webuser
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
