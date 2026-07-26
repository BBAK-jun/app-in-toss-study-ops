# @studyops/wiki

StudyOps Bot 작업 진행 상황을 데이터로 시각화하는 Astro 정적 사이트.
HARNESS.md (§5 산출물 규약)와 함께 작동.

> 자세한 설계 결정은 [ADR-004](src/content/decisions/adr-004-harness-wiki-astro.md) 와 [ADR-005](src/content/decisions/adr-005-watchexec-launchd-automation.md) 참조.

## 빠른 시작

### 1. 의존성 설치 (루트에서)

```bash
pnpm install
```

### 2. 데이터 인덱싱 (최초 1회)

```bash
pnpm wiki:index
```

`.omo/run-continuation/` 세션과 루트의 `qa-*.png`를 위키 콘텐츠로 변환.

### 3. dev 서버 실행

```bash
pnpm wiki:dev
```

http://localhost:4321 에서 위키 확인.

### 4. 자동화 데몬 설치 (권장)

```bash
pnpm wiki:install-daemon
```

파일 변경 시 자동으로 `wiki:index`가 실행되는 백그라운드 데몬 설치. macOS 로그인 시 자동 시작.

## 모든 스크립트

| 명령 | 설명 |
|---|---|
| `pnpm wiki:dev` | Astro dev 서버 (포트 4321) |
| `pnpm wiki:build` | 정적 사이트 빌드 → `dist/` |
| `pnpm wiki:preview` | 빌드 결과 미리보기 |
| `pnpm wiki:index` | 로컬 데이터(.omo 세션, QA PNG) 인덱싱 |
| `pnpm wiki:watch` | 파일 감시 모드 (포어그라운드, launchd 없이) |
| `pnpm wiki:install-daemon` | launchd 백그라운드 데몬 설치 (macOS) |
| `pnpm wiki:uninstall-daemon` | 데몬 제거 |
| `pnpm wiki:check` | Astro 타입체크 |

## 콘텐츠 컬렉션

`src/content/` 아래 5개 컬렉션. 각각 Zod 스키마로 검증됨 (`src/content.config.ts`).

| 컬렉션 | 경로 | 누가 작성 | 스키마 |
|---|---|---|---|
| `episodes` | `episodes/YYYY-MM-DD-slug.md` | AI/사용자 수동 | `EpisodeSchema` |
| `decisions` | `decisions/adr-NNN-slug.md` | 사용자 수동 | `DecisionSchema` |
| `qa` | `qa/<id>.md` | AI/사용자 수동 | `QaSchema` |
| `sessions` | `sessions/ses-<id>.md` | **자동 생성** (`index-local.ts`) | `SessionSchema` |
| `changelog` | `changelog/<id>.md` | **Phase 2**: 자동 (Linear/GitHub/Discord) | `ChangelogSchema` |

**주의**: `sessions/`, `changelog/` 는 자동 생성 → 수동 편집 금지. 위키 페이지 수정은 `episodes/`, `decisions/`, `qa/` 만.

## 자동화 데몬 상세

### 감시 대상 (변경 시 자동 `wiki:index`)

```
.omo/run-continuation/**   → 세션 자동 수집
HARNESS.md                  → 컨텍스트 변경 감지
docs/PRD-StudyOps-Bot.md
docs/ARCHITECTURE.md
docs/wiki/src/content/{episodes,decisions,qa}/   → 수동 위키 페이지 변경
```

### 감시 제외 (무한 루프 방지)

```
docs/wiki/src/content/sessions/     → index 출력 디렉토리
docs/wiki/src/content/changelog/    → 동일
docs/wiki/public/                   → 레거시 PNG 복사본
```

`sessions/` 을 감시 대상에 넣으면 watcher가 자기 쓰기를 다시 감지해 무한 루프에 빠짐 (ADR-005 참조).

### 데몬 관리

```bash
# 상태 확인
launchctl list com.studyops.wiki-watcher

# 일시 정지
launchctl unload ~/Library/LaunchAgents/com.studyops.wiki-watcher.plist

# 다시 시작
launchctl load ~/Library/LaunchAgents/com.studyops.wiki-watcher.plist

# 로그 보기
tail -f docs/wiki/logs/watcher.out.log
tail -f docs/wiki/logs/watcher.err.log

# 완전 제거
pnpm wiki:uninstall-daemon
```

### 데몬이 안 켜질 때

1. `launchctl list com.studyops.wiki-watcher` 로 상태 확인
2. `docs/wiki/logs/watcher.err.log` 에러 확인
3. PATH 문제 → `pnpm wiki:uninstall-daemon && pnpm wiki:install-daemon` (재설치)
4. watchexec 미설치 → `brew install watchexec`

## 디렉토리 구조

```
docs/wiki/
├── README.md                              # 이 파일
├── package.json
├── astro.config.mjs
├── tsconfig.json
├── src/
│   ├── content.config.ts                  # Zod 스키마 정의
│   ├── content/
│   │   ├── episodes/                      # 작업 단위
│   │   ├── decisions/                     # ADR
│   │   ├── qa/                            # QA 세션
│   │   ├── sessions/                      # 자동 생성 (.omo 인덱스)
│   │   └── changelog/                     # Phase 2: 외부 연동
│   ├── layouts/BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro                    # 대시보드
│   │   ├── episodes/{index,[slug]}.astro
│   │   ├── decisions/{index,[slug]}.astro
│   │   ├── qa/{index,[slug]}.astro
│   │   ├── sessions/index.astro
│   │   ├── harness.astro                  # HARNESS.md 가이드
│   │   ├── prd.astro                      # PRD 요약
│   │   └── architecture.astro             # ARCHITECTURE 요약
│   └── styles/global.css
├── public/
│   └── qa/legacy/                         # 자동 수집된 루트 qa-*.png
├── scripts/
│   ├── index-local.ts                     # 로컬 데이터 인덱싱 (tsx)
│   ├── watch.sh                           # watchexec 파일 감시
│   ├── com.studyops.wiki-watcher.plist    # launchd 템플릿
│   ├── install-daemon.sh                  # 데몬 설치
│   └── uninstall-daemon.sh                # 데몬 제거
└── logs/                                  # watcher 로그 (git 제외)
```

## 외부 연동 (Phase 2, 미구현)

- Linear MCP → 이슈를 `changelog/` 컬렉션으로 동기화
- GitHub PR → PR 데이터를 `changelog/`에 추가
- Discord Webhook → 발송 이력을 `changelog/`에 추가
- OpenCode `opencode.db` (SQLite) → 세션 메시지 히스토리 파싱

Phase 2 구현 시 각각 별도 스크립트로 작성 (`scripts/fetch-linear.ts` 등).
