// Vitest 글로벌 setup — 클라이언트 테스트에서 indexedDB를 fake-indexeddb로 교체.
// server-only 테스트 파일에서는 이게 로드되어도 영향 없음 (브라우저 API 안 쓰면).
import 'fake-indexeddb/auto';

// Workers 환경 글로벌 보강 — crypto.randomUUID, executionCtx.waitUntil 등은
// 각 테스트에서 mock으로 주입. 여기서는 글로벌 폴리필만.
