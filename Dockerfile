# syntax=docker/dockerfile:1.7
# Node 24 (LTS). Der Digest hält das Basisimage fest; Dependabot schlägt Aktualisierungen vor.
ARG NODE_IMAGE=node:24-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5

FROM ${NODE_IMAGE} AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    TZ=Europe/Zurich \
    PORT=3001 \
    HOST=0.0.0.0 \
    PICKTICK_DATEN=/app/daten
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server
# Datenordner gehört dem Benutzer node; der Dienst läuft nicht als root
RUN mkdir -p /app/daten && chown node:node /app/daten
USER node
EXPOSE 3001
VOLUME ["/app/daten"]
HEALTHCHECK --interval=60s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/gesund').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist-server/index.js"]
