#!/bin/bash
# db-backup-prod.sh — studyops-db-prod D1 export 백업
# wrangler d1 export 를 통해 프로덕션 DB를 SQL 덤프로 저장.
# 경로: backups/{YYYYMMDD-HHMMSS}.sql
#
# 사용법:
#   bash scripts/db-backup-prod.sh
#
# 주의: wrangler v4 필요. Cloudflare 계정 인증 필요.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/../../backups"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT="${BACKUP_DIR}/${TIMESTAMP}.sql"

echo "📦 Backing up studyops-db-prod → ${OUTPUT}"
npx wrangler d1 export studyops-db-prod --remote --output "$OUTPUT"

# 파일 크기 출력
FILESIZE=$(stat -f%z "$OUTPUT" 2>/dev/null || stat -c%s "$OUTPUT" 2>/dev/null || echo "?")
echo "✅ Backup complete: ${OUTPUT} (${FILESIZE} bytes)"
