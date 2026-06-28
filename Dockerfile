FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates wget \
  && rm -rf /var/lib/apt/lists/*

COPY backend/package.json backend/package-lock.json ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev

COPY backend/ ./
COPY frontend/ /app/frontend/

ENV NODE_ENV=production
EXPOSE 3010

CMD ["sh", "-c", "npx prisma generate && npx prisma db push --accept-data-loss && (node prisma/seed.js || true) && exec node src/index.js"]
