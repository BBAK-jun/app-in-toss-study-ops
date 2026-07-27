// 클라이언트 테스트 글로벌 setup — indexedDB를 fake-indexeddb로 교체.
// 브라우저 전용 API(console 그대로, fetch는 Vitest 기본 mock)만 보강.
import 'fake-indexeddb/auto';
