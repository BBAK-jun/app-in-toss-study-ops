#!/usr/bin/env bash
#
# StudyOps Wiki Watcher — LaunchAgent 설치
#
# 작업:
#   1. watchexec, node 의존성 확인
#   2. 로그 디렉토리 생성
#   3. plist 템플릿에서 placeholder 치환 → ~/Library/LaunchAgents/ 로 복사
#   4. launchctl load (지금 즉시 시작)
#
# 사용:
#   pnpm wiki:install-daemon           # 루트에서
#   ./scripts/install-daemon.sh        # docs/wiki 안에서 직접
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WIKI_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$WIKI_ROOT/../.." && pwd)"
TEMPLATE="$SCRIPT_DIR/com.studyops.wiki-watcher.plist"
LABEL="com.studyops.wiki-watcher"
DEST="$HOME/Library/LaunchAgents/$LABEL.plist"

# 색상 (TTY인 경우만)
if [ -t 1 ]; then
  GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; RESET=$'\033[0m'
else
  GREEN=""; YELLOW=""; RED=""; RESET=""
fi

echo "📚 StudyOps Wiki Watcher — LaunchAgent 설치"
echo "   WIKI_ROOT : $WIKI_ROOT"
echo "   REPO_ROOT : $REPO_ROOT"
echo ""

# ─── 1. 의존성 확인 ─────────────────────────────────────────────────────────
echo "1️⃣  의존성 확인..."

if ! command -v brew >/dev/null 2>&1; then
  echo "${RED}ERROR:${RESET} Homebrew가 없습니다. https://brew.sh 에서 설치하세요." >&2
  exit 1
fi

if ! command -v watchexec >/dev/null 2>&1; then
  echo "   ${YELLOW}watchexec 없음. 설치 중...${RESET}"
  brew install watchexec
fi
echo "   ${GREEN}✓${RESET} watchexec: $(command -v watchexec) ($(watchexec --version | head -1))"

if ! command -v node >/dev/null 2>&1; then
  echo "${RED}ERROR:${RESET} node가 없습니다." >&2
  exit 1
fi
echo "   ${GREEN}✓${RESET} node: $(command -v node) ($(node --version))"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "${RED}ERROR:${RESET} pnpm이 없습니다." >&2
  exit 1
fi
echo "   ${GREEN}✓${RESET} pnpm: $(command -v pnpm)"

# ─── 2. 로그 디렉토리 ───────────────────────────────────────────────────────
echo ""
echo "2️⃣  로그 디렉토리 생성..."
mkdir -p "$WIKI_ROOT/logs"
echo "   ${GREEN}✓${RESET} $WIKI_ROOT/logs/"

# ─── 3. PATH 추출 ────────────────────────────────────────────────────────────
# watchexec, node, pnpm이 모두 발견된 PATH를 사용. launchd는 기본 PATH가 제한적이라 필수.
# 로그인 셸의 PATH를 가져오기 위해 -l 셸을 실행.
echo ""
echo "3️⃣  PATH 추출..."
LOGIN_PATH="$(bash -lc 'echo $PATH')"
echo "   ${GREEN}✓${RESET} PATH 길이: ${#LOGIN_PATH} 문자"

# ─── 4. plist 생성 ───────────────────────────────────────────────────────────
echo ""
echo "4️⃣  LaunchAgent plist 생성..."

# 이미 로드되어 있으면 unload
if launchctl list "$LABEL" >/dev/null 2>&1; then
  echo "   기존 에이전트 감지. unload 중..."
  launchctl unload "$DEST" 2>/dev/null || true
fi

mkdir -p "$(dirname "$DEST")"

# placeholder 치환. sed의 |를 구분자로 써서 경로의 / 충돌 회피.
# 환경변수 치환 시 &가 있으면 안 됨. 작은따옴표로 보호.
sed \
  -e "s|__WIKI_ROOT__|$WIKI_ROOT|g" \
  -e "s|__ENV_PATH__|$LOGIN_PATH|g" \
  -e "s|__HOME__|$HOME|g" \
  "$TEMPLATE" > "$DEST"

echo "   ${GREEN}✓${RESET} $DEST"

# ─── 5. launchctl load ──────────────────────────────────────────────────────
echo ""
echo "5️⃣  LaunchAgent 로드..."
launchctl load "$DEST"

# 검증
sleep 1
if launchctl list "$LABEL" >/dev/null 2>&1; then
  PID=$(launchctl list "$LABEL" | grep -E '^\s*"PID"' | awk -F'"' '{print $4}' || true)
  echo "   ${GREEN}✓${RESET} 로드됨 (Label: $LABEL, PID: ${PID:-시작 대기 중})"
else
  echo "   ${RED}✗${RESET} 로드 실패. 로그 확인: $WIKI_ROOT/logs/watcher.err.log" >&2
  exit 1
fi

echo ""
echo "${GREEN}✨ 설치 완료!${RESET}"
echo ""
echo "다음:"
echo "  - 로그 보기:        tail -f $WIKI_ROOT/logs/watcher.out.log"
echo "  - 상태 확인:        launchctl list $LABEL"
echo "  - 일시 정지:        launchctl unload $DEST"
echo "  - 다시 시작:        launchctl load $DEST"
echo "  - 완전 제거:        pnpm wiki:uninstall-daemon"
echo ""
echo "이제 저장소의 위키 관련 파일(.omo 세션, HARNESS.md, qa-*.png, 위키 콘텐츠)을"
echo "변경하면 자동으로 위키 인덱스가 갱신됩니다."
