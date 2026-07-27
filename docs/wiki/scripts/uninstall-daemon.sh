#!/usr/bin/env bash
#
# StudyOps Wiki Watcher — LaunchAgent 제거
#
# 작업:
#   1. launchctl unload
#   2. ~/Library/LaunchAgents/com.studyops.wiki-watcher.plist 제거
#   3. 로그 파일은 유지 (사용자가 확인할 수 있도록)
#
# 사용:
#   pnpm wiki:uninstall-daemon
#   ./scripts/uninstall-daemon.sh
#
set -euo pipefail

LABEL="com.studyops.wiki-watcher"
DEST="$HOME/Library/LaunchAgents/$LABEL.plist"

if [ -t 1 ]; then
  GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; RESET=$'\033[0m'
else
  GREEN=""; YELLOW=""; RED=""; RESET=""
fi

echo "📚 StudyOps Wiki Watcher — LaunchAgent 제거"
echo ""

if [ ! -f "$DEST" ]; then
  echo "${YELLOW}ℹ${RESET} 설치된 LaunchAgent가 없습니다: $DEST"
  exit 0
fi

if launchctl list "$LABEL" >/dev/null 2>&1; then
  echo "1️⃣  launchctl unload..."
  launchctl unload "$DEST"
  echo "   ${GREEN}✓${RESET} 완료"
else
  echo "1️⃣  이미 unload 됨 (건너뜀)"
fi

echo ""
echo "2️⃣  plist 제거..."
rm -f "$DEST"
echo "   ${GREEN}✓${RESET} $DEST"

echo ""
echo "${GREEN}✨ 제거 완료${RESET}"
echo "로그 파일은 유지됩니다 (수동 삭제 가능): docs/wiki/logs/"
