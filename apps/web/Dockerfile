# Build context must be the monorepo root.
# Next.js inlines NEXT_PUBLIC_* vars into the client bundle at build time, not
# runtime — they must be passed as --build-arg, not just set in a runtime .env file.
# docker build -f apps/web/Dockerfile \
#   --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1 \
#   --build-arg NEXT_PUBLIC_MICROSOFT_CLIENT_ID=... \
#   --build-arg NEXT_PUBLIC_MICROSOFT_TENANT_ID=... \
#   --build-arg NEXT_PUBLIC_MICROSOFT_REDIRECT_URI=https://app.example.com/auth/callback \
#   -t posp-admin-web .

FROM node:22-slim AS build
WORKDIR /repo

ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_MICROSOFT_CLIENT_ID
ARG NEXT_PUBLIC_MICROSOFT_TENANT_ID
ARG NEXT_PUBLIC_MICROSOFT_REDIRECT_URI
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_MICROSOFT_CLIENT_ID=$NEXT_PUBLIC_MICROSOFT_CLIENT_ID
ENV NEXT_PUBLIC_MICROSOFT_TENANT_ID=$NEXT_PUBLIC_MICROSOFT_TENANT_ID
ENV NEXT_PUBLIC_MICROSOFT_REDIRECT_URI=$NEXT_PUBLIC_MICROSOFT_REDIRECT_URI

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
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
