# Runtime image for the `deploy` branch, which already holds the built `.next` from GitHub Actions.
# It only installs production dependencies and starts the server (about 130 MB of memory).
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=8080 HOSTNAME=0.0.0.0 \
    NEXT_PUBLIC_SUPABASE_URL=https://hkgaercmtdmoksrhzcya.supabase.co \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_5XZ3UcX0qeI0RpgJ3kBcuQ_pqPEeZ3R \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --chown=node:node . .
USER node
EXPOSE 8080
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "8080", "-H", "0.0.0.0"]
