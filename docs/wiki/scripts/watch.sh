#!/usr/bin/env bash
#
# StudyOps Wiki Watcher
# 저장소 내 위키 관련 파일 변경을 감시하여 자동으로 `npm run index` 실행.
# launchd 데몬(`com.studyops.wiki-watcher.plist`)이 이 스크립트를 백그라운드로 실행.
#
# 사용:
#   npm run wiki:watch                  # 포어그라운드 실행 (데몬 없이)
#   ./scripts/watch.sh                  # 직접 실행
#
# 감시 대상:
#   - .omo/run-continuation/            OpenCode 세션 상태 파일
#   - HARNESS.md                         실행 컨텍스트 계약서
#   - docs/PRD-StudyOps-Bot.md          제품 요구 정의서
#   - docs/ARCHITECTURE.md              아키텍처 문서
#   - docs/wiki/src/content/            수동 위키 페이지
#   - qa-*.png, screen-*.png            루트 레거시 QA 스크린샷
#
# 무시:
#   - node_modules, .git, dist, .astro, .wrangler, .playwright-mcp, .codegraph
#
# 트리거 시: `npm run index` (docs/wiki 안에서) 실행.
# dev 서버(`npm run wiki:dev`)가 떠 있으면 Astro가 자동으로 위키 페이지를 새로고침.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WIKI_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$WIKI_ROOT/../.." && pwd)"

if ! command -v watchexec >/dev/null 2>&1; then
  echo "ERROR: watchexec not found. 설치: brew install watchexec" >&2
  exit 1
fi

echo "📚 StudyOps Wiki Watcher"
echo "   WIKI_ROOT : $WIKI_ROOT"
echo "   REPO_ROOT : $REPO_ROOT"
echo "   debounce  : 1000ms"
echo "   명령      : npm run index (파일 변경 시)"
echo ""
echo "감시 대상:"
echo "  - .omo/run-continuation/      (세션 — 입력)"
echo "  - HARNESS.md                   (컨텍스트 계약서)"
echo "  - docs/PRD-StudyOps-Bot.md"
echo "  - docs/ARCHITECTURE.md"
echo "  - docs/wiki/src/content/{episodes,decisions,qa}/  (수동 위키)"
echo ""
echo "감시 제외 (index 출력 디렉토리 — 무한 루프 방지):"
echo "  - docs/wiki/src/content/sessions/"
echo "  - docs/wiki/src/content/changelog/"
echo "  - docs/wiki/public/  (qa legacy 복사본)"
echo ""
echo "(Ctrl+C로 종료. launchd로 띄운 경우 launchctl unload com.studyops.wiki-watcher)"
echo ""

cd "$WIKI_ROOT"

# filter는 watchexec 버전 간 호환성이 깨지기 쉬워, 명시적 -w 경로만 사용.
# qa-*.png / screen-*.png 같은 루트 글로브는 -w로 못 잡지만, 새 파일은 사용자가
# 직접 추가하므로 그때 `npm run wiki:index` 수동 실행하면 됨 (레거시 파일은 자동 수집됨).
#
# 주의: src/content/sessions/ 와 changelog/ 는 index 스크립트가 자동으로 파일을 쓰는
# 출력 디렉토리이므로 감시 대상에서 제외. 포함하면 watcher가 자기 쓰기를 다시 감지해
# 무한 루프에 빠짐.
exec watchexec \
  -w "$REPO_ROOT/.omo/run-continuation" \
  -w "$REPO_ROOT/HARNESS.md" \
  -w "$REPO_ROOT/docs/PRD-StudyOps-Bot.md" \
  -w "$REPO_ROOT/docs/ARCHITECTURE.md" \
  -w "$REPO_ROOT/docs/wiki/src/content/episodes" \
  -w "$REPO_ROOT/docs/wiki/src/content/decisions" \
  -w "$REPO_ROOT/docs/wiki/src/content/qa" \
  --debounce 1000 \
  --postpone \
  npm run index
