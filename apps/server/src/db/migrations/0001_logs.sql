-- ADR-011: Logging Architecture. 서버/클라이언트 로그 영속 저장소 (Tier 2).
-- 인덱스 전략: ts(기본 정렬), level+ts, event+ts, user_id+ts, session_id, request_id.
-- D1 write 한도(100k/day) 때문에 클라이언트 로그는 서버에서 배치 INSERT로 적재.
CREATE TABLE `logs` (
	`id` integer PRIMARY KEY NOT NULL,
	`ts` integer NOT NULL,
	`level` text NOT NULL,
	`source` text NOT NULL,
	`event` text NOT NULL,
	`message` text NOT NULL,
	`user_id` integer,
	`session_id` text,
	`request_id` text,
	`method` text,
	`path` text,
	`status` integer,
	`duration_ms` integer,
	`context` text,
	`stack` text,
	`env` text NOT NULL,
	`version` text,
	`user_agent` text,
	`ip_hash` text
);
--> statement-breakpoint
CREATE INDEX `idx_logs_ts` ON `logs` (`ts` DESC);--> statement-breakpoint
CREATE INDEX `idx_logs_level_ts` ON `logs` (`level`,`ts` DESC);--> statement-breakpoint
CREATE INDEX `idx_logs_event_ts` ON `logs` (`event`,`ts` DESC);--> statement-breakpoint
CREATE INDEX `idx_logs_user_ts` ON `logs` (`user_id`,`ts` DESC);--> statement-breakpoint
CREATE INDEX `idx_logs_session` ON `logs` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_logs_request` ON `logs` (`request_id`);
