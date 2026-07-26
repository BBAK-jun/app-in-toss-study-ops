---
id: adr-005
title: 위키 자동화 — watchexec (파일 감시) + launchd (데몬)
status: accepted
date: 2026-07-26
supersededBy: null
tags: [automation, watchexec, launchd, macos, developer-experience]
---

# ADR-005: 위키 자동화 — watchexec + launchd

## Context

[ADR-004](/decisions/adr-004-harness-wiki-astro)로 세운 위키 시스템은 수동 실행에 의존:
```bash
npm run wiki:index   # .omo 세션, QA PNG → 위키 콘텐츠로 변환
```

사용자가 매번 이 명령을 치는 건 잊기 쉽고, 결과적으로 위키가 stale 해진다. 자동화 요구사항:

1. 파일 변경(.omo 세션 추가, HARNESS.md 편집, 위키 페이지 작성 등)을 자동 감지
2. `npm run wiki:index` 자동 실행
3. 시스템 재부팅 후에도 자동으로 백그라운드에서 동작
4. 자원을 너무 많이 먹지 않을 것 (8/5 데모 일정 보호)
5. macOS 네이티브 (사용자 언급: "launchpid를 써도 좋을 듯")

## Decision

**watchexec** + **launchd** 조합으로 백그라운드 파일 감시 데몬을 구축.

### 컴포넌트

| 컴포넌트 | 역할 | 비고 |
|---|---|---|
| `watchexec` (Rust) | 파일 시스템 이벤트 감시 + debounce + 명령 실행 | brew install watchexec (v2.5.1) |
| `launchd` (macOS native) | 백그라운드 데몬 관리, 시스템 시작 시 자동 실행, crash 시 재시작 | `~/Library/LaunchAgents/com.studyops.wiki-watcher.plist` |
| `watch.sh` | watchexec 실행 래퍼 — 감시 대상 + 명령 정의 | `docs/wiki/scripts/watch.sh` |
| `install-daemon.sh` | plist 생성 (PATH 추출), launchctl load | `npm run wiki:install-daemon` |

### 감시 대상 (입력)

- `.omo/run-continuation/**` — OpenCode 세션 상태 파일
- `HARNESS.md` — 실행 컨텍스트 계약서
- `docs/PRD-StudyOps-Bot.md`, `docs/ARCHITECTURE.md`
- `docs/wiki/src/content/{episodes,decisions,qa}/` — 수동 위키 페이지

### 감시 제외 (무한 루프 방지, 핵심)

- `docs/wiki/src/content/sessions/` — index 스크립트의 **출력 디렉토리**. 감시하면 자기 쓰기를 다시 감지해 무한 루프 발생 (실제로 발견된 버그).
- `docs/wiki/src/content/changelog/` — Phase 2에서 자동 생성될 예정, 동일한 이유로 제외.
- `docs/wiki/public/` — 인덱싱이 복사하는 레거시 QA PNG.

### 실행 명령

```bash
watchexec -w <경로들> --debounce 1000 --postpone npm run index
```

- `--debounce 1000`: 1초 안에 여러 이벤트를 하나로 묶음 (연속 저장에 1번만 실행)
- `--postpone`: 시작 시 즉시 실행하지 않고 첫 이벤트까지 대기

### launchd 설정 핵심

```xml
<key>RunAtLoad</key><true/>             <!-- 로그인 시 자동 시작 -->
<key>KeepAlive</key>
<dict>
  <key>SuccessfulExit</key><false/>     <!-- 비정상 종료만 재시작 -->
</dict>
<key>ThrottleInterval</key><integer>5> <!-- 재시작 간 최소 5초 -->
<key>ProcessType</key><string>Background</string>
```

- launchd는 로그인 셸 환경을 상속하지 않으므로 `PATH`를 plist에 명시적으로 박아야 함
- `install-daemon.sh`가 `bash -lc 'echo $PATH'`로 사용자 PATH를 추출해 plist에 치환

## Consequences

### 긍정
- 0 설정으로 항상 최신 위키 — 사용자가 `wiki:index`를 잊어도 됨
- macOS 재부팅 후 자동 복구 (launchd RunAtLoad)
- crash 시 자동 재시작 (KeepAlive)
- 자원 효율적 — watchexec는 FSEvents API를 써서 폴링 없이 이벤트 기반
- dev 서버(`wiki:dev`)가 떠 있으면 Astro가 위키 페이지를 자동 re-sync (HMR)

### 부정
- macOS 전용 (launchd) — Linux/Windows에선 다른 솔루션 필요 (systemd / Task Scheduler)
- launchd 환경의 PATH 관리 — install 스크립트가 추출하지 않으면 watchexec를 못 찾음
- `sessions/` 같은 자동 생성 디렉토리는 감시에서 제외됨 → 사용자가 직접 편집해도 watcher가 감지 못 함. 이 경우 `wiki:index` 수동 실행 필요.

### 발견된 버그 (해결됨)

초기 구현에서 `sessions/` 와 `changelog/` 를 감시 대상에 포함했더니, index 스크립트가 파일을 쓸 때마다 watchexec가 그 변경을 감지해 다시 index를 실행하는 **무한 루프**에 빠짐. 로그에 13번 연속 실행이 기록됨.

해결: 자동 생성 디렉토리를 `-w`에서 제외. `watch.sh` 코멘트로 이유 명시.

## Alternatives Considered

### chokidar (Node.js 파일 감시)
- **장점**: npm 의존성만으로 cross-platform, Astro와 같은 런타임
- **단점**: 새 의존성 추가 → HARNESS §4 #8 (ADR 필요). Node 프로세스로 항상 떠 있어야 해서 자원 소모가 watchexec보다 큼.
- **기각 이유**: 외부 도구(watchexec)가 더 가볍고 안정적. macOS native 감시 API 사용.

### Astro 자체 HMR에 의존
- **장점**: 추가 도구 없음. Astro가 `src/content/` 안은 자동 감시
- **단점**: `.omo/run-continuation/`, 루트 `qa-*.png` 같이 wiki 프로젝트 밖의 파일을 감시 못 함
- **기auction 이유**: 외부 데이터 소스가 핵심 가치. 자동화가 의미 없음.

### git post-commit hook
- **장점**: 가장 단순, 별도 프로세스 없음
- **단점**: 커밋해야만 동작. 저장하지 않는 변경은 stale. 커밋 실패 시 자동화 실패.
- **기각 이유**: 실시간성 부족. 다음 단계 (Phase 3)에서 보조로 추가할 수는 있음.

## References

- `docs/wiki/scripts/watch.sh` — watchexec 실행 래퍼
- `docs/wiki/scripts/com.studyops.wiki-watcher.plist` — launchd 에이전트 템플릿
- `docs/wiki/scripts/install-daemon.sh` — 설치 스크립트 (PATH 추출, plist 치환, launchctl load)
- watchexec docs: https://watchexec.github.io/docs/
- launchd docs: https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html
