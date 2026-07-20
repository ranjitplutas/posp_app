# Single-container image: Fastify API + Next.js web, one process each,
# one exposed port (8082 — avoids the 80/3000 already used by other apps on
# the host). Next.js proxies /api/v1 and /health to the API process over
# 127.0.0.1:4000 internally (see apps/web/next.config.js) — nothing but
# port 8082 needs to be reachable from outside the container.
#
# docker build -f Dockerfile \
#   --build-arg NEXT_PUBLIC_API_BASE_URL=/api/v1 \
#   --build-arg NEXT_PUBLIC_MICROSOFT_CLIENT_ID=... \
#   --build-arg NEXT_PUBLIC_MICROSOFT_TENANT_ID=... \
#   --build-arg NEXT_PUBLIC_MICROSOFT_REDIRECT_URI=https://app.example.com/auth/callback \
#   -t posp-admin .

FROM node:22-slim AS build
WORKDIR /repo

ARG NEXT_PUBLIC_API_BASE_URL=/api/v1
ARG NEXT_PUBLIC_MICROSOFT_CLIENT_ID
ARG NEXT_PUBLIC_MICROSOFT_TENANT_ID
ARG NEXT_PUBLIC_MICROSOFT_REDIRECT_URI
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_MICROSOFT_CLIENT_ID=$NEXT_PUBLIC_MICROSOFT_CLIENT_ID
ENV NEXT_PUBLIC_MICROSOFT_TENANT_ID=$NEXT_PUBLIC_MICROSOFT_TENANT_ID
ENV NEXT_PUBLIC_MICROSOFT_REDIRECT_URI=$NEXT_PUBLIC_MICROSOFT_REDIRECT_URI

COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm install --workspace=apps/api --workspace=apps/web --workspace=packages/contracts

COPY packages/contracts packages/contracts
COPY apps/api/src apps/api/src
COPY apps/api/scripts apps/api/scripts
COPY apps/api/migrations apps/api/migrations
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/web apps/web
RUN npm run build --workspace=apps/web

FROM node:22-slim AS runtime
WORKDIR /repo

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 --home /home/appuser appuser \
  && mkdir -p /home/appuser && chown appuser:nodejs /home/appuser
ENV NODE_ENV=production
ENV HOME=/home/appuser

# API: runs via tsx (see apps/api/Dockerfile for why — same reasoning applies here).
COPY --from=build --chown=appuser:nodejs /repo/node_modules /repo/node_modules
COPY --from=build --chown=appuser:nodejs /repo/package.json /repo/package.json
COPY --from=build --chown=appuser:nodejs /repo/apps/api/package.json /repo/apps/api/package.json
COPY --from=build --chown=appuser:nodejs /repo/packages/contracts /repo/packages/contracts
COPY --from=build --chown=appuser:nodejs /repo/apps/api/src /repo/apps/api/src
COPY --from=build --chown=appuser:nodejs /repo/apps/api/tsconfig.json /repo/apps/api/tsconfig.json

# Web: standalone Next.js output.
COPY --from=build --chown=appuser:nodejs /repo/apps/web/.next/standalone /repo
COPY --from=build --chown=appuser:nodejs /repo/apps/web/.next/static /repo/apps/web/.next/static
COPY --from=build --chown=appuser:nodejs /repo/apps/web/public /repo/apps/web/public

COPY --chown=appuser:nodejs start.sh /repo/start.sh
RUN chmod +x /repo/start.sh

USER appuser
EXPOSE 8082
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8082/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["/repo/start.sh"]
