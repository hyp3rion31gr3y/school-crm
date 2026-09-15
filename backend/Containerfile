# Backend Containerfile — Podman/Docker compatible (OCI).
# Build: podman build -t localhost/school-crm-backend:latest ./backend
# Run:   podman run --rm -p 4000:4000 --env-file ./backend/.env localhost/school-crm-backend:latest
FROM docker.io/library/node:20-slim

ENV NODE_ENV=production

WORKDIR /app

# Prisma engines need OpenSSL on slim images
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 4000

# Apply pending migrations on start, then serve. PORT/DATABASE_URL/JWT_SECRET via env.
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
