FROM node:20-alpine AS builder

WORKDIR /app

# This stack serves the frontend and API behind ONE origin (nginx -> Cloudflare),
# so the browser must call the API with RELATIVE URLs. Hardcode the public API
# base to empty so a stray deploy/.env can never bake a private IP (e.g.
# http://192.168.1.5:8010) into the client bundle -- that would make the browser
# fetch a LAN address from a public HTTPS page and trigger the "Access other
# devices on your local network" permission prompt (plus mixed-content). SSR uses
# the server-only API_URL_INTERNAL instead (see frontend/src/lib/server-api.ts).
ENV NEXT_PUBLIC_API_URL=""

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 5173

ENV PORT=5173

CMD ["node", "server.js"]
