#!/usr/bin/env bash
# Деплой бэкенда комментариев в Cloudflare Workers + D1.
# Node и wrangler не нужны — только curl и jq.
#
#   export CLOUDFLARE_TOKEN=...      # токен из профиля Cloudflare
#   export CLOUDFLARE_ACCOUNT_ID=... # id аккаунта
#   export ADMIN_TOKEN=...           # токен для удаления комментариев (придумай)
#   ./deploy.sh
#
# Токен должен иметь права: Workers Scripts Edit, D1 Edit, Workers Tail (не нужен),
# Account Settings Read. Быстрый путь: дашборд → My Profile → API Tokens →
# Create Token → шаблон «Edit Cloudflare Workers» (он уже включает D1).
set -euo pipefail

: "${CLOUDFLARE_TOKEN:?нет CLOUDFLARE_TOKEN}"
: "${CLOUDFLARE_ACCOUNT_ID:?нет CLOUDFLARE_ACCOUNT_ID}"
: "${ADMIN_TOKEN:?нет ADMIN_TOKEN}"

API="https://api.cloudflare.com/client/v4"
AUTH=(-H "Authorization: Bearer ${CLOUDFLARE_TOKEN}" -H "Content-Type: application/json")
HERE="$(cd "$(dirname "$0")" && pwd)"
DB_NAME="comments-db"
WORKER_NAME="enotcoder-comments"

need() { command -v "$1" >/dev/null || { echo "нужна утилита $1"; exit 1; }; }
need curl
need jq

# ── 1. база D1 (создаём или берём существующую) ────────────────────────
DB_ID=$(curl -s "${AUTH[@]}" "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/d1/database" \
        | jq -r ".result[]? | select(.name==\"$DB_NAME\") | .uuid" | head -1)

if [ -z "$DB_ID" ]; then
  echo "▸ создаю базу $DB_NAME"
  DB_ID=$(curl -s -X POST "${AUTH[@]}" "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/d1/database" \
          -d "{\"name\":\"$DB_NAME\"}" | jq -r '.result.uuid // .errors[0].message')
  [ -n "$DB_ID" ] && [ "$DB_ID" != "null" ] || { echo "не создалась база"; exit 1; }
else
  echo "▸ база уже есть: $DB_ID"
fi
echo "  db_id = $DB_ID"

# ── 2. схема таблиц ───────────────────────────────────────────────────
echo "▸ применяю schema.sql"
SQL=$(jq -Rs . < "$HERE/schema.sql")
curl -s -X POST "${AUTH[@]}" \
  "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/d1/database/$DB_ID/query" \
  -d "{\"sql\":$SQL}" | jq -e '.success' >/dev/null || { echo "схема не применилась"; exit 1; }

# ── 3. воркер: биндинг D1 + токен модерации ───────────────────────────
echo "▸ загружаю $WORKER_NAME.js"

# необязательный ALLOWED_ORIGIN — если задан, CORS не будет открытым
META=$(jq -n --arg db "$DB_ID" --arg tok "$ADMIN_TOKEN" --arg origin "${ALLOWED_ORIGIN:-}" '{
  main_module: true,
  compatibility_date: "2026-09-01",
  bindings: ( [{ type: "d1", name: "DB", id: $db },
               { type: "plain_text", name: "ADMIN_TOKEN", text: $tok } ]
             + (if $origin != "" then [{ type: "plain_text", name: "ALLOWED_ORIGIN", text: $origin }] else [] end) )
}')

META_FILE=$(mktemp)
printf '%s' "$META" > "$META_FILE"

curl -s -X PUT "${AUTH[@]}" \
  "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/$WORKER_NAME" \
  -F "metadata=@$META_FILE;type=application/json" \
  -F "worker.js=@$HERE/worker.js;type=application/javascript+module" \
  | tee /tmp/cf-deploy.json | jq -e '.success' >/dev/null \
  || { echo "воркер не задеплоился:"; cat /tmp/cf-deploy.json; exit 1; }
rm -f "$META_FILE"

# ── 4. адрес ──────────────────────────────────────────────────────────
SUBDOMAIN=$(curl -s "${AUTH[@]}" "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/subdomain" \
            | jq -r '.result.subdomain // empty')
if [ -n "$SUBDOMAIN" ]; then
  URL="https://$WORKER_NAME.$SUBDOMAIN.workers.dev"
else
  URL="(адрес в разделе Workers & Pages → твой воркер)"
fi

echo
echo "✓ задеплоено"
echo "  API:   $URL"
echo "  db_id: $DB_ID"
echo
echo "Проверка:"
echo "  curl $URL/health"
echo
echo "Впиши адрес в assets/comments.js → CONFIG.api, потом закоммить."
echo "$URL" > "$HERE/.deployed-url"
