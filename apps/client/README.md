# studyops-client

StudyOps Bot MVP 의 Apps-in-Toss WebView 클라이언트. Vite + React 18 + `@toss/tds-mobile`.

## 실행

```bash
# 루트에서 최초 1회
npm install

# 개발 서버 (포트 5173) — apps/server(wrangler dev, 8787) 와 함께 띄운다.
npm run dev -w apps/client
```

## 환경변수

- `VITE_API_BASE_URL` — API 서버 베이스 URL. 기본 `http://localhost:8787`.
  값을 비우면 Vite proxy(같은 출처 `/auth`, `/studies`, `/rounds` → 8787)를 사용한다.

## 주요 구성

| 파일 | 역할 |
|---|---|
| `granite.config.ts` | Apps-in-Toss 웹앱 메타(`defineConfig`) |
| `vite.config.ts` | Vite + React, shared alias, /auth·/studies·/rounds 프록시 |
| `src/main.tsx` | `TDSMobileAITProvider` → `SessionProvider` → `BrowserRouter` → `App` |
| `src/api/client.ts` | `apiFetch` (Bearer 토큰 주입) + `ApiError` + 토큰(sessionStorage) |
| `src/context/SessionContext.tsx` | 세션(토큰=sessionStorage, user=메모리). localStorage 미사용 |
| `src/pages/*` | 로그인 / 스터디 목록·상세 / 회차 상세 / 제출 등록 / 리마인드 |

## 세션 정책 (토스)

- `sessionToken` → `sessionStorage`(앱/탱 생명주기)
- `user` → React Context 메모리 전용
- `localStorage` 사용 금지

## 빌드

```bash
npm run build -w apps/client   # tsc --noEmit && vite build → dist/
```
