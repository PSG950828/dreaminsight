#!/usr/bin/env bash
set -euo pipefail

# Smoke test for community APIs (requires dev server + Supabase configured)
# Usage: bash scripts/smoke-community.sh [BASE_URL]

BASE_URL=${1:-http://localhost:3000}
COOKIES=$(mktemp)
trap 'rm -f "$COOKIES"' EXIT

echo "[+] Base: $BASE_URL"

echo "[1] Create a post"
RESP=$(curl -sS -c "$COOKIES" -b "$COOKIES" -H 'Content-Type: application/json' \
  -X POST "$BASE_URL/api/community/posts" \
  -d '{"text":"노란불이 깜빡였고 러닝하면서 하하 웃었어요","anon_name":"테스터","user_uid":"u_smoke"}')
echo "$RESP"
POST_ID=$(echo "$RESP" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -n1)
if [ -z "$POST_ID" ]; then
  echo "[!] Failed to create post or parse id" >&2
  exit 1
fi
echo "[+] post id: $POST_ID"

echo "[2] List images (expect empty)"
curl -sS -b "$COOKIES" "$BASE_URL/api/community/images?post=$POST_ID&w=192&h=192" | sed -e '1,120p'

echo "[3] Upload a tiny PNG via JSON dataUrl"
# 1x1 transparent PNG
DATA_URL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=="
curl -sS -b "$COOKIES" -H 'Content-Type: application/json' \
  -X POST "$BASE_URL/api/community/upload" \
  -d "{\"post_id\":\"$POST_ID\",\"user_uid\":\"u_smoke\",\"dataUrl\":\"$DATA_URL\"}" | sed -e '1,120p'

echo "[4] List images again (should have 1 publicUrl)"
curl -sS -b "$COOKIES" "$BASE_URL/api/community/images?post=$POST_ID&w=64&h=64" | sed -e '1,120p'

echo "[5] Moderation check (should fail)"
curl -sS -o /dev/stderr -w "status:%{http_code}\n" -b "$COOKIES" -H 'Content-Type: application/json' \
  -X POST "$BASE_URL/api/community/posts" \
  -d '{"text":"무료 머니 010-1234-5678 http://spam.example","anon_name":"스패머","user_uid":"u_spam"}'

echo "[6] Rate limit check (may hit 429)"
for i in 1 2 3 4; do
  curl -sS -o /dev/null -w "try $i status:%{http_code}\n" -b "$COOKIES" -H 'Content-Type: application/json' \
    -X POST "$BASE_URL/api/community/posts" \
    -d '{"text":"테스트 rate limit","anon_name":"rl","user_uid":"u_rl"}'
done

echo "[DONE]"

