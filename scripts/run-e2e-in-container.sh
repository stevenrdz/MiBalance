#!/bin/sh
set -eu

npm install --no-save @playwright/test@1.58.2 playwright@1.58.2 >/tmp/pw-install.log 2>&1
npm install >/tmp/app-install.log 2>&1

npm run dev > e2e-dev.log 2>&1 &
DEV_PID=$!

READY=0
for _ in $(seq 1 60); do
  if curl -sf http://localhost:3000/auth/login >/dev/null; then
    READY=1
    break
  fi
  sleep 2
done

if [ "$READY" -ne 1 ]; then
  echo "App no estuvo lista a tiempo."
  kill "$DEV_PID" || true
  exit 1
fi

E2E_BASE_URL=http://localhost:3000 \
NEXT_PUBLIC_SUPABASE_URL=http://host.docker.internal:54321 \
npx playwright test e2e/smoke.spec.ts --reporter=line
STATUS=$?

kill "$DEV_PID" || true
exit "$STATUS"

