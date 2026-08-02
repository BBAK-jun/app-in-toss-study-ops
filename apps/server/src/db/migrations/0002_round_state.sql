-- Round 상태 ADT(Open | Closed) 영속화를 위한 컬럼 추가.
-- 기존 행은 status 기본값 'open' → OpenRound 가 된다.
-- (logs 테이블 재생성은 drizzle 의 사전 snapshot drift 로 발생한 노이즈라 제거함 —
--  별도 마이그레이션으로 정리 권장.)
ALTER TABLE `rounds` ADD `status` text DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE `rounds` ADD `closed_at` integer;
