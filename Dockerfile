# Full image that builds and runs the app, for a VPS or any host with 2 GB+ for the build.
# Hyperlift uses docker/runtime.Dockerfile on the deploy branch instead (see .github/workflows).
# NEXT_PUBLIC_* values are inlined at build time. They ship to every browser, so they are not
# secrets; a host can still override them with build args.
# It runs `next start` on the full build, the same server the project is tested with.
FROM node:22-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_SUPABASE_URL=https://hkgaercmtdmoksrhzcya.supabase.co
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_5XZ3UcX0qeI0RpgJ3kBcuQ_pqPEeZ3R
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ARG NEXT_PUBLIC_SUPABASE_URL=https://hkgaercmtdmoksrhzcya.supabase.co
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_5XZ3UcX0qeI0RpgJ3kBcuQ_pqPEeZ3R
# next.config.ts reads the Supabase URL again at start for the CSP connect-src.
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=8080 HOSTNAME=0.0.0.0 \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app ./
USER app
EXPOSE 8080
CMD ["npx", "next", "start", "-p", "8080", "-H", "0.0.0.0"]
