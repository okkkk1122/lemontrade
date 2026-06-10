#!/bin/sh
set -e

# seed فقط داده‌های اولیه را می‌سازد و تنظیمات ادمین را بازنویسی نمی‌کند
if [ "${SKIP_SEED}" != "true" ]; then
  echo "Running idempotent seed..."
  node prisma/seed.js
else
  echo "SKIP_SEED=true — seed skipped"
fi

exec node src/index.js
