FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY backend/package.json backend/package-lock.json ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev

COPY backend/ ./
COPY frontend/ /app/frontend/

ENV NODE_ENV=production
EXPOSE 3010

CMD ["sh", "-c", "if [ \"$SKIP_SEED\" != \"true\" ]; then node prisma/seed.js; fi && exec node src/index.js"]
