-- ============================================================
-- seed-writing-club.sql
-- hanghae-story-forge 글쓰기 모임 GitHub Issue → D1 시드 데이터
-- 생성: 2026-07-26T10:19:21.547Z
-- 소스: hanghae-story-forge/archive, hanghae-story-forge/notification
--
-- 적용 (로컬 dev DB):
--   npx wrangler d1 execute studyops-db-dev --local \
--     --file=apps/server/scripts/output/seed-writing-club.sql
--
-- 재실행 안전: INSERT OR REPLACE. 결정론적 ID 사용.
-- ============================================================

-- wrangler d1 execute --file 이 자체적으로 트랜잭션을 잡으므로
-- BEGIN/COMMIT 은 넣지 않는다 (nested transaction 방지).

-- ─── users ─────────────────────────────────────────────
-- dev 모드에서는 인가코드 dev-<user_key>로 로그인 가능.
INSERT OR REPLACE INTO users (user_key, display_name, created_at) VALUES (1001, '박준형', 0);
INSERT OR REPLACE INTO users (user_key, display_name, created_at) VALUES (1002, 'BangDori', 0);
INSERT OR REPLACE INTO users (user_key, display_name, created_at) VALUES (1003, 'JungWoo0203', 0);
INSERT OR REPLACE INTO users (user_key, display_name, created_at) VALUES (1004, '이의찬', 0);
INSERT OR REPLACE INTO users (user_key, display_name, created_at) VALUES (1005, '윤영서', 0);
INSERT OR REPLACE INTO users (user_key, display_name, created_at) VALUES (1006, '김지혜', 0);
INSERT OR REPLACE INTO users (user_key, display_name, created_at) VALUES (1007, '이은지', 0);
INSERT OR REPLACE INTO users (user_key, display_name, created_at) VALUES (1008, '아름', 0);
INSERT OR REPLACE INTO users (user_key, display_name, created_at) VALUES (1009, '여찬규', 0);
INSERT OR REPLACE INTO users (user_key, display_name, created_at) VALUES (1010, 'ChangJun Park', 0);
INSERT OR REPLACE INTO users (user_key, display_name, created_at) VALUES (1011, 'CharlieJin', 0);
INSERT OR REPLACE INTO users (user_key, display_name, created_at) VALUES (1012, 'eve', 0);
INSERT OR REPLACE INTO users (user_key, display_name, created_at) VALUES (1013, 'jungseok.heo', 0);
INSERT OR REPLACE INTO users (user_key, display_name, created_at) VALUES (1014, 'HYOJIN', 0);
INSERT OR REPLACE INTO users (user_key, display_name, created_at) VALUES (1015, 'Dahm', 0);
INSERT OR REPLACE INTO users (user_key, display_name, created_at) VALUES (1016, 'Doeun', 0);
INSERT OR REPLACE INTO users (user_key, display_name, created_at) VALUES (1017, 'Kim Wonpyo', 0);
INSERT OR REPLACE INTO users (user_key, display_name, created_at) VALUES (1018, '진돌', 0);
INSERT OR REPLACE INTO users (user_key, display_name, created_at) VALUES (1019, 'Ga eun Lee', 0);
INSERT OR REPLACE INTO users (user_key, display_name, created_at) VALUES (1020, '권지호', 0);
INSERT OR REPLACE INTO users (user_key, display_name, created_at) VALUES (1021, 'yuhyeon99', 0);

-- ─── studies ───────────────────────────────────────────
INSERT OR REPLACE INTO studies (id, owner_id, title, description, discord_webhook_url, created_at) VALUES
  ('study_writing_club_g1', 1001, '글쓰기 모임 1기', '2주 단위로 글/이력서/산출물을 쓰고 서로 리뷰하는 개발자 글쓰기 모임', NULL, 0);
INSERT OR REPLACE INTO studies (id, owner_id, title, description, discord_webhook_url, created_at) VALUES
  ('study_writing_club_g2', 1001, '글쓰기 모임 2기', '2주 단위로 글/이력서/산출물을 쓰고 서로 리뷰하는 개발자 글쓰기 모임', NULL, 0);
INSERT OR REPLACE INTO studies (id, owner_id, title, description, discord_webhook_url, created_at) VALUES
  ('study_writing_club_g3', 1001, '글쓰기 모임 3기', '2주 단위로 글/이력서/산출물을 쓰고 서로 리뷰하는 개발자 글쓰기 모임', NULL, 0);

-- ─── participants ──────────────────────────────────────
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g1_BBAK-jun', 'study_writing_club_g1', '박준형', 'BBAK-jun', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g1_BangDori', 'study_writing_club_g1', 'BangDori', 'BangDori', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g1_JungWoo0203', 'study_writing_club_g1', 'JungWoo0203', 'JungWoo0203', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g1_Legitgoons', 'study_writing_club_g1', '이의찬', 'Legitgoons', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g1_YeongseoYoon', 'study_writing_club_g1', '윤영서', 'YeongseoYoon', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g1_adds9810', 'study_writing_club_g1', '김지혜', 'adds9810', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g1_angielxx', 'study_writing_club_g1', '이은지', 'angielxx', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g1_areumH', 'study_writing_club_g1', '아름', 'areumH', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g1_chan9yu', 'study_writing_club_g1', '여찬규', 'chan9yu', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g1_ckdwns9121', 'study_writing_club_g1', 'ChangJun Park', 'ckdwns9121', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g1_devchaeyoung', 'study_writing_club_g1', 'CharlieJin', 'devchaeyoung', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g1_eveneul', 'study_writing_club_g1', 'eve', 'eveneul', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g1_heojungseok', 'study_writing_club_g1', 'jungseok.heo', 'heojungseok', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g1_hyojin-k', 'study_writing_club_g1', 'HYOJIN', 'hyojin-k', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g1_j2h30728', 'study_writing_club_g1', 'Dahm', 'j2h30728', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g1_nemobim', 'study_writing_club_g1', 'Doeun', 'nemobim', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g1_pitangland', 'study_writing_club_g1', 'Kim Wonpyo', 'pitangland', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g1_realstone2', 'study_writing_club_g1', '진돌', 'realstone2', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g1_tooth-is-silver', 'study_writing_club_g1', 'Ga eun Lee', 'tooth-is-silver', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g1_xxziiko', 'study_writing_club_g1', '권지호', 'xxziiko', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g1_yuhyeon99', 'study_writing_club_g1', 'yuhyeon99', 'yuhyeon99', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g2_BBAK-jun', 'study_writing_club_g2', '박준형', 'BBAK-jun', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g2_BangDori', 'study_writing_club_g2', 'BangDori', 'BangDori', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g2_JungWoo0203', 'study_writing_club_g2', 'JungWoo0203', 'JungWoo0203', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g2_Legitgoons', 'study_writing_club_g2', '이의찬', 'Legitgoons', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g2_YeongseoYoon', 'study_writing_club_g2', '윤영서', 'YeongseoYoon', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g2_adds9810', 'study_writing_club_g2', '김지혜', 'adds9810', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g2_angielxx', 'study_writing_club_g2', '이은지', 'angielxx', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g2_areumH', 'study_writing_club_g2', '아름', 'areumH', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g2_chan9yu', 'study_writing_club_g2', '여찬규', 'chan9yu', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g2_ckdwns9121', 'study_writing_club_g2', 'ChangJun Park', 'ckdwns9121', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g2_devchaeyoung', 'study_writing_club_g2', 'CharlieJin', 'devchaeyoung', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g2_eveneul', 'study_writing_club_g2', 'eve', 'eveneul', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g2_heojungseok', 'study_writing_club_g2', 'jungseok.heo', 'heojungseok', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g2_hyojin-k', 'study_writing_club_g2', 'HYOJIN', 'hyojin-k', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g2_j2h30728', 'study_writing_club_g2', 'Dahm', 'j2h30728', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g2_nemobim', 'study_writing_club_g2', 'Doeun', 'nemobim', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g2_pitangland', 'study_writing_club_g2', 'Kim Wonpyo', 'pitangland', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g2_realstone2', 'study_writing_club_g2', '진돌', 'realstone2', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g2_tooth-is-silver', 'study_writing_club_g2', 'Ga eun Lee', 'tooth-is-silver', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g2_xxziiko', 'study_writing_club_g2', '권지호', 'xxziiko', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g2_yuhyeon99', 'study_writing_club_g2', 'yuhyeon99', 'yuhyeon99', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g3_BBAK-jun', 'study_writing_club_g3', '박준형', 'BBAK-jun', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g3_BangDori', 'study_writing_club_g3', 'BangDori', 'BangDori', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g3_JungWoo0203', 'study_writing_club_g3', 'JungWoo0203', 'JungWoo0203', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g3_Legitgoons', 'study_writing_club_g3', '이의찬', 'Legitgoons', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g3_YeongseoYoon', 'study_writing_club_g3', '윤영서', 'YeongseoYoon', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g3_adds9810', 'study_writing_club_g3', '김지혜', 'adds9810', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g3_angielxx', 'study_writing_club_g3', '이은지', 'angielxx', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g3_areumH', 'study_writing_club_g3', '아름', 'areumH', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g3_chan9yu', 'study_writing_club_g3', '여찬규', 'chan9yu', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g3_ckdwns9121', 'study_writing_club_g3', 'ChangJun Park', 'ckdwns9121', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g3_devchaeyoung', 'study_writing_club_g3', 'CharlieJin', 'devchaeyoung', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g3_eveneul', 'study_writing_club_g3', 'eve', 'eveneul', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g3_heojungseok', 'study_writing_club_g3', 'jungseok.heo', 'heojungseok', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g3_hyojin-k', 'study_writing_club_g3', 'HYOJIN', 'hyojin-k', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g3_j2h30728', 'study_writing_club_g3', 'Dahm', 'j2h30728', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g3_nemobim', 'study_writing_club_g3', 'Doeun', 'nemobim', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g3_pitangland', 'study_writing_club_g3', 'Kim Wonpyo', 'pitangland', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g3_realstone2', 'study_writing_club_g3', '진돌', 'realstone2', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g3_tooth-is-silver', 'study_writing_club_g3', 'Ga eun Lee', 'tooth-is-silver', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g3_xxziiko', 'study_writing_club_g3', '권지호', 'xxziiko', 0);
INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES
  ('part_g3_yuhyeon99', 'study_writing_club_g3', 'yuhyeon99', 'yuhyeon99', 0);

-- ─── rounds ────────────────────────────────────────────
INSERT OR REPLACE INTO rounds (id, study_id, round_number, title, due_at, created_at) VALUES
  ('round_g1_1', 'study_writing_club_g1', 1, '1회차(9월 28일 ~ 10월 11일)', 1760194799000, 1757855718000);
INSERT OR REPLACE INTO rounds (id, study_id, round_number, title, due_at, created_at) VALUES
  ('round_g1_2', 'study_writing_club_g1', 2, '2회차(10월12일 ~ 10월26일)', 1761490799000, 1760055984000);
INSERT OR REPLACE INTO rounds (id, study_id, round_number, title, due_at, created_at) VALUES
  ('round_g1_3', 'study_writing_club_g1', 3, '3회차(10월27일 ~ 11월9일)', 1762700399000, 1760055921000);
INSERT OR REPLACE INTO rounds (id, study_id, round_number, title, due_at, created_at) VALUES
  ('round_g1_4', 'study_writing_club_g1', 4, '4회차(11월10일 ~ 11월 23일)', 1763909999000, 1760056025000);
INSERT OR REPLACE INTO rounds (id, study_id, round_number, title, due_at, created_at) VALUES
  ('round_g1_5', 'study_writing_club_g1', 5, '5회차(11월 24일 ~ 12월 07일)', 1765119599000, 1761491273000);
INSERT OR REPLACE INTO rounds (id, study_id, round_number, title, due_at, created_at) VALUES
  ('round_g1_6', 'study_writing_club_g1', 6, '6회차(12월 08일 ~ 12월 21일)', 1766329199000, 1761491342000);
INSERT OR REPLACE INTO rounds (id, study_id, round_number, title, due_at, created_at) VALUES
  ('round_g1_7', 'study_writing_club_g1', 7, '7회차(12월 22일 ~ 01월 04일)', 1767538799000, 1761491378000);
INSERT OR REPLACE INTO rounds (id, study_id, round_number, title, due_at, created_at) VALUES
  ('round_g1_8', 'study_writing_club_g1', 8, '8회차(01월 05일 ~ 01월 18일)', 1768748399000, 1761491412000);
INSERT OR REPLACE INTO rounds (id, study_id, round_number, title, due_at, created_at) VALUES
  ('round_g2_2', 'study_writing_club_g2', 2, '2회차(01월 16일 ~ 03월 01일)', 1772377199000, 1767319255000);
INSERT OR REPLACE INTO rounds (id, study_id, round_number, title, due_at, created_at) VALUES
  ('round_g2_1', 'study_writing_club_g2', 1, '1회차(02월 02일 ~ 02월 15일)', 1771167599000, 1767319228000);
INSERT OR REPLACE INTO rounds (id, study_id, round_number, title, due_at, created_at) VALUES
  ('round_g2_3', 'study_writing_club_g2', 3, '3회차(03월 02일 ~ 03월 15일)', 1773586799000, 1767319273000);
INSERT OR REPLACE INTO rounds (id, study_id, round_number, title, due_at, created_at) VALUES
  ('round_g2_4', 'study_writing_club_g2', 4, '4회차(03월 16일 ~ 03월 29일)', 1774796399000, 1767319292000);
INSERT OR REPLACE INTO rounds (id, study_id, round_number, title, due_at, created_at) VALUES
  ('round_g2_5', 'study_writing_club_g2', 5, '5회차(03월 30일 ~ 04월 12일)', 1776005999000, 1767319313000);
INSERT OR REPLACE INTO rounds (id, study_id, round_number, title, due_at, created_at) VALUES
  ('round_g2_6', 'study_writing_club_g2', 6, '6회차(04월 13일 ~ 04월 26일)', 1777215599000, 1767319330000);
INSERT OR REPLACE INTO rounds (id, study_id, round_number, title, due_at, created_at) VALUES
  ('round_g2_7', 'study_writing_club_g2', 7, '7회차(04월 27일 ~ 05월 10일)', 1778425199000, 1767319347000);
INSERT OR REPLACE INTO rounds (id, study_id, round_number, title, due_at, created_at) VALUES
  ('round_g2_8', 'study_writing_club_g2', 8, '8회차(05월 11일 ~ 05월 24일)', 1779634799000, 1767319374000);
INSERT OR REPLACE INTO rounds (id, study_id, round_number, title, due_at, created_at) VALUES
  ('round_g3_1', 'study_writing_club_g3', 1, '1회차(06월 08일 ~ 06월 21일)', 1782053999000, 1782090844000);
INSERT OR REPLACE INTO rounds (id, study_id, round_number, title, due_at, created_at) VALUES
  ('round_g3_2', 'study_writing_club_g3', 2, '2회차(06월 22일 ~ 07월 05일)', 1783263599000, 1782090903000);
INSERT OR REPLACE INTO rounds (id, study_id, round_number, title, due_at, created_at) VALUES
  ('round_g3_3', 'study_writing_club_g3', 3, '3회차(07월 6일 ~ 07월 19일)', 1784473199000, 1783241285000);
INSERT OR REPLACE INTO rounds (id, study_id, round_number, title, due_at, created_at) VALUES
  ('round_g3_4', 'study_writing_club_g3', 4, '4회차(07월 20일 ~ 08월 02일)', 1785682799000, 1779728059000);
INSERT OR REPLACE INTO rounds (id, study_id, round_number, title, due_at, created_at) VALUES
  ('round_g3_5', 'study_writing_club_g3', 5, '5회차(08월 03일 ~ 08월 16일)', 1786892399000, 1779728064000);
INSERT OR REPLACE INTO rounds (id, study_id, round_number, title, due_at, created_at) VALUES
  ('round_g3_6', 'study_writing_club_g3', 6, '6회차(08월 17일 ~ 08월 30일)', 1788101999000, 1779728068000);
INSERT OR REPLACE INTO rounds (id, study_id, round_number, title, due_at, created_at) VALUES
  ('round_g3_7', 'study_writing_club_g3', 7, '7회차(08월 31일 ~ 09월 13일)', 1789311599000, 1779728073000);
INSERT OR REPLACE INTO rounds (id, study_id, round_number, title, due_at, created_at) VALUES
  ('round_g3_8', 'study_writing_club_g3', 8, '8회차(09월 14일 ~ 09월 27일)', 1790521199000, 1779728077000);

-- ─── submissions ───────────────────────────────────────
-- 같은 회차+참여자가 여러 번 제출한 경우 마지막 제출이 유효.
-- (UNIQUE(round_id, participant_id) 제약 + OR REPLACE)
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_1__xxziiko', 'round_g1_1', 'part_g1_xxziiko', 'https://velog.io/@xxziiko/EC2-%EC%84%9C%EB%B2%84-%EB%8B%A4%EC%9A%B4%EB%B6%80%ED%84%B0-%EC%84%B1%EB%8A%A5-%EC%B5%9C%EC%A0%81%ED%99%94%EA%B9%8C%EC%A7%80', '똥글 투척합니다 💩💩
💬 Vercel 배포를 걷어내고 EC2 서버로 구축하는 과정에서 발생했던 트러블 슈팅을 기록해 봤습니다.
링크: [EC2 서버 다운부터 성능 최적화까지]()', 1759237248000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_1__heojungseok', 'round_g1_1', 'part_g1_heojungseok', 'https://github.com/user-attachments/files/22706921/_.pdf', 'AS-IS**: 짜치는 이력서 ㅎㅎㅎ
[프로필_허정석.pdf]()
TO-BE**: 수정된 이력 초안', 1759652748000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_1__areumH', 'round_g1_1', 'part_g1_areumH', 'https://velog.io/@areumh__9/%ED%95%AD%ED%95%B4-%ED%94%8C%EB%9F%AC%EC%8A%A4-%ED%94%84%EB%A1%A0%ED%8A%B8%EC%97%94%EB%93%9C-6%EA%B8%B0-%EC%88%98%EB%A3%8C-%ED%9B%84%EA%B8%B0', '뒤늦게 항해 수료 후기 올려봅니다.. ㅎㅎ
링크: [항해 플러스 프론트엔드 6기 수료 후기 - 취준생 나부랭이의 항해 도전기]()', 1759683349000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_1__BangDori', 'round_g1_1', 'part_g1_BangDori', 'https://www.bangdori.kr/blog/composite-action', '링크: [Composite action으로 Custom Action 만들기]()
---
Agentic 시대가 오면서 문서 정리나 작성이 정~말 쉬워져서 크고 작은 프로젝트에서 AI에 MCP 서버를 연동해서 PRD 문서나 Task들을 Github 이슈로 관리하는 경우가 많더라구요. 그러다보니 자연스럽게 이슈 관리가 복잡해지는 문제가 있더라구요.
예를 들어,
1. PR에서 ai로 이슈 생성 (ex. 을 이용하여 PR에서 ai 트리거로 이슈 생성) -> PR 머지 -> 이슈도 자동으로 닫힘 (reopen 필요 -> 귀찮음+1)
2. main을 default 브랜치로 설정한 경우 -> develop에 머지해도 이슈가 안 닫힘 -> main까지 가야 닫힘 (이슈가 일시적으로 방치 -> 거슬림 + 1)
등등 이런 케이스들이 쌓이면 결국 하나하나 수동으로 체킹하고 closed 처리하게 되는데 이게 생각보다 귀찮더라구요. 그래서 이슈를 자동으로 관리해주는 Github Actions를 만들어봤습니다', 1759772564000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_1__tooth-is-silver', 'round_g1_1', 'part_g1_tooth-is-silver', 'https://velog.io/@hying/내가-쓴-글-다듬는-법-배우기-내-문장이-그렇게-이상한가요', '독후감 썼습니다!
링크', 1759994236000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_1__YeongseoYoon', 'round_g1_1', 'part_g1_YeongseoYoon', 'https://yeongseo-blog.netlify.app/blog/til/webworker-offscreencanvas', '일단 급한대로 netlify로 배포해서...급한불은 껐습니다...이관해야할듯...
암튼 webworker와 canvas관련해서 궁금해져서 글을 써봤습니다', 1760086607000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_1__realstone2', 'round_g1_1', 'part_g1_realstone2', 'https://github.com/user-attachments/files/22852684/_.pdf', '이제 이력서 그만 쓰고 싶어요..
그치만 언제나 피드백 환영입니다.,.
AS-IS 
[여진석_레거시.pdf]()
TO-BE', 1760108426000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_1__BBAK-jun', 'round_g1_1', 'part_g1_BBAK-jun', 'https://www.dev-bbak.site/blog/DEV/html-serialize', 'SSR에서 `renderToString()`과 `renderToPipeableStream()`이 왜 무거운지, HTML 직렬화가 Node.js 이벤트 루프를 어떻게 블로킹하는지 파헤쳐본 글입니다.
Next.js로 SSR 쓰고 계시다면 성능 병목 지점과 해결 방향을 한눈에 이해하실 수 있을 거예요!
링크', 1760118085000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_1__j2h30728', 'round_g1_1', 'part_g1_j2h30728', 'https://velog.io/@rachel28/hanghae-6', '갓글 사이에 💩글 투척~ 항해 6기 회고글 작성했습니다.
링크 [항해 플러스 프론트 6기 회고]()', 1760123698000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_1__pitangland', 'round_g1_1', 'part_g1_pitangland', 'https://pitangland.tistory.com/172', '아주 늦어버린 학습메이트 활동 회고..
[학습메이트 회고...]()', 1760126247000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_1__ckdwns9121', 'round_g1_1', 'part_g1_ckdwns9121', 'https://changjunblog.vercel.app/posts/--2892acd72313803388fdd4e7df89df1e', '저는 이번에 블로그 만들었던 과정을 적어보았습니다.~
[개인 블로그를 만들면서 배운 것들]()', 1760182425000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_1__nemobim', 'round_g1_1', 'part_g1_nemobim', 'https://peripheral-nerv.tistory.com/m/entry/%EC%9A%B0%EC%95%84%ED%95%9C-%ED%83%80%EC%9E%85-%EC%8A%A4%ED%81%AC%EB%A6%BD%ED%8A%B8-with-%EB%A6%AC%EC%95%A1%ED%8A%B8-%ED%83%80%EC%9E%85', '새로운 글을 쓰려고 했지만 일단 급한 불부터 끄기 😅
똥글 기간 동안 썼던 책 정리글을 올립니다.
링크:**  
[우아한 타입 2장]()', 1760185463000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_1__chan9yu', 'round_g1_1', 'part_g1_chan9yu', 'https://www.chan9yu.dev/posts/webrtc-deepdive-01', '블로그를 만들고 써본 첫번째 똥글입니다~  (블로그도 많이 구경해주세염)
회사에서 메인으로 쓰고있는 WebRTC에 대해 정리해봤는데 내용이 너무많아서 3~4편으로 쪼개야될 거 같네용 ㅎㅎ 
1편은 개념위주로 정리해보았습니당
[[WebRTC 박살내기] WebRTC 개념과 연결 구조 완전 정리]()', 1760189253000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_1__hyojin-k', 'round_g1_1', 'part_g1_hyojin-k', 'https://www.notion.so/2694ef530690802793d3c819c1b8848a?source=copy_link', '기존 프로젝트 나열 형식의 이력서에서 형식 변경해서 수정해보았습니다.
완성본은 아니고 좀 더 손을 봐야할 것 같습니다... 피드백도 언제든 환영!
기존 : [김효진이력서_v1]()
v2 :', 1760190868000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_1__Legitgoons', 'round_g1_1', 'part_g1_Legitgoons', 'https://cksxkr5193.tistory.com/88', '회사에서 대용량 데이터를 그래프로 그리면서 발생했던 문제를 해결한 내용을 작성해보았습니다!
[Carpet 그래프에서의 인터렉션 블로킹 문제 해결하기]()', 1760191784000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_1__angielxx', 'round_g1_1', 'part_g1_angielxx', 'https://more-than-better.tistory.com/9', '스터디 첫주차를 위해(?) 미뤄왔던 항해 최종 회고 끼려왔습니다. 많관부
[항해 플러스 프론트엔드 6기 최종 회고]()', 1760193235000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_1__adds9810', 'round_g1_1', 'part_g1_adds9810', 'https://soa-memo.tistory.com/69', '원래 적으려던 글을 회고글이었는데.... 
사이드 프로젝트에 사용한 Gemini API 모델이 중단되면서 에러가 발생해 삽질한 내용을 적어봤습니다.
제 글이 제일 똥글일듯ㅜ
[Gemini API 405, 505 오류 해결과정 기록]()', 1760193877000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_1__devchaeyoung', 'round_g1_1', 'part_g1_devchaeyoung', 'https://devchaeyoung.tistory.com/entry/%ED%95%AD%ED%95%B4%ED%94%8C%EB%9F%AC%EC%8A%A4-6%EA%B8%B0-%ED%95%99%EC%8A%B5%EB%A9%94%EC%9D%B4%ED%8A%B8-%ED%9A%8C%EA%B3%A0%EB%9D%BC-%EC%93%B0%EA%B3%A0-A-Z-%EA%B8%B0%EB%A1%9D%EC%9D%B4%EB%9D%BC%EA%B3%A0-%EB%B6%80%EB%A5%B8%EB%8B%A4', '항해 회고 아닌 기록 포스팅입니당
[항해 6기 학메 회고]()', 1760194557000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_2__Legitgoons', 'round_g1_2', 'part_g1_Legitgoons', 'https://cksxkr5193.tistory.com/120', '진짜 쫌 많이 늦게 회고글 올립니당
링크: [항해를 마치며]()', 1760218202000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_2__nemobim', 'round_g1_2', 'part_g1_nemobim', 'https://peripheral-nerv.tistory.com/manage/posts/', '저도 회고글 썼습니다
링크: [mz한 항해 수료 후기]()', 1760295913000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_2__areumH', 'round_g1_2', 'part_g1_areumH', 'https://velog.io/@areumh__9/Next.js%EB%A1%9C-%EB%B8%94%EB%A1%9C%EA%B7%B8-%EB%A7%8C%EB%93%A4%EA%B8%B0-%ED%9A%8C%EA%B3%A0', '개인 블로그 만들기 회고 작성해보았습니다 !!
링크 : [Next.js로 블로그 만들기 회고]()', 1761046817000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_2__yuhyeon99', 'round_g1_2', 'part_g1_yuhyeon99', 'https://velog.io/@jujini31/Angular-EventListener-ChangeDetection-최적화', 'Angular를 사용한 서비스에서 CPU 사용률을 줄인 과정을 정리했습니다.
링크: [Angular 성능 개선: Change Detection의 숨은 비용]()', 1761122396000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_2__BangDori', 'round_g1_2', 'part_g1_BangDori', 'https://www.bangdori.kr/blog/ai-code-review', '- 
에고 주제 잡는데 일주일 걸리고 목차 정하는데 거의 반을 써서 드래프트로 제출해용', 1761239120000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_2__chan9yu', 'round_g1_2', 'part_g1_chan9yu', 'https://www.chan9yu.dev/posts/webrtc-deepdive-01', 'WebRTC 박살내기 시리즈 완결했슴다 고봉밥으로 만들어놨어요
(이론적인거는 다 정리된거 같구 미니 프로젝트 만들어봐서 그거에대한 글도 나중에 써볼께요!)
[WebRTC 박살내기] WebRTC 개념과 연결 구조 완전 정리
[WebRTC 박살내기] 미디어 스트림과 트랙 완벽 이해
[WebRTC 박살내기] PeerConnection API와 이벤트 흐름
[WebRTC 박살내기] 데이터 채널 구조와 활용법', 1761286405000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_2__ckdwns9121', 'round_g1_2', 'part_g1_ckdwns9121', 'https://www.changjun.dev/posts/--28d2acd72313804d9887c5682f438757', '저는 신입때 만든 개똥 컴포넌트 리팩토링하는 글 썼습니다..
글도 개똥이고 코드도 개똥', 1761291376000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_2__xxziiko', 'round_g1_2', 'part_g1_xxziiko', 'https://xxziiko.notion.site/2974ae05ecc780669889ccfc8f349ffd', '독후감이용
책: 결정적 순간의 대화', 1761416208000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_2__tooth-is-silver', 'round_g1_2', 'part_g1_tooth-is-silver', 'https://velog.io/@hying/우리는-항상-집단에-속해있다-집단의-힘', '집단의 힘 - 서평입니다!', 1761470929000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_2__BBAK-jun', 'round_g1_2', 'part_g1_BBAK-jun', 'https://www.dev-bbak.site/blog/DEV/splash-ux', '1) [스플래시 UX (하이브리드/네이티브 앱)]()
앱 시작 시 보여주는 스플래시의 역할(브랜드 인지·초기 상태 준비·지각된 성능 개선)과, 숨기는 ‘올바른 타이밍’을 정리합니다. 네이티브 런치 스크린과 웹 레이어(하이브리드)의 차이를 구분하고, 첫 의미 있는 렌더/상호작용 가능 시점과 연동하는 베스트 프랙티스를 제안합니다. 로딩 인디케이터·스켈레톤·프리로드 전략의 도/돈’t도 담겨 있어 실제 적용 가이드를 얻을 수 있습니다.
2) 
JSON.stringify가 싱글 스레드인 Node.js 이벤트 루프를 어떻게 막아버리는지, V8/Libuv 관점에서 이유를 설명합니다. 큰 객체 직렬화가 TTI/TTFB에 미치는 영향과 함께, 워커 스레드/스트리밍/청크 분할/캐싱 등 완화 전략을 소개하고 SSR의 HTML 직렬화가 무거운 이유와의 연결점도 짚습니다. “언제 메인 스레드를 쓰고, 언제 옮길 것인가”를 판단하는 실전 기준을 제공합니다.', 1761471152000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_2__YeongseoYoon', 'round_g1_2', 'part_g1_YeongseoYoon', 'https://www.notion.so/yeong-seo/298cf63c62d380e6aea2f838d5bd6b66?source=copy_link', '면접 공부한거예요', 1761477124000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_2__adds9810', 'round_g1_2', 'part_g1_adds9810', 'https://www.notion.so/2025-10-27-11-02-297162e19b13800db923e27869b4bf7f?source=copy_link', '믿거나 말거나 운세공부 연습삼아 적어봤습니다.', 1761487054000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_2__devchaeyoung', 'round_g1_2', 'part_g1_devchaeyoung', 'https://devchaeyoung.tistory.com/entry/%EC%84%B8%EC%85%98-%EC%BF%A0%ED%82%A4-%EB%B0%A9%EC%8B%9D%EC%97%90-%EB%94%B0%EB%A5%B8-%EB%A1%9C%EA%B7%B8%EC%9D%B8-%EB%8F%99%EC%9E%91-%EC%9D%B4%E3%85%8E', '세션, 쿠키 로그인 상태 공부한거 적어보았슴당 [세션 vs 쿠키 방식의 로그인 동작을 알아보자]()', 1761487676000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_2__j2h30728', 'round_g1_2', 'part_g1_j2h30728', 'https://guiltless-aftermath-169.notion.site/GitHub-Packages-298e8c228b6580eab22aff8fa2c70c77?source=copy_link', '아카이빙용으로 작성했어요.
[비공개 라이브러리를 GitHub Packages로 배포하기]()', 1761487779000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_2__pitangland', 'round_g1_2', 'part_g1_pitangland', 'https://pitangland.tistory.com/173', '스터디하고있는 책 내용 정리했는데 10/28 화요일 완성 예정입니다..
그래도 제출해보았습니다..
[대충 TCP/IP 이지만 그냥 보지마셔요..]()
담주 화에 시작한 글 마무리 하고,, 3회차때 글 하나 더 쓰겠습니다,,
화요일인 10/28 글 완료!!!!!!', 1761488650000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_2__hyojin-k', 'round_g1_2', 'part_g1_hyojin-k', 'https://www.figma.com/design/394L2d5Lxgi8X9qbcZqE7U/%ED%95%AD%ED%95%B46%EA%B8%B0_%EC%9D%B4%EB%A0%A5%EC%84%9C_%EC%B2%A8%EC%82%AD?node-id=0-1&p=f&t=dSUJHnCYe01HcJSr-0', '이번에도 이력서 수정으로 대체한다...
[이력쇼 피그마]()에 올려두었습니다.', 1761488889000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_3__yuhyeon99', 'round_g1_3', 'part_g1_yuhyeon99', 'https://velog.io/@jujini31/읽기Read와-쓰기Create-Update-Delete를-구분하는-FSD', 'FSD 아키텍처에 대해 살짝 다르게 접근한 영상을 보고 글로 정리해봤습니다.
링크: [읽기(Read)와 쓰기(Create, Update, Delete)를 구분하는 FSD]()', 1761567452000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_3__adds9810', 'round_g1_3', 'part_g1_adds9810', 'https://blog.naver.com/toto7971/224062518662', '개발 똥글을 못 썼을 때를 대비한 11월 2주차 주간운세 입니다.
[2025. 11. 3 ~ 9. 주간운세]()', 1762103728000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_3__pitangland', 'round_g1_3', 'part_g1_pitangland', 'https://pitangland.tistory.com/174', '책읽기 스터디와 함께한 똥글똥글
역시나.. 더 추가할 계획..
[HTTP/2 에 대해..]()', 1762347626000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_3__areumH', 'round_g1_3', 'part_g1_areumH', 'https://velog.io/@areumh__9/series/SQLD-%EC%9A%94%EC%95%BD-%EC%A0%95%EB%A6%AC', 'sqld 시험 공부 중입니다..ㅎㅎ 
링크 : [SQLD 요약 정리]()', 1762615548000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_3__tooth-is-silver', 'round_g1_3', 'part_g1_tooth-is-silver', 'https://velog.io/@hying/당신의-useEffect-안녕하신가요', '졸면서 써서 뭐라는지 모르겠네요
그냥 습득한 내용 주절주절 썼습니당', 1762629366000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_3__realstone2', 'round_g1_3', 'part_g1_realstone2', 'https://www.notion.so/29ef43437bda8013a267e12ca211e664?source=copy_link', '최근에 면접다니면서 질문 받았던 내용을 정리하였습니다.
다음에는 진짜로.. 기술블로그를 작성해보겠습니다..', 1762654839000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_3__YeongseoYoon', 'round_g1_3', 'part_g1_YeongseoYoon', 'https://github.com/reactjs/ko.react.dev/pull/1351#event-20765132051', 'Activity 번역글', 1762666905000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_3__ckdwns9121', 'round_g1_3', 'part_g1_ckdwns9121', 'https://www.changjun.dev/posts/--2a42acd723138006857dc46fe675d9b4', '최근 합류한 회사에서 일주일간 뻘짓(?)하며 도메인 이해도를 올리려는 글입니다', 1762680801000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_3__Legitgoons', 'round_g1_3', 'part_g1_Legitgoons', 'https://www.figma.com/design/394L2d5Lxgi8X9qbcZqE7U/%ED%95%AD%ED%95%B46%EA%B8%B0_%EC%9D%B4%EB%A0%A5%EC%84%9C_%EC%B2%A8%EC%82%AD?node-id=0-1&t=6sNJVXupQGdso84Y-1', '[이력서 업데이트 했습니다]()
<img width="2406" height="1608" alt="Image" src=" />', 1762691013000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_3__BBAK-jun', 'round_g1_3', 'part_g1_BBAK-jun', 'https://claude.ai/public/artifacts/28af32bb-0783-4200-ab81-153fee229ac2', '테오콘 1차 발표자료 제출입니다
- 대본 : 
- 피피티 :', 1762691546000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_3__j2h30728', 'round_g1_3', 'part_g1_j2h30728', 'https://blog.naver.com/2148072/224070064596', '부끄럽지만......10월 기록모음 글입니다.......
똥글답게 똥글 올립니다.
-', 1762691724000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_3__angielxx', 'round_g1_3', 'part_g1_angielxx', 'https://more-than-better.tistory.com/10', '2025 우아콘 후기
-', 1762696052000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_3__nemobim', 'round_g1_3', 'part_g1_nemobim', 'https://peripheral-nerv.tistory.com/entry/%EC%9A%B0%EC%95%84%ED%95%9C-%ED%83%80%EC%9E%85-%EC%8A%A4%ED%81%AC%EB%A6%BD%ED%8A%B8-with-%EB%A6%AC%EC%95%A1%ED%8A%B8-%ED%83%80%EC%9E%85-%ED%99%9C%EC%9A%A9%ED%95%98%EA%B8%B0', '우아한 타입 스터디 정리
[5장 타입 활용하기]()', 1762696243000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_3__chan9yu', 'round_g1_3', 'part_g1_chan9yu', 'https://www.chan9yu.dev/posts/react-core-deep-dive', '전사 세미나 발표를 준비하면서, 리액트의 내부 구조를 정리해봤습니다.
발표용 자료를 만들면서 블로그 글로도 함께 정리했습니다.
(1~3주차 과제 내용이랑 많이 겹쳐서 반가울듯)
- [리액트를 까본 사람 손 🙋 - Virtual DOM부터 Fiber까지]()
-', 1762698615000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_4__adds9810', 'round_g1_4', 'part_g1_adds9810', 'https://m.blog.naver.com/toto7971/224071672293', '덕분에 11월 동안 주간 운세 적어보고 있습니다.
[2025. 11. 11 ~ 16. 주간운세]()', 1762823414000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_4__yuhyeon99', 'round_g1_4', 'part_g1_yuhyeon99', 'https://velog.io/@jujini31/책-코딩-자율학습-네트워크-입문-리뷰', '책 리뷰를 썼습니다.
링크: [코딩 자율학습 네트워크 입문 리뷰]()', 1763636634000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_4__xxziiko', 'round_g1_4', 'part_g1_xxziiko', 'https://velog.io/@xxziiko/%EC%A1%B0%EA%B1%B4%EB%B6%80-%EB%A0%8C%EB%8D%94%EB%A7%81-%EC%A7%80%EC%98%A5%EC%97%90%EC%84%9C-%EB%B2%97%EC%96%B4%EB%82%98%EA%B8%B0', '리팩토링을 기록했습니다.
[조건문 지옥에서 벗어나기]()', 1763639025000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_4__chan9yu', 'round_g1_4', 'part_g1_chan9yu', 'https://www.linkedin.com/posts/chan9yu_react-uikrxktxuslwrgu-qzcstkspmrpuqlu-activity-7397273287266979841-YiH5?utm_source=share&utm_medium=member_desktop&rcm=ACoAADvvU3gBoYYLlYlv1gq65YLAiAlrkNEoIhI', '링띤에 사내 세미나 한 거 후기올렸습니다~
[[사내 세미나 후기] React 코어 딥다이브]()', 1763648449000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_4__heojungseok', 'round_g1_4', 'part_g1_heojungseok', 'https://github.com/user-attachments/files/23689741/_._.pdf', '이력서를 역량을 포함한 포맷으로 재 작성 해봤습니다...!
AS-IS:
[허 정석_프로젝트_중심.pdf]()
TO-BE:', 1763823207000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_4__areumH', 'round_g1_4', 'part_g1_areumH', 'https://github.com/user-attachments/files/23695023/-.Google.Docs.pdf', '이력서를 써보고 있어용...  [한아름 이력서]()', 1763893173000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_4__BBAK-jun', 'round_g1_4', 'part_g1_BBAK-jun', 'https://www.figma.com/slides/EY9eQKMxolfGL02wN95NqA/%EC%BF%A0%ED%82%A4%EB%A5%BC-%EA%B3%B5%EC%9C%A0%ED%95%98%EA%B3%A0%EC%8B%B6%EC%96%B4---%ED%85%8C%EC%98%A4%EC%BD%98?node-id=55-221&t=9AHcZJGz2vIWwkWo-1', '[테오콘 발표자료 만드는중]()', 1763900238000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_4__pitangland', 'round_g1_4', 'part_g1_pitangland', 'https://pitangland.tistory.com/m/175', '회고를 쓰고 있습니다.
비밀번호 MjAxMTQ2 이거긴 한데 뭐 굳이 안보셔도 돼여 헤헷
[비밀번호 없이 들어가지나 모르겐네](2025년 회고(드래프트) - )', 1763901684000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_4__YeongseoYoon', 'round_g1_4', 'part_g1_YeongseoYoon', 'https://www.notion.so/yeong-seo/pnpm-JavaScript-2b4cf63c62d3800cadb6c56c6b0ba55c?source=copy_link', '일단 초안입니다', 1763904948000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_4__BangDori', 'round_g1_4', 'part_g1_BangDori', 'https://www.bangdori.kr/blog/contributing-with-ai-automation', '[창의력을 발휘해서 메인 프로덕트에 기여하기]()', 1763906315000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_4__hyojin-k', 'round_g1_4', 'part_g1_hyojin-k', 'https://www.notion.so/2025-2b44ef530690808ebcd3fac789b67289?source=copy_link', '2025년 회고 진짜 별거없는 초안', 1763907554000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_4__realstone2', 'round_g1_4', 'part_g1_realstone2', 'https://jindol-blog-two.vercel.app/blog/2b4f43437bda8033a96cfea7b9d05e33?lang=ko', '양아치 같은 글 죄송합니다.
하지만 겸사 겸사 블로그 만든거 자랑할게요.', 1763907643000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_4__devchaeyoung', 'round_g1_4', 'part_g1_devchaeyoung', 'https://devchaeyoung.tistory.com/entry/SQLD-%EB%8D%B0%EC%9D%B4%ED%84%B0-%EB%AA%A8%EB%8D%B8%EB%A7%81', '[sql 공부한다고 요약한거]()..✩', 1763908077000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_4__Legitgoons', 'round_g1_4', 'part_g1_Legitgoons', 'https://github.com/user-attachments/files/23696351/default.pdf', '이력서 업뎃중인거 올립니당
- 핵심 역량 항목 수정 
- 새 프로젝트 작성 중
- cover letter 작성 중,,
[as-is]()', 1763908255000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_4__ckdwns9121', 'round_g1_4', 'part_g1_ckdwns9121', 'https://www.changjun.dev/posts/rag-mcp--2b42acd72313802bb485fafda747613f', '온보딩 RAG 구축하고 MCP로 만든거 회고 (작성중)
[똥글]()', 1763908636000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_4__nemobim', 'round_g1_4', 'part_g1_nemobim', 'https://peripheral-nerv.tistory.com/entry/%EC%9A%B0%EC%95%84%ED%95%9C-%ED%83%80%EC%9E%85-%EC%8A%A4%ED%81%AC%EB%A6%BD%ED%8A%B8-with-%EB%A6%AC%EC%95%A1%ED%8A%B8-7%EC%9E%A5-%EB%B9%84%EB%8F%99%EA%B8%B0-%ED%98%B8%EC%B6%9C', '### 타입스크립트 공부한거 적었습니다.
나중에 블로그 링크로 바꿀게요.. 일단 md 파일로 제출~~
블로그 주소로 변경 완료!
[7장 비동기 호출-1]()', 1763909104000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_4__tooth-is-silver', 'round_g1_4', 'part_g1_tooth-is-silver', 'https://velog.io/@hying/JSX는-객체다-React-리렌더링-구조-이해하기', 'JSX 공부한 내용 정리해봤습니다
[JSX는-객체다-React-리렌더링-구조-이해하기]()', 1763909737000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_4__j2h30728', 'round_g1_4', 'part_g1_j2h30728', 'https://guiltless-aftermath-169.notion.site/Amplitude-2b4e8c228b658033812ddba115d0a2e8?source=copy_link', '나는..또..져버렸다. 완료 못해서 작성 중인 거 올립니다.
-', 1763909943000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_5__ckdwns9121', 'round_g1_5', 'part_g1_ckdwns9121', 'https://www.changjun.dev/posts/-frontend-fundamentals--2b82acd72313802eb692eef13a39af58', '[토스 모의고사 리뷰]() 글을 작성해봤습니다.', 1764254078000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_5__chan9yu', 'round_g1_5', 'part_g1_chan9yu', 'https://www.chan9yu.dev/posts/separating-react-app-to-sdk', '1년 동안 진행해온 SDK 개발 과정을 정리했습니다.
어떻게 만들었는지, 어떤 고민을 거쳤는지, 앞으로 어떤 방향으로 발전시킬지에 대한 내용을 담았습니다.
또한 오늘 면접에서 이야기했던 내용들도 모두 이 글 안에 정리되어 있습니다
[강결합된 React 앱을 독립적인 SDK로 분리하기]()', 1764765379000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_5__BBAK-jun', 'round_g1_5', 'part_g1_BBAK-jun', 'https://bbakjun.notion.site/2bf42b6fc4ab8045b45af79fd8c2f89b', '데이원컴퍼니 퇴사 회고 초안입니다!!', 1764814851000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_5__xxziiko', 'round_g1_5', 'part_g1_xxziiko', 'https://xxziiko.notion.site/2bf4ae05ecc780b0aaa0f670a63a52c4?source=copy_link', '노션에 [비트연산]()을 정리했습니다.
차주는 꼭 !!!!!! 포스팅 글을 작성하겠습니다,,', 1764859183000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_5__YeongseoYoon', 'round_g1_5', 'part_g1_YeongseoYoon', 'https://www.notion.so/yeong-seo/2c0cf63c62d380418582d94347555b16?source=copy_link', '계속 이상한거 하느라 바빠서..
화요일에 면접을 봐야해서 일단 면접 준비용으로 프엔 단골 퀴즈쇼 문제 정리한거 올리겟슴', 1765082258000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_5__heojungseok', 'round_g1_5', 'part_g1_heojungseok', 'https://velog.io/@jungseokheo/network-fundamentals', '취업 준비를 하면서 기초 개념을 제가 학습하고 정리한 글들입니다.
[OSI 7계층, TCP/UDP, HTTPS]()
내용은 개인적인 공부 내용을 정리한 거라 부족함이 있을 수 있습니다. 예쁘게 봐주세요. 감사합니다.😁😁😁😁😁', 1765090138000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_5__pitangland', 'round_g1_5', 'part_g1_pitangland', 'https://pitangland.tistory.com/175', '2025년 회고 드래프트 입니다!
테오콘 스태프 후기 추가되었습니다! (=> 세션 정리 조금 했는데 아마 따로 글 뺄 것 같기도 합니다)
[2025년 회고 (드래프트)]()
비밀번호는.. MjAxMTQ2', 1765094571000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_5__areumH', 'round_g1_5', 'part_g1_areumH', 'https://velog.io/@areumh__9/%ED%81%B4%EB%A1%9C%EB%93%9C-%EC%BD%94%EB%93%9C%EC%97%90%EA%B2%8C-%EA%B0%9C%EC%9D%B8-%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8-%EB%A6%AC%ED%8C%A9%ED%86%A0%EB%A7%81%EC%9D%84-%EC%8B%9C%EC%BC%9C%EB%B3%B4%EC%95%98%EB%8B%A4', '개인 플젝 리팩토링해봤습니다,,
[클로드 코드에게 개인 프로젝트 리팩토링을 시켜보았다]()', 1765096917000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_5__hyojin-k', 'round_g1_5', 'part_g1_hyojin-k', 'https://www.notion.so/minu-2c24ef53069080cfab98f90adda0dce9?source=copy_link', '테오콘 스태프 참여 중 들었던 세션 중 하나의 후기 드래프트...
[테오콘 세션 후기(드래프트)]()', 1765098396000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_5__nemobim', 'round_g1_5', 'part_g1_nemobim', 'https://blog.naver.com/don-2/224094755602', 'ㅎㅎ 써놓았던 일상 블로그 제출합니다...
원래 사프 후기를 적고 있었는데 날라갔어요
[일상일기]()', 1765099372000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_5__adds9810', 'round_g1_5', 'part_g1_adds9810', 'https://blog.naver.com/toto7971/224101430541', '어쩌다 보니 n회차 운세글...
[2025. 12. 8 ~ 14. 주간운세]()', 1765107129000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_5__tooth-is-silver', 'round_g1_5', 'part_g1_tooth-is-silver', 'https://velog.io/@hying/코드에만-갇히지-않기-토스-FE-어시스턴트-2개월-이야기', '어시스턴트 2개월 회고', 1765108191000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_5__devchaeyoung', 'round_g1_5', 'part_g1_devchaeyoung', 'https://m.blog.naver.com/nana_log0/224101561152', '급 테오콘 회고..', 1765114947000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_5__yuhyeon99', 'round_g1_5', 'part_g1_yuhyeon99', 'https://velog.io/@jujini31/웹-브라우저-프로토콜HTTP-HTTPS-정리', 'HTTP와 HTTPS에 대해 정리중인 글입니다.', 1765117806000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_5__angielxx', 'round_g1_5', 'part_g1_angielxx', 'https://angielxx.notion.site/2-3-150104c358694e4b9c3d8c5fb2038ff8?source=copy_link', '꾸역꾸역 회고글 개요 끼려왔습니다', 1765118920000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_5__j2h30728', 'round_g1_5', 'part_g1_j2h30728', 'https://www.notion.so/2c2e8c228b6580208165e48cdde9867e?source=copy_link', '테오콘 스태프(MC) 회고글 쓰고있는 중.', 1765119512000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_6__nemobim', 'round_g1_6', 'part_g1_nemobim', 'https://peripheral-nerv.tistory.com/entry/BP-%EB%A7%90%EA%B3%A0-BF-%EC%B0%BE%EA%B8%B0-%ED%95%AD%ED%95%B4-%ED%95%98%EB%A9%B4%EC%84%9C-%EC%82%AC%EC%9D%B4%EB%93%9C-%ED%94%8C%EC%A0%9D-%ED%95%98%EA%B8%B0feat-2%ED%8C%80', '[BP 말고 BF 찾기, 항해 하면서 사이드 플젝 하기(feat. 2팀)]()
부지런 좀 떨어봤습니다. 야호~~ 쓰면서도 추억이 새록새록 하네요', 1765473442000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_6__tooth-is-silver', 'round_g1_6', 'part_g1_tooth-is-silver', 'https://velog.io/@hying/팀워크는-어떻게-만들어질까-팀워크의-부활', '서평', 1765811248000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_6__xxziiko', 'round_g1_6', 'part_g1_xxziiko', 'https://velog.io/@xxziiko/%EC%99%9C-GraphQL', '[왜 GraphQL?]()', 1765989511000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_6__BBAK-jun', 'round_g1_6', 'part_g1_BBAK-jun', 'https://www.dev-bbak.site/blog/DEV/vercel_blob_storage_cdc_pipeline', '퇴사 후 개인 블로그 사용성을 조금 더 올려보고 싶어서, 글/이미지를 관리하는 어드민을 만들었습니다.
그리고 “어디서든 작성/배포”를 목표로 로컬 파일시스템 기반에서 리모트 파일시스템(Blob Storage) 중심으로 전환했는데, 여기서 예상하지 못했던 운영 이슈를 겪었습니다.
저는 처음에 “업로드가 많으면 비용이 늘겠지” 정도로 생각했는데, 실제로는 관리 UI에서 발생하는 목록 조회(list) 같은 호출이 더 빠르게 누적되면서 비용과 응답 시간이 함께 문제로 나타났습니다.
결국 파일 원본은 Blob에 두되, 목록 메타데이터는 Postgres에 캐시하고 업로드/삭제 이벤트를 기준으로 CDC 방식으로 동기화하는 구조로 정리했습니다.
아직 완벽하진 않지만, 같은 고민을 하시는 분들께 작은 참고가 될까 싶어 과정과 선택 이유를 글로 남겼습니다.
피드백이나 더 나은 패턴이 있으면 꼭 배우고 싶습니다.', 1766018348000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_6__yuhyeon99', 'round_g1_6', 'part_g1_yuhyeon99', 'https://velog.io/@jujini31/Google-Maps로-거리-재기-기능-직접-구현하기-Canvas-Angular', '[Google Maps 거리 재기 기능 직접 구현하기 (Canvas + Angular)]()', 1766190893000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_6__ckdwns9121', 'round_g1_6', 'part_g1_ckdwns9121', 'https://www.changjun.dev/posts/rag--2b82acd7231380a89928fecd12f2151c', '물류 도메인에 합류한 지 2주차 때 여전히 어려운 물류프로세스, 방대한 레거시 코드 분석 및 그 환경에서의 운영업무를 해결하기 위해 스스로 온보딩 챗봇을 만들며 살아남아보기
[RAG기반 셀프 온보딩 챗봇 구축하기]()', 1766220377000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_6__YeongseoYoon', 'round_g1_6', 'part_g1_YeongseoYoon', 'https://claude.ai/public/artifacts/8fe8ee54-15e5-417c-b663-31a2ae4c81a4', '이전에 올렸던 패키지매니저 글 2차버전... 글 다듬다가 클로드 이번 달 한도가 끝나버려서 2차 버전으로 올립니다...', 1766313823000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_6__heojungseok', 'round_g1_6', 'part_g1_heojungseok', 'https://velog.io/@jungseokheo/data-structures-and-big-o', '이번 똥글 기간 동안 학습한 내용을 정리해봤습니다. 감사합니다.
[자료구조 기초와 Big-O]()', 1766316812000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_6__realstone2', 'round_g1_6', 'part_g1_realstone2', 'https://jindol-blog-two.vercel.app/blog/2c2f43437bda80fdb538dda99285bf29?lang=ko', '간단하게 퇴사 회고글을 작성해보았습니다.', 1766323125000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_6__areumH', 'round_g1_6', 'part_g1_areumH', 'https://m.blog.naver.com/ar9eum_/224117838189', '일기를 시작하기 위한 간단 일기를 썼습니다...
[일기를 위한 일기]()', 1766324757000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_6__adds9810', 'round_g1_6', 'part_g1_adds9810', 'https://blog.naver.com/toto7971/224114655966', '한 해의 끝이자 다음해의 시작인 겨울, 대인관계운은 어떻게 흘러갈까에 대한 운세글입니당', 1766326856000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_6__BangDori', 'round_g1_6', 'part_g1_BangDori', 'https://bangdori.notion.site/AI-Review-2cbd7710c44f80df83adca2a279026a7?pvs=74', '[(작성중) AI Review 톺아보기]()
올해를 마무리하면서 AI Review 내용을 하나씩 정리해나가고 있습니당', 1766328853000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_6__devchaeyoung', 'round_g1_6', 'part_g1_devchaeyoung', 'https://blog.naver.com/nana_log0/224117920722', '파머스 초콜릿 우유 라떼 후기☕️', 1766329057000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_6__Legitgoons', 'round_g1_6', 'part_g1_Legitgoons', 'https://cksxkr5193.tistory.com/129', '[앞으로 나아갈 방향]()
앞으로 어떻게 방향성을 잡을지 생각해본 글입니다.', 1766329075000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_6__hyojin-k', 'round_g1_6', 'part_g1_hyojin-k', 'https://www.notion.so/2025-2b44ef530690808ebcd3fac789b67289?source=copy_link', '[2025 1년 회고]()
내용 추가 중...', 1766329173000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_7__BBAK-jun', 'round_g1_7', 'part_g1_BBAK-jun', 'https://product.kyobobook.co.kr/detail/S000218438521', '[도메인 주도 설계를 위한 함수형 프로그래밍]()를 읽고 제 생각을 정리해나가는 글로 계속 쓰겠습니당
---
개발자라면 늘 고민하는 stale docs 문제를 어떻게 풀어볼지 정리해봤습니다.
곧 Google이 CodeWiki를 퍼블릭하게 오픈하면 이런 고민도 많이 완화되겠지만, 그 전까지는 지식 문서를 “지속적으로 업데이트 가능하게” 만드는 흐름이 필요하다고 느꼈습니다.
문서 업데이트를 자동화/반자동화해 버스 지수를 낮추는 방향으로 접근해봤습니다.', 1767020704000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_7__realstone2', 'round_g1_7', 'part_g1_realstone2', 'https://jindol-blog-two.vercel.app/blog/2d8f43437bda80e2885fecc3fae07f46?lang=ko', '다국어 앱을 개발하면서 배운점들을 정리해보았습니다!', 1767152728000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_7__adds9810', 'round_g1_7', 'part_g1_adds9810', 'https://blog.naver.com/toto7971/224129665773', '신년특집?! 신년운세를 적어봤습니다ㅎㅎ', 1767184467000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_7__tooth-is-silver', 'round_g1_7', 'part_g1_tooth-is-silver', 'https://velog.io/@hying/React-19-deepdive-1', '리액트 19 딥다이브 - 1편', 1767274308000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_7__BangDori', 'round_g1_7', 'part_g1_BangDori', 'https://www.bangdori.kr/blog/2025', '2025년 회고를 작성했습니다.', 1767333344000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_7__areumH', 'round_g1_7', 'part_g1_areumH', 'https://m.blog.naver.com/ar9eum_/224132296622', '[2025 되돌아보기..]()', 1767372590000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_7__xxziiko', 'round_g1_7', 'part_g1_xxziiko', 'https://blog.naver.com/xxziiko/224133197486', '[회고인척 하는 블로그 글..]()', 1767448848000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_7__angielxx', 'round_g1_7', 'part_g1_angielxx', 'https://angielxx.notion.site/2-3-150104c358694e4b9c3d8c5fb2038ff8?source=copy_link', '[온고지신: 2년차에서 3년차로 접어들며]()
2년차 > 3년차 회고 글 50% 정도 작성했습니다.', 1767507926000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_7__pitangland', 'round_g1_7', 'part_g1_pitangland', 'https://pitangland.tistory.com/175', '[회..회고..]()', 1767519175000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_7__j2h30728', 'round_g1_7', 'part_g1_j2h30728', 'https://velog.io/@rachel28/2025teoconf', '[2025 TEOConf 스태프 회고(MC)]()
아 이거로 제출 안하려했는데 제 게으름이 이겨버렷네요...', 1767522555000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_7__YeongseoYoon', 'round_g1_7', 'part_g1_YeongseoYoon', 'https://www.yeongseo-blog.site/blog/memoir_2025', '[2025 회고]()', 1767522980000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_7__nemobim', 'round_g1_7', 'part_g1_nemobim', 'https://blog.naver.com/don-2/224128043725', '일단 일상블로그라도 제출 ㅎㅎ', 1767525567000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_7__yuhyeon99', 'round_g1_7', 'part_g1_yuhyeon99', 'https://velog.io/@jujini31/2025-회고', '[[draft] 2025 회고]()', 1767532232000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_7__Legitgoons', 'round_g1_7', 'part_g1_Legitgoons', 'https://cksxkr5193.tistory.com/130', '[요정 프롬프트 개선기(작성 중)]()', 1767535779000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_7__devchaeyoung', 'round_g1_7', 'part_g1_devchaeyoung', 'https://devchaeyoung.tistory.com/entry/%ED%95%AD%ED%95%B4%ED%94%8C%EB%9F%AC%EC%8A%A4-%ED%94%84%EB%A1%A0%ED%8A%B8%EC%97%94%EB%93%9C-7%EA%B8%B0-%ED%95%99%EC%8A%B5%EB%A9%94%EC%9D%B4%ED%8A%B8-%ED%9A%8C%EA%B3%A0-%EB%A7%88%EC%A7%80%EB%A7%89-%ED%95%AD%ED%95%B4', '[항플 7기 학메 회고(작성중)]()', 1767538334000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_7__hyojin-k', 'round_g1_7', 'part_g1_hyojin-k', 'https://velog.io/@zo2kim/2025-%ED%9A%8C%EA%B3%A0', '[2025년 회고]()', 1767538365000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_7__chan9yu', 'round_g1_7', 'part_g1_chan9yu', 'https://www.chan9yu.dev/posts/2025-retrospective', '[2025년, 번아웃과 성장 사이에서]()', 1767538714000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_7__ckdwns9121', 'round_g1_7', 'part_g1_ckdwns9121', 'https://www.changjun.dev/posts/2025--2d02acd723138013b4a9c74f0b193ef7', '2025년 회고 초안', 1767538715000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_8__xxziiko', 'round_g1_8', 'part_g1_xxziiko', 'https://velog.io/@xxziiko/GraphQL%EC%9D%80-%EC%99%9C-%EC%9D%B4%EB%A0%87%EA%B2%8C-%EC%83%9D%EA%B2%BC%EC%9D%84%EA%B9%8C', '1빠다!
[GraphQL은 왜 이렇게 생겼을까]()', 1768137375000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_8__yuhyeon99', 'round_g1_8', 'part_g1_yuhyeon99', 'https://velog.io/@jujini31/Scanner-hasNextBoolean은-언제-입력을-받는가-블로킹-IO-관점에서-이해하기', '2빠입니다!
[[JAVA] Scanner hasNextBoolean()은 언제 입력을 받는가 — 블로킹 I/O 관점에서 이해하기]()', 1768484275000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_8__areumH', 'round_g1_8', 'part_g1_areumH', 'https://velog.io/@areumh__9/LeetCode-135.-Candy', '3빠...
[리트코드 135.Candy 풀이...]()', 1768671319000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_8__realstone2', 'round_g1_8', 'part_g1_realstone2', 'https://www.notion.so/2b8f43437bda8015ac66fe94b860c494?source=copy_link', '오늘안에 다 쓸각이 안보여서 초안으로 올립니다..', 1768704175000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_8__heojungseok', 'round_g1_8', 'part_g1_heojungseok', 'https://velog.io/@jungseokheo/spring-security-jwt-authentication', '제출 완료..
[Spring Security와 JWT를 활용]()', 1768734345000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_8__BBAK-jun', 'round_g1_8', 'part_g1_BBAK-jun', 'https://bbakjun.notion.site/Retrieval-Augmented-Generation-2ec42b6fc4ab8071a4b1e355a569f0f0?pvs=74', 'RAG에대한 학습 기록 노트입니다', 1768740627000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_8__chan9yu', 'round_g1_8', 'part_g1_chan9yu', 'https://www.chan9yu.dev/posts/webrtc-media-codecs', '[미디어 코덱 뜯어보기 (VP8부터 차세대 AV2까지)]()
주의: 수정해야함 이미지도 못넣음..', 1768740813000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_8__YeongseoYoon', 'round_g1_8', 'part_g1_YeongseoYoon', 'https://www.notion.so/yeong-seo/AI-2eccf63c62d38011bd58f75fee3eb085?source=copy_link', '요즘 당근 AI 개발 읽고 정리', 1768744781000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_8__ckdwns9121', 'round_g1_8', 'part_g1_ckdwns9121', 'https://www.changjun.dev/posts/--2a62acd7231380cbbbbec664d9447fae', '복잡한 물류 프로세스의 라우팅을 상태 전이 기반으로 리팩토링한 경험', 1768745149000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_8__devchaeyoung', 'round_g1_8', 'part_g1_devchaeyoung', 'https://devchaeyoung.tistory.com/entry/%EC%9D%B8%ED%94%84%EB%9D%BC-%ED%94%84%EB%9F%B0%ED%8A%B8%EC%97%90%EC%84%9C-%EC%9D%B8%ED%94%84%EB%9D%BC-%EC%9E%85%EB%AC%B8%ED%95%98%EA%B8%B0-%EA%B7%B8%EB%A6%BC%EA%B3%BC-%EC%8B%A4%EC%8A%B5%EC%9C%BC%EB%A1%9C-%EB%B0%B0%EC%9A%B0%EB%8A%94-%EC%BF%A0%EB%B2%84%EB%84%A4%ED%8B%B0%EC%8A%A4', '[[인프라] 프런트에서 인프라 입문하기 - 그림과 실습으로 배우는 쿠버네티스]()', 1768745176000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_8__Legitgoons', 'round_g1_8', 'part_g1_Legitgoons', 'https://github.com/user-attachments/files/24696126/default.pdf', '이력서 업뎃완료
[as-is]()
- 핵심 역량 항목을 Career에 통합
- 새 프로젝트 작성 완료
- Other Career 항목 추가', 1768745813000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_8__adds9810', 'round_g1_8', 'part_g1_adds9810', 'https://blog.naver.com/toto7971/224151258197', '안 쓴거 걸리기 전에 올려보는 [2026. 1. 19 ~ 25. 주간운세]()', 1768746940000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_8__BangDori', 'round_g1_8', 'part_g1_BangDori', 'https://www.bangdori.kr/blog/finding-myself-by-working-for-others', '대부분의 코드를 AI가 작성해주게 되면서, 내가 잘하는게 무엇인지를 돌아보고 정리하는 시간이 필요하다는 생각이 들어서 간단하게 회고를 작성해보았습니다.
[나를 찾아가기]()', 1768747275000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_8__nemobim', 'round_g1_8', 'part_g1_nemobim', 'https://peripheral-nerv.tistory.com/entry/Gemini-%EB%82%98%EB%85%B8-%EB%B0%94%EB%82%98%EB%82%98Nano-Banana%EC%97%90%EA%B2%8C-%ED%95%9C%EA%B8%80-%EA%B0%80%EB%A5%B4%EC%B9%98%EA%B8%B0-%EC%8B%A4%ED%97%98', '[[Gemini] 나노 바나나(Nano Banana)에게 한글 가르치기 실험]()
한글 잘 처리 못하길래 여러가지 실험 해봤는데 결론.. 고급모드 쓰면 된다.', 1768748017000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_8__tooth-is-silver', 'round_g1_8', 'part_g1_tooth-is-silver', 'https://www.notion.so/gelee/25-01-18-2ecbe3217cfa8051af88ea5570a23163?source=copy_link', '[토스 엑셀러레이터 5기 후기 (초안)]()', 1768748269000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g1_8__j2h30728', 'round_g1_8', 'part_g1_j2h30728', 'https://guiltless-aftermath-169.notion.site/2-package-json-npm-2ebe8c228b65803999fcd6d6bfa7811f?source=copy_link', '회고글은 너무 초안이라 못올리겠고 Npm deep dive 정리하면서 읽습니다
- [2장 package.json 과 npm 파헤치기]()', 1768748378000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_1__yuhyeon99', 'round_g2_1', 'part_g2_yuhyeon99', 'https://velog.io/@jujini31/codex-앱-사용-후기', '최근 출시한 Codex 앱 써본 후기 작성했습니다.', 1770644742000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_1__heojungseok', 'round_g2_1', 'part_g2_heojungseok', 'https://velog.io/@jungseokheo/taskflow-3week-development-retrospective', '사이드 프로젝트 회고 1
[일정 관리(아키텍처 설계)]()', 1771043358000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_1__xxziiko', 'round_g2_1', 'part_g2_xxziiko', 'https://velog.io/@xxziiko/%EC%BB%A8%ED%85%8D%EC%8A%A4%ED%8A%B8-%EC%97%94%EC%A7%80%EB%8B%88%EC%96%B4%EB%A7%81-AI-%EC%97%90%EC%9D%B4%EC%A0%84%ED%8A%B8%EB%A5%BC-%EA%B5%AC%EB%8F%99%ED%95%98%EB%8A%94-%EC%BB%A8%ED%85%8D%EC%8A%A4%ED%8A%B8%EB%A5%BC-%EC%84%A4%EA%B3%84%ED%95%98%EB%8A%94-%EB%B2%95-%EB%B2%88%EC%97%AD', '번역을  했습니다.
[컨텍스트 엔지니어링: AI 에이전트를 구동하는 컨텍스트를 설계하는 법 (번역)]()
나는 바보', 1771084330000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_1__realstone2', 'round_g2_1', 'part_g2_realstone2', 'https://jindol-blog-two.vercel.app/blog/2b8f43437bda8015ac66fe94b860c494?lang=ko', '이미지 겉핥기 시리즈 1 작성하였습니다.', 1771085964000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_1__ckdwns9121', 'round_g2_1', 'part_g2_ckdwns9121', 'https://www.changjun.dev/posts/ast-codemod--3032acd723138073b820e5089c1aa2a4', 'AST codemode로 레거시 코드 변환을 자동화한 경험을 작성해봤습니다', 1771119664000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_1__BangDori', 'round_g2_1', 'part_g2_BangDori', 'https://www.bangdori.kr/blog/i18n-automation-with-ai', '[AI의 비결정성을 활용하여 i18n 작업 가속화하기]()', 1771140471000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_1__eveneul', 'round_g2_1', 'part_g2_eveneul', 'https://velog.io/@eveneul/CSS-Easing-잘-사용하고-계신가요', '[님들 UI 만들 때 CSS Easing 잘 사용하고 계신가요]()', 1771144029000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_1__BBAK-jun', 'round_g2_1', 'part_g2_BBAK-jun', 'https://www.dev-bbak.site/blog/DEV/ai-friendly-frontend-ddd-tagged-union-colocation', '[패턴보다 상태를 닫는 게 먼저였다]()', 1771146145000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_1__j2h30728', 'round_g2_1', 'part_g2_j2h30728', 'https://velog.io/@rachel28/2025', '회고머신;
- [2025년, 그리고 한 달 회고]()', 1771157219000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_1__YeongseoYoon', 'round_g2_1', 'part_g2_YeongseoYoon', 'https://www.yeongseo-blog.site/blog/browser-hangul-ime-composition-contenteditable', 'IME 조합방식과 해결방법에 대해서 글 써봤습니다~ 아마두 contenteditable을 사용해보셨다면!! 도움이 될지두', 1771157261000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_1__JungWoo0203', 'round_g2_1', 'part_g2_JungWoo0203', 'https://meommu.tistory.com/10', '회사에서 멘토링기능 개발하면서 공부한 CRDT 정리', 1771158106000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_1__chan9yu', 'round_g2_1', 'part_g2_chan9yu', 'https://evanescent-scraper-bb8.notion.site/v3-2a57d69bd6f680a5ab78ca335e24a50b?pvs=73', '여찬규 2026년 이직프로젝트 시작
이력서 초안 v3 입니다', 1771160907000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_1__angielxx', 'round_g2_1', 'part_g2_angielxx', 'https://www.notion.so/angielxx/2-3-150104c358694e4b9c3d8c5fb2038ff8?source=copy_link', '기존에 작성하던 글 개선했음..! 다음 회차엔 발행 목표', 1771164941000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_1__adds9810', 'round_g2_1', 'part_g2_adds9810', 'https://blog.naver.com/toto7971/224184892654', '하려던게 망해서 [언제나 그렇듯 주간운세]()', 1771165074000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_1__tooth-is-silver', 'round_g2_1', 'part_g2_tooth-is-silver', 'https://velog.io/@hying/React-19-deepdive-2', '리액트 딥다이브 스터디 시리즈 2부', 1771165604000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_1__areumH', 'round_g2_1', 'part_g2_areumH', 'https://www.notion.so/2aa6b4353cd4801aac8bf28edaaebb2e?source=copy_link', '서류전형 과제 진행중입니다...  [과제 정리]()', 1771167287000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_1__devchaeyoung', 'round_g2_1', 'part_g2_devchaeyoung', 'https://devchaeyoung.tistory.com/entry/BFF%EB%A1%9C-%EC%99%B8%EB%B6%80-%EB%8D%B0%EC%9D%B4%ED%84%B0-%EC%88%98%EC%A7%91%EC%99%80-%EB%82%B4%EB%B6%80-API-%EB%A7%A4%ED%95%91-%ED%8C%8C%EC%9D%B4%ED%94%84%EB%9D%BC%EC%9D%B8-%EB%A7%8C%EB%93%A4%EA%B8%B0', '[BFF로 외부 데이터과 내부 API 매핑 파이프라인 만들기]()', 1771167365000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_1__nemobim', 'round_g2_1', 'part_g2_nemobim', 'https://peripheral-nerv.tistory.com/entry/%EB%8F%84%EC%84%9C%EC%9E%90%EA%B8%B0%EA%B3%84%EB%B0%9C-%EC%96%B4%EB%A5%B8%EC%9D%98-%EA%B5%AD%EC%96%B4%EB%A0%A5-w%EA%B9%80%EB%B2%94%EC%A4%80', '[어른의 국어력(초안)]()
일단 먼저 제출합니다.', 1771167441000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_1__Legitgoons', 'round_g2_1', 'part_g2_Legitgoons', 'https://western-lumber-687.notion.site/30861b83c94880848b79dc9d6cd61deb?source=copy_link', '[재취업 회고(완전 초안)]()
일단 재취업 회고 작성중', 1771167545000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_2__xxziiko', 'round_g2_2', 'part_g2_xxziiko', 'https://velog.io/@xxziiko/%EC%97%90%EC%9D%B4%EC%A0%84%ED%8A%B8%EB%A5%BC-%EA%B5%AC%EC%A1%B0%EC%A0%81%EC%9C%BC%EB%A1%9C-%EC%9D%B4%ED%95%B4%ED%95%98%EA%B8%B0', '[에이전트를 구조적으로 이해하기]()', 1771772149000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_2__chan9yu', 'round_g2_2', 'part_g2_chan9yu', 'https://www.linkedin.com/posts/chan9yu_claude-code-agent-teams%EB%A1%9C-ai-%EB%89%B4%EC%8A%A4%EB%B4%87-%EB%A7%8C%EB%93%A4%EA%B8%B0-activity-7431620452931985408-HSv6?utm_source=share&utm_medium=member_desktop&rcm=ACoAADvvU3gBoYYLlYlv1gq65YLAiAlrkNEoIhI', '[Claude Code Agent Teams로 AI 뉴스봇 만들기]()', 1771836531000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_2__ckdwns9121', 'round_g2_2', 'part_g2_ckdwns9121', 'https://www.changjun.dev/posts/1----30f2acd7231380ea9338d141ed11d223', '[아이언맨1을 다시 보고 느낀점 - 우리는 토니스타크가 될 수 있을까?]()', 1771838863000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_2__heojungseok', 'round_g2_2', 'part_g2_heojungseok', 'https://velog.io/@jungseokheo/taskflow-google-oauth-calendar-api', '[일정 관리2(아키텍쳐 설계)]()', 1771924055000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_2__eveneul', 'round_g2_2', 'part_g2_eveneul', 'https://www.notion.so/v5-309e379860f680ddb416fc94df159acb?source=copy_link', '[이력서 썼어요]()
피드백 무한 감사', 1772287246000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_2__BBAK-jun', 'round_g2_2', 'part_g2_BBAK-jun', 'https://www.dev-bbak.site/blog/DEV/my_principle', '[나를 지탱해줄 기준]()', 1772288022000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_2__realstone2', 'round_g2_2', 'part_g2_realstone2', 'https://github.com/realstone2/react-router-v7-blog/tree/main/content/posts', '사내 스터디로 react-router-v7 공부중인거 정리중인 글들입니다.', 1772350427000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_2__tooth-is-silver', 'round_g2_2', 'part_g2_tooth-is-silver', 'https://velog.io/@hying/SWC-트러블슈팅', '트러블슈팅기록', 1772354413000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_2__areumH', 'round_g2_2', 'part_g2_areumH', 'https://m.blog.naver.com/ar9eum_/224199645360', '[2월 일기]()', 1772358599000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_2__yuhyeon99', 'round_g2_2', 'part_g2_yuhyeon99', 'https://velog.io/@jujini31/번역-Spring-Framework-Dependency-Injection', '스프링 공부 기록입니다.', 1772360134000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_2__adds9810', 'round_g2_2', 'part_g2_adds9810', 'https://m.blog.naver.com/toto7971/224200250707', '[3월운세;;]()', 1772364227000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_2__j2h30728', 'round_g2_2', 'part_g2_j2h30728', 'https://guiltless-aftermath-169.notion.site/RSC-Object-assign-316e8c228b658091949deb658ea96af6?source=copy_link', '일단, 업무 때문에 시간 없어서 초안 업로드 합니다.
- [RSC에서 Object.assign이 깨지는 이유]()', 1772367613000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_2__nemobim', 'round_g2_2', 'part_g2_nemobim', 'https://peripheral-nerv.tistory.com/entry/%ED%97%A4%EB%93%9C%ED%8D%BC%EC%8A%A4%ED%8A%B8-%EB%94%94%EC%9E%90%EC%9D%B8%ED%8C%A8%ED%84%B4-%EC%98%B5%EC%A0%80%EB%B2%84-%ED%8C%A8%ED%84%B4', '스터디 한거 정리
[디자인패턴- 옵저버 패턴]()', 1772374753000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_2__devchaeyoung', 'round_g2_2', 'part_g2_devchaeyoung', 'https://devchaeyoung.tistory.com/entry/OWASP-Seoul-Chapter-2%EC%9B%94-%EB%B0%8B%EC%97%85-%ED%9B%84%EA%B8%B0-%EC%97%94%EB%93%9C%ED%8F%AC%EC%9D%B8%ED%8A%B8-%EB%B3%B4%EC%95%88-%ED%8A%B9%EC%A7%91', '밋업 다녀온거
[owasp 2월 밋업 후기~]()', 1772376496000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_2__BangDori', 'round_g2_2', 'part_g2_BangDori', 'https://www.bangdori.kr/blog/apollo-router-local-setup', '[Apollo Router를 로컬에서 구성하기]()', 1772376964000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_3__areumH', 'round_g2_3', 'part_g2_areumH', 'https://velog.io/@areumh__9/react-hook-form-zod-zustand-persist-%EB%A1%9C-%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8-%EC%9C%84%EC%9E%90%EB%93%9C-%ED%8F%BC-%EC%9E%91%EC%84%B1%ED%95%98%EA%B8%B0', '[react-hook-form + zod + zustand persist로 프로젝트 위자드 폼 작성하기]()', 1773465858000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_3__yuhyeon99', 'round_g2_3', 'part_g2_yuhyeon99', 'https://velog.io/@jujini31/스프링-핵심-원리-SOLID-원칙을-코드로-적용해보기', '[스프링 핵심 원리 SOLID 원칙을 코드로 적용해보기]()', 1773545282000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_3__heojungseok', 'round_g2_3', 'part_g2_heojungseok', 'https://velog.io/@jungseokheo/bfs-dfs-when-to-use', '[알고리즘 - BFS, DFS]()', 1773561621000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_3__chan9yu', 'round_g2_3', 'part_g2_chan9yu', 'https://www.chan9yu.dev/posts/react-set-state-in-effect', '오랜만에 React 공부했슈다
[useEffect 안에서 setState 하지 마세요 — React가 말하는 이유]()', 1773563380000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_3__eveneul', 'round_g2_3', 'part_g2_eveneul', 'https://www.notion.so/324e379860f680a386a7d46357ca6ff6?source=copy_link', '초안입니다..
[고용량 이미지 시퀀스 기반 스크롤 애니메이션 문제 해결하기]()', 1773565295000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_3__xxziiko', 'round_g2_3', 'part_g2_xxziiko', 'https://velog.io/@xxziiko/slack%EC%97%90%EC%84%9C-%ED%9A%8C%EC%9D%98%EC%8B%A4-%EC%98%88%EC%95%BD%EA%B9%8C%EC%A7%80', '[Slack에서 회의실 예약까지 — Google Apps Script로 만든 사내 봇 삽질기]()', 1773570376000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_3__BBAK-jun', 'round_g2_3', 'part_g2_BBAK-jun', 'https://www.dev-bbak.site/blog/DEV/my_principle', '[나를 지탱하는 기준 v2]()', 1773570755000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_3__YeongseoYoon', 'round_g2_3', 'part_g2_YeongseoYoon', 'https://www.notion.so/yeong-seo/SVG-1-324cf63c62d380fd9916da61e642a4c8?source=copy_link', '[svg 시리즈 1편 초안]()', 1773573227000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_3__ckdwns9121', 'round_g2_3', 'part_g2_ckdwns9121', 'https://long-aries-534.notion.site/Google-Spread-Sheets-3242acd72313800e9152c988f1133c17', '[Google Sheets를 활용해 모두가 배포할 수 있는 다국어 시스템 구축하기 초안]()', 1773579775000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_3__adds9810', 'round_g2_3', 'part_g2_adds9810', 'https://www.notion.so/324162e19b1380a098f7d65487ecc834?source=copy_link', '하려던게 망해서 [낙서]()', 1773580130000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_3__angielxx', 'round_g2_3', 'part_g2_angielxx', 'https://angielxx.notion.site/3249e62ef9e580758151dd334d44f1f9?source=copy_link', '초안입니다..', 1773582093000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_3__realstone2', 'round_g2_3', 'part_g2_realstone2', 'https://encouraging-smartphone-eda.notion.site/AI-324f43437bda80efa39afe471d959d93?source=copy_link', '초안입니다...', 1773584400000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_3__nemobim', 'round_g2_3', 'part_g2_nemobim', 'https://github.com/nemobim/head-first-design-pattern/blob/main/doeun/04.%ED%8C%A9%ED%86%A0%EB%A6%AC_%ED%8C%A8%ED%84%B4', '스터디에서 디자인패턴 공부한거 정리했습니다.
[팩토리 패턴]()
초안이고 추후 블로그 링크로 수정 예정', 1773584474000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_3__BangDori', 'round_g2_3', 'part_g2_BangDori', 'https://www.bangdori.kr/blog/tailwind-internals-and-abstraction', '[Tailwind의 복잡성과 추상화]()
tailwind 한 번 훑어봤습니다', 1773584869000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_3__tooth-is-silver', 'round_g2_3', 'part_g2_tooth-is-silver', 'https://www.notion.so/gelee/Frontend-Developer-31fbe3217cfa8006ae8be5440b5ac5fa?source=copy_link', '이력서 쓰고 있습니다!', 1773585649000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_3__devchaeyoung', 'round_g2_3', 'part_g2_devchaeyoung', 'https://devchaeyoung.tistory.com/entry/Npm-Deep-Dive-%EC%A0%95%EB%A6%AC', '[npm deep dive 8장]() 읽고 정리~', 1773585838000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_3__JungWoo0203', 'round_g2_3', 'part_g2_JungWoo0203', 'https://meommu.tistory.com/11', '작성중... 일단 뼈대만,, 좀더 생각을 더 하고 싶어요..', 1773586472000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_3__Legitgoons', 'round_g2_3', 'part_g2_Legitgoons', 'https://western-lumber-687.notion.site/3-32461b83c94880a7b47df8d45e3bcf48?source=copy_link', '[차즘 적응기]()
3주차 애송이의 차즘 적응기를 작성했습니다.', 1773586604000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_4__tooth-is-silver', 'round_g2_4', 'part_g2_tooth-is-silver', 'https://velog.io/@hying/기획의-정석', '저번주에 시간이 쬐끔 부족해서 못썼던 독후감~', 1773666333000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_4__eveneul', 'round_g2_4', 'part_g2_eveneul', 'https://velog.io/@eveneul/display%EC%99%80-%EC%A1%B0%EA%B1%B4%EB%B6%80-%EB%A0%8C%EB%8D%94%EB%A7%81%EC%97%90%EB%8F%84-%EC%95%A0%EB%8B%88%EB%A9%94%EC%9D%B4%EC%85%98%EC%9D%84-%EC%A3%BC%EA%B3%A0-%EC%8B%B6%EC%96%B4', '[display와 조건부 렌더링에도 애니메이션을 주고 싶어]()', 1774090708000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_4__angielxx', 'round_g2_4', 'part_g2_angielxx', 'https://angielxx.notion.site/3249e62ef9e580758151dd334d44f1f9?source=copy_link', '[함께 자라기를 읽고]()', 1774092760000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_4__xxziiko', 'round_g2_4', 'part_g2_xxziiko', 'https://velog.io/@xxziiko/%EB%B2%88%EC%97%AD-Improving-frontend-design-through-Skills', '일단 세이브용으로 번역글 올립니다,, 시간이 된다면 하나 더 쓸 예정
[Improving frontend design through Skills]()', 1774094679000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_4__ckdwns9121', 'round_g2_4', 'part_g2_ckdwns9121', 'https://www.changjun.dev/posts/google-spread-sheets--2d02acd7231380e2b193da27c2a7bb37', '[Google Spread Sheets로 모두가 관리할 수 있는 다국어 시스템 만들기]()', 1774278036000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_4__areumH', 'round_g2_4', 'part_g2_areumH', 'https://velog.io/@areumh__9/%EC%9B%B9-%ED%81%AC%EB%A1%A4%EB%A7%81-AI-%EA%B8%B0%EB%B0%98-%EC%9B%90%EB%AC%B8-%EC%A0%81%ED%95%A9%EC%84%B1-%ED%8C%90%EB%8B%A8-%EA%B5%AC%ED%98%84%ED%95%B4%EB%B3%B4%EA%B8%B0', '[웹 크롤링 + AI 기반 원문 적합성 판단 구현해보기]()
두개 썼어용', 1774445044000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_4__heojungseok', 'round_g2_4', 'part_g2_heojungseok', 'https://github.com/user-attachments/files/26320271/_._.pdf', '이력서를 재작성 했습니다. 
전**
[백엔드_지원_이력서.pdf]()
후**
md
# 피드백
1. 글씨가 너무 크다 — 폰트 사이즈 조정 필요
2. 중복 텍스트가 많다 — "백엔드 지원 이력서"라는 제목이 상단에 있는데, 그 아래 내용들과 겹침
3. "운영을 책임진다"라는 표현이 모호하다 — 구체적으로 뭘 책임지는 건지 불명확
4. 이메일/Blog/GitHub 같은 정보가 중복되고 공간을 잡아먹는다
5. "경력 및 자기소개"라는 섹션이 어색하다 — 경력 / 프로젝트로만 나누는 게 나을 것 같다는 의견
6. 경력과 프로젝트 내용이 겹친다 — 위에서 회사 역할(개요 레벨)을 적고, 아래에는 개발 관점의 디테일을 적는 식으로 구분하라는 조언
7. 개인 사이드 프로젝트가 너무 주요 프로젝트처럼 들어가 있다 — 하단으로 빼서 구분을 명확히 하라
8. 너무 기술 용어를 나열만 하고 있다 — "이걸 어떻게 해결했는지"보다는 "왜 이 기술을 썼나, 어떤 상황이었나, 어떤 판단', 1774673463000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_4__JungWoo0203', 'round_g2_4', 'part_g2_JungWoo0203', 'https://meommu.tistory.com/12', '[MCP는 왜 토큰을 많이 먹을까?]()', 1774706009000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_4__BBAK-jun', 'round_g2_4', 'part_g2_BBAK-jun', 'https://bbak-jun.github.io/harness-docs/', '[하네스 독스 제품소개서]()', 1774760885000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_4__chan9yu', 'round_g2_4', 'part_g2_chan9yu', 'https://www.notion.so/Claude-Code-Skills-70-3327d69bd6f680c09698d4a23e033f24?source=copy_link', '[Claude Code Skills - 70만 개 스킬 시대에 제대로 된 스킬을 만드는 방법 초안]()', 1774762457000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_4__YeongseoYoon', 'round_g2_4', 'part_g2_YeongseoYoon', 'https://yeongseo-blog.vercel.app/blog/browser-svg-rendering-coordinate-system', 'svg 시리즈 1탄', 1774768592000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_4__adds9810', 'round_g2_4', 'part_g2_adds9810', 'https://blog.naver.com/toto7971/224233548674', ';;; [4월운세]()', 1774784259000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_4__BangDori', 'round_g2_4', 'part_g2_BangDori', 'https://github.com/user-attachments/files/26331039/AI.zip', '[AI 시대의 기준.zip]()', 1774787341000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_4__nemobim', 'round_g2_4', 'part_g2_nemobim', 'https://cllyjyoy.gensparkspace.com/', '[커맨드 패턴 스터디 발표 ]()', 1774787429000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_4__yuhyeon99', 'round_g2_4', 'part_g2_yuhyeon99', 'https://velog.io/@jujini31/구름-딥다이브-풀스택-17회차-5개월-차-후기', '[구름 딥다이브 풀스택 17회차 5개월 차 후기]()', 1774792285000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_4__j2h30728', 'round_g2_4', 'part_g2_j2h30728', 'https://velog.io/@rachel28/esmodule-singleton', '[ES Module은 싱글톤일까?]()', 1774794388000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_4__Legitgoons', 'round_g2_4', 'part_g2_Legitgoons', 'https://western-lumber-687.notion.site/33261b83c94880f68416c19fe8504bf3?source=copy_link', '[성장은 어디에서 오는가?(초안)]()', 1774796312000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_4__realstone2', 'round_g2_4', 'part_g2_realstone2', 'https://jindol-blog-two.vercel.app/blog/332f43437bda81a3824ee715bb17037a?lang=ko', '[요즘 내가 AI와 코딩하면서 생각하는 것들]()
배포가 안돼서 일단 노션링크로 올림..', 1774796368000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_5__eveneul', 'round_g2_5', 'part_g2_eveneul', 'https://velog.io/@eveneul/Claude-Code%EB%A1%9C-Figma-%ED%94%8C%EB%9F%AC%EA%B7%B8%EC%9D%B8-%EB%A7%8C%EB%93%A4%EA%B8%B0', '[클로드로 피그마 플러그인 만들기]()', 1774800428000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_5__JungWoo0203', 'round_g2_5', 'part_g2_JungWoo0203', 'https://meommu.tistory.com/13', '([RAG(Retrieval-Augmented Generation), 왜 필요하고 어떻게 동작하는가]())', 1775450570000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_5__heojungseok', 'round_g2_5', 'part_g2_heojungseok', 'https://velog.io/@jungseokheo/taskflow-llm-retrospective', '[사이드 프로젝트에 LLM API 연동 (feat. Gemini)]()', 1775646156000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_5__chan9yu', 'round_g2_5', 'part_g2_chan9yu', 'https://www.chan9yu.dev/posts/harness-engineering-thoughts', '[요즘 에이전트 하네스에 대한 고민]()', 1775796841000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_5__areumH', 'round_g2_5', 'part_g2_areumH', 'https://m.blog.naver.com/ar9eum_/224236267340', '[3월간단일기..]()', 1775919294000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_5__ckdwns9121', 'round_g2_5', 'part_g2_ckdwns9121', 'https://long-aries-534.notion.site/pnpm-3392acd7231380778b4cec926d916be4?pvs=74', '[
pnpm은 어떻게 유령의존성을 제거햇을까]()', 1775979849000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_5__xxziiko', 'round_g2_5', 'part_g2_xxziiko', 'https://velog.io/@xxziiko/Apollo-Client-%EC%BA%90%EC%8B%9C%EB%8A%94-%EC%99%9C-normalized-cache%EC%9D%BC%EA%B9%8C', '[Apollo Client 캐시는 왜 normalized cache일까]()', 1775989499000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_5__realstone2', 'round_g2_5', 'part_g2_realstone2', 'https://jindol-blog-two.vercel.app/blog/340f43437bda804ba26cc6e83059b28a?lang=ko', '[1분기 회고 주저리주저리]() (그냥 일기임)', 1775992907000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_5__YeongseoYoon', 'round_g2_5', 'part_g2_YeongseoYoon', 'https://www.notion.so/yeong-seo/SVG-2-340cf63c62d3806abe1ffd994c47db6d?source=copy_link', '[svg 시리즈 2편 초안]()', 1775996064000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_5__BBAK-jun', 'round_g2_5', 'part_g2_BBAK-jun', 'https://bbakjun.notion.site/3-34042b6fc4ab80f088d7cca7097364fd', '입사 3개월회고', 1775999746000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_5__devchaeyoung', 'round_g2_5', 'part_g2_devchaeyoung', 'https://chaemaa.notion.site/API-3396a5e449c780109184d10e8feec7cf', '검색 API에서 보안 관점에서 반드시 챙겨야 할 것들', 1776001371000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_5__j2h30728', 'round_g2_5', 'part_g2_j2h30728', 'https://velog.io/@rachel28/rsc-dot-notation', 'Object.assign에서 re-export로 변경한 이유', 1776002757000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_5__BangDori', 'round_g2_5', 'part_g2_BangDori', 'https://bangdori.notion.site/340d7710c44f806cad4cc8ca6bdbad6f?pvs=74', '에후 내용이 너무 길어서 2주 내내 썻는데도 덜썻네용.. 마지막 섹션만 작성하고 회사 Medium에 업로드 예정입니당~', 1776002938000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_5__yuhyeon99', 'round_g2_5', 'part_g2_yuhyeon99', 'https://velog.io/@jujini31/테스트-커버리지', '정처기 공부겸 작성한 글..
[테스트 커버리지]()', 1776003359000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_5__eveneul', 'round_g2_5', 'part_g2_eveneul', 'https://velog.io/@eveneul/html-in-canvas로-영화-프로젝트-헤일메리-명장면-구현하기', '[canvas의 학교에 html-in-canvas의 등장이라..]()', 1776004688000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_5__angielxx', 'round_g2_5', 'part_g2_angielxx', 'https://angielxx.notion.site/3249e62ef9e580758151dd334d44f1f9?source=copy_link', '[함께 자라기를 읽고]()
저번보다 거의 더 못 써서 양심은 없지만 일단 제출은 합니다..', 1776004924000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_5__adds9810', 'round_g2_5', 'part_g2_adds9810', 'https://github.com/adds9810/next-tarot-app/blob/main/README.md', '예전에 했던 사이드 프로젝트 [README.md 조오금 업데이트]()', 1776005070000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_5__nemobim', 'round_g2_5', 'part_g2_nemobim', 'https://peripheral-nerv.tistory.com/manage/posts/', '[유레카톤 후기 쓰고있습니다.]()**
아직 초안!! 비번 1234', 1776005737000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_6__tooth-is-silver', 'round_g2_6', 'part_g2_tooth-is-silver', 'https://velog.io/@hying/토스-어시-회고', NULL, 1776070979000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_6__angielxx', 'round_g2_6', 'part_g2_angielxx', 'https://angielee-dev.vercel.app/blog/growing-up-together-review', '[『함께 자라기』를 읽고]()', 1776243687000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_6__eveneul', 'round_g2_6', 'part_g2_eveneul', 'https://www.notion.so/2026-1-344e379860f68099ae30c7c28a9aa553?source=copy_link', '[회고!]()', 1776325292000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_6__BangDori', 'round_g2_6', 'part_g2_BangDori', 'https://medium.com/creatrip/ai-%EB%A6%AC%EB%B7%B0%EB%A5%BC-%EC%8B%A0%EB%A2%B0%ED%95%A0-%EC%88%98-%EC%9E%88%EC%9D%84%EA%B9%8C%EC%9A%94-5eac4707a852', '[AI 리뷰를 신뢰할 수 있을까요?]()', 1776421390000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_6__JungWoo0203', 'round_g2_6', 'part_g2_JungWoo0203', 'https://meommu.tistory.com/14', NULL, 1777181444000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_6__heojungseok', 'round_g2_6', 'part_g2_heojungseok', 'https://github.com/user-attachments/files/27095652/_.pdf', '[허정석_이력서.pdf]()', 1777183500000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_6__areumH', 'round_g2_6', 'part_g2_areumH', 'https://github.com/user-attachments/files/27097729/_.pdf', '아마도 최종 수정본..
[한아름_이력서.pdf]()', 1777196847000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_6__realstone2', 'round_g2_6', 'part_g2_realstone2', 'https://jindol-blog-two.vercel.app/blog/34ef43437bda807ba175f4662969877a', '회사에서 auth 개선한 내용 간단히 정리해봤숨다..
(노션에서는 다이어그램 글씨가 다 보이는데, s3업로드하고나서는 사라져버림. why..? )', 1777201310000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_6__nemobim', 'round_g2_6', 'part_g2_nemobim', 'https://peripheral-nerv.tistory.com/entry/4%EC%9B%94-%ED%9A%8C%EA%B3%A0', '저도 회고 썼습니다.
[4월 회고]()', 1777203373000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_6__adds9810', 'round_g2_6', 'part_g2_adds9810', 'https://blog.naver.com/toto7971/224265885924', '곧 있음 5월 이길래 [5월 운세]() 들고와 봤습니다.', 1777204894000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_6__xxziiko', 'round_g2_6', 'part_g2_xxziiko', 'https://xxziiko.notion.site/Vite-ESM-pre-bundling-production-build-34b4ae05ecc7808799d7f68b174dacef', '[Vite의 개발 서버는 왜 빠를까: ESM, pre-bundling, production build 이해하기]()
초안 일단 목차만 구성,,', 1777207155000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_6__ckdwns9121', 'round_g2_6', 'part_g2_ckdwns9121', 'https://long-aries-534.notion.site/AWS-AI-DLC-34e2acd7231380c3a371df1e190eeb02?pvs=74', '[AWS 플랫폼 엔지니어링 모임 - 하네스 엔지니어링과 AI-DLC 플랫폼 내용 정리 초안]()', 1777209059000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_6__BBAK-jun', 'round_g2_6', 'part_g2_BBAK-jun', 'https://www.dev-bbak.site/blog/DEV/AI-CODING-HARNESS-DELEGATION', '위임과 암묵지', 1777211259000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_6__devchaeyoung', 'round_g2_6', 'part_g2_devchaeyoung', 'https://devchaeyoung.tistory.com/entry/AWSKRUG-%ED%94%8C%EB%9E%AB%ED%8F%BC-%EC%97%94%EC%A7%80%EB%8B%88%EC%96%B4%EB%A7%81-%EB%AA%A8%EC%9E%84-%ED%9B%84%EA%B8%B0-%ED%95%98%EB%84%A4%EC%8A%A4-%EC%97%94%EC%A7%80%EB%8B%88%EC%96%B4%EB%A7%81%EA%B3%BC-AI-DLC-%ED%94%8C%EB%9E%AB%ED%8F%BC', '[AWSKRUG 밋업 참여 후기 - 플랫폼 엔지니어링]()', 1777213028000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_6__yuhyeon99', 'round_g2_6', 'part_g2_yuhyeon99', 'https://velog.io/@jujini31/스프링-핵심-원리-기본-Spring을-통한-객체-지향-원리-적용-실습', '[스프링 핵심 원리 - 기본: Spring을 통한 객체 지향 원리 적용 실습]()', 1777213194000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_6__Legitgoons', 'round_g2_6', 'part_g2_Legitgoons', 'https://western-lumber-687.notion.site/1-4-34e61b83c948802b9db0f24bdb4446df?pvs=73', '[1/4분기 리뷰]()', 1777213599000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_6__YeongseoYoon', 'round_g2_6', 'part_g2_YeongseoYoon', 'https://www.yeongseo-blog.site/blog/svg-path-commands-anatomy', 'svg 2탄', 1777215048000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_6__j2h30728', 'round_g2_6', 'part_g2_j2h30728', 'https://www.notion.so/OpenAPI-spec-34de8c228b65802f8196f508831d4cab?source=copy_link', '초안의 초안
[opena api generator]()', 1777215281000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_6__chan9yu', 'round_g2_6', 'part_g2_chan9yu', 'https://github.com/user-attachments/files/27101107/default.pdf', '[여찬규 이력서.pdf]()
이력서 이번년도 업데이트 버전', 1777215391000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_7__eveneul', 'round_g2_7', 'part_g2_eveneul', 'https://github.com/eveneul/mjs-deep-dive-study/blob/master/week-5/README.md', '자바스크립트 공부했어여', 1778323443000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_7__BangDori', 'round_g2_7', 'part_g2_BangDori', 'https://bangdori.notion.site/35cd7710c44f8069bc05cc4d91ed56e0?source=copy_link', '[왜 테스트를 꺼려하는가]()
책 읽으면서 생각 정리', 1778390544000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_7__heojungseok', 'round_g2_7', 'part_g2_heojungseok', 'https://velog.io/@jungseokheo/java-multithreading-thread-visibility-synchronization', '자바 공부
[자바 - 멀티 쓰레드]()', 1778394246000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_7__tooth-is-silver', 'round_g2_7', 'part_g2_tooth-is-silver', 'https://velog.io/@hying/Type-vs-Interface', '타입스크립트 인사이트얻었던것 짧게 정리', 1778398799000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_7__BBAK-jun', 'round_g2_7', 'part_g2_BBAK-jun', 'https://www.dev-bbak.site/blog/DEV/chain-of-thought-still-useful', '분류 에이전트의 reasoning 필드를 계기로, Chain of Thought가 지금도 정확도 도구로 유효한지와 관측성 도구로 어떤 의미가 있는지 정리합니다.', 1778399969000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_7__YeongseoYoon', 'round_g2_7', 'part_g2_YeongseoYoon', 'https://www.notion.so/yeong-seo/LLM-Wiki-35ccf63c62d380f98f33cea6396b6a7f?source=copy_link', '[llm wiki는 새로운 패러다임일가 초안~]()', 1778401355000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_7__xxziiko', 'round_g2_7', 'part_g2_xxziiko', 'https://velog.io/@xxziiko/Vite%EC%9D%98-%EA%B0%9C%EB%B0%9C-%EC%84%9C%EB%B2%84%EB%8A%94-%EC%99%9C-%EB%B9%A0%EB%A5%BC%EA%B9%8C-ESM-pre-bundling-production-build-%EC%9D%B4%ED%95%B4%ED%95%98%EA%B8%B0', '[Vite의 개발 서버는 왜 빠를까: ESM, pre-bundling, production build 이해하기]()', 1778405829000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_7__areumH', 'round_g2_7', 'part_g2_areumH', 'https://m.blog.naver.com/ar9eum_/224270565863', '[4월 간단 일기]()', 1778409118000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_7__adds9810', 'round_g2_7', 'part_g2_adds9810', 'https://acute-trawler-1fb.notion.site/35c162e19b1380e094bbdbaa73216f55', '[공부중이라 어색한 연애운]()', 1778417904000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_7__JungWoo0203', 'round_g2_7', 'part_g2_JungWoo0203', 'https://meommu.tistory.com/16', '[이번 달 AI 동향 — 중국 오픈웨이트의 반격, 그리고 모이트가 모델에서 하드웨어로 이동한다]()', 1778418302000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_7__j2h30728', 'round_g2_7', 'part_g2_j2h30728', 'https://velog.io/@rachel28/openapi-codegen', 'open api generator 내용이욤. [OpenAPI spec과 프론트엔드 구조 사이의 경계]()', 1778418389000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_7__realstone2', 'round_g2_7', 'part_g2_realstone2', 'https://www.notion.so/E2E-AI-35cf43437bda807fa224f783e130b96a?source=copy_link', 'e2e 테스트 도입 초안글입니다.', 1778419717000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_7__devchaeyoung', 'round_g2_7', 'part_g2_devchaeyoung', 'https://devchaeyoung.tistory.com/entry/%EC%BF%A0%EB%B2%84%EB%84%A4%ED%8B%B0%EC%8A%A4-k8s-Secret-%EC%95%8C%EC%95%84%EB%B3%B4%EA%B8%B0-%EC%A0%80%EC%9E%A5-%EB%B0%A9%EC%8B%9D%EB%B6%80%ED%84%B0-KMS-Encryption%EA%B9%8C%EC%A7%80', '[[쿠버네티스] k8s Secret 알아보기 (저장 방식부터 KMS Encryption까지)]()', 1778420200000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_7__yuhyeon99', 'round_g2_7', 'part_g2_yuhyeon99', 'https://velog.io/@jujini31/웹-IDE-플랫폼-설계-및-시스템-활동-흐름-정리', '[웹 IDE 플랫폼 설계 및 시스템 활동 흐름 정리]()', 1778421280000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_7__ckdwns9121', 'round_g2_7', 'part_g2_ckdwns9121', 'https://long-aries-534.notion.site/AWS-Certified-Cloud-Practitioner-3572acd7231380b1a316e9196974fa9d', '[AWS 공부]()', 1778423761000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_7__nemobim', 'round_g2_7', 'part_g2_nemobim', 'https://peripheral-nerv.tistory.com/entry/%EB%93%B1%EC%82%B0%EB%B3%B5-%EC%9E%85%EA%B3%A0-%ED%8A%80%EC%96%B4-Cursor-Seoul-Hackathon-2nd-%ED%9B%84%EA%B8%B0', '[커서 해커톤 후기]()
작성완료', 1778424951000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_7__Legitgoons', 'round_g2_7', 'part_g2_Legitgoons', 'https://western-lumber-687.notion.site/35c61b83c94880ddb759cde328a9d91e?source=copy_link', '[클로드로 작성된 글을 읽기 힘든 이유]()', 1778425127000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_8__chan9yu', 'round_g2_8', 'part_g2_chan9yu', 'https://chan9yu.dev/posts/harness-build-monorepo-agents', '[실무 프로덕트에 하네스 구축해보기 (세 앱을 모노레포로 합치고 에이전트에 울타리를 쳐보자)
]()', 1778425613000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_8__tooth-is-silver', 'round_g2_8', 'part_g2_tooth-is-silver', 'https://velog.io/@hying/시대예보-경량문명의-탄생', NULL, 1779107863000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_8__yuhyeon99', 'round_g2_8', 'part_g2_yuhyeon99', 'https://velog.io/@jujini31/Chrome-DevTools-MCP를-Codex에-연결해-Lighthouse-측정하고-바로-개선해본-기록', '[Codex에 Chrome DevTools MCP를 붙여 Lighthouse 점검해본 기록]()', 1779365157000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_8__YeongseoYoon', 'round_g2_8', 'part_g2_YeongseoYoon', 'https://www.yeongseo-blog.site/blog/svg-optimization-icon-system', '[svg 3편]()', 1779618164000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_8__BBAK-jun', 'round_g2_8', 'part_g2_BBAK-jun', 'https://www.dev-bbak.site/blog/DEV/agent-evaluation-golden-set', 'AI 에이전트는 어떻게 평가해야하는가에 관하여 글을 썼어요', 1779618257000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_8__xxziiko', 'round_g2_8', 'part_g2_xxziiko', 'https://xxziiko.notion.site/3-GraphQL-36a4ae05ecc7801d8335ed5e40f539a2', '일단 목차만 구성햇읍니다,,', 1779623293000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_8__heojungseok', 'round_g2_8', 'part_g2_heojungseok', 'https://github.com/user-attachments/files/28191856/java-.-.-.pdf', '공부한 내용을 정리한 초안입니다. 감사합니다
[java-생성자-소비자-초안.pdf]()', 1779623486000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_8__nemobim', 'round_g2_8', 'part_g2_nemobim', 'https://m.blog.naver.com/don-2/224290735223', '이번주차는 진짜 똥글 제출합니다 일상블로그..', 1779624701000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_8__JungWoo0203', 'round_g2_8', 'part_g2_JungWoo0203', 'https://meommu.tistory.com/19', NULL, 1779629606000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_8__realstone2', 'round_g2_8', 'part_g2_realstone2', 'https://jindol-blog-two.vercel.app/blog/365f43437bda807f825cfdcffbfa15d9?lang=ko#', '[AI 에게 위임할 수 있는 일과 없는 일 (e2e 자동화 플로우 구축해보기)]()', 1779632134000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_8__adds9810', 'round_g2_8', 'part_g2_adds9810', 'https://blog.naver.com/toto7971/224295406094', '[6월 운세]()', 1779632733000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_8__BangDori', 'round_g2_8', 'part_g2_BangDori', 'https://www.bangdori.kr/blog/dont-close-the-loop-with-ai', '[바보야, AI한테 다 맡기고 루프를 닫으면 어떡해]()', 1779634182000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_8__j2h30728', 'round_g2_8', 'part_g2_j2h30728', 'https://www.notion.so/36ae8c228b6580c5a6abed91e870dbc4?source=copy_link', '도서 서평 작성을 위해 읽으면서 메모하고 내용(개발가 블로그도 잘 써야하나요 ? 1~3챕터)
-', 1779634346000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g2_8__Legitgoons', 'round_g2_8', 'part_g2_Legitgoons', 'https://western-lumber-687.notion.site/35561b83c94880789223c185015ec7c1?source=copy_link', '[김선태 이벤트 회고(작성 중)]()', 1779634487000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_1__BBAK-jun', 'round_g3_1', 'part_g3_BBAK-jun', 'https://xxziiko.notion.site/GraphQL-3844ae05ecc7804b8c9bf9574aae0eea', '일단 초안(일요일에 업로드 할 수도!!)
<!--
donguel_metadata:
generation: 3
cycle: 1
written_by: xxziiko
source_issue: 
source_comment: 
original_created_at: 2026-06-19T07:06:51Z
original_updated_at: 2026-06-19T07:06:51Z
migrated_by: Hermes
-->', 1782091805000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_1__BBAK-jun', 'round_g3_1', 'part_g3_BBAK-jun', 'https://velog.io/@jujini31/Spring-Boot에서-Docker로-MySQL-연동하기', '[Spring Boot에서 Docker로 MySQL 연동하기]()
<!--
donguel_metadata:
generation: 3
cycle: 1
written_by: yuhyeon99
source_issue: 
source_comment: 
original_created_at: 2026-06-19T07:25:19Z
original_updated_at: 2026-06-19T07:25:19Z
migrated_by: Hermes
-->', 1782091806000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_1__BBAK-jun', 'round_g3_1', 'part_g3_BBAK-jun', 'https://velog.io/@areumh__9/vanilla-extract-%EA%B3%B5%EB%B6%80%ED%95%98%EA%B8%B0', '[vanilla-extract 공부하기]()
<!--
donguel_metadata:
generation: 3
cycle: 1
written_by: areumH
source_issue: 
source_comment: 
original_created_at: 2026-06-19T10:57:20Z
original_updated_at: 2026-06-19T10:57:20Z
migrated_by: Hermes
-->', 1782091807000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_1__BBAK-jun', 'round_g3_1', 'part_g3_BBAK-jun', 'https://chan9yu.dev/posts/radio-system-design-01', '[[RADIO로 시스템 디자인하기 #1] RADIO 프레임워크로 채팅 앱 설계 부숴보기
]()
<!--
donguel_metadata:
generation: 3
cycle: 1
written_by: chan9yu
source_issue: 
source_comment: 
original_created_at: 2026-06-20T15:10:32Z
original_updated_at: 2026-06-21T14:19:21Z
migrated_by: Hermes
-->', 1782091809000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_1__BBAK-jun', 'round_g3_1', 'part_g3_BBAK-jun', 'https://github.com/user-attachments/files/29171050/svg-path-seam-blog.html', '[svg-path-seam-blog.html]() 초안
<!--
donguel_metadata:
generation: 3
cycle: 1
written_by: YeongseoYoon
source_issue: 
source_comment: 
original_created_at: 2026-06-21T04:21:41Z
original_updated_at: 2026-06-21T04:21:41Z
migrated_by: Hermes
-->', 1782091810000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_1__BBAK-jun', 'round_g3_1', 'part_g3_BBAK-jun', 'https://app.notion.com/p/bbakjun/Resume-23a42b6fc4ab8089846ad62783cb0e3b', '이력서를 작성했습니다
[ASIS]()
<!--
donguel_metadata:
generation: 3
cycle: 1
written_by: BBAK-jun
source_issue: 
source_comment: 
original_created_at: 2026-06-21T05:01:51Z
original_updated_at: 2026-06-21T05:03:02Z
migrated_by: Hermes
-->', 1782091811000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_1__BBAK-jun', 'round_g3_1', 'part_g3_BBAK-jun', 'https://www.notion.so/angielxx/2026-3869e62ef9e580259149f0950ed7b12c?source=copy_link', '초안입니다!
<!--
donguel_metadata:
generation: 3
cycle: 1
written_by: angielxx
source_issue: 
source_comment: 
original_created_at: 2026-06-21T14:13:05Z
original_updated_at: 2026-06-21T14:13:05Z
migrated_by: Hermes
-->', 1782091812000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_2__areumH', 'round_g3_2', 'part_g3_areumH', 'https://velog.io/@areumh__9/%EC%8A%A4%ED%83%80%EC%9D%BC-%EC%9A%B0%EC%84%A0%EC%88%9C%EC%9C%84-%EA%B3%B5%EB%B6%80%ED%95%98%EA%B8%B0', '[스타일 우선순위 공부하기]()', 1782645892000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_2__angielxx', 'round_g3_2', 'part_g3_angielxx', 'https://www.notion.so/angielxx/2026-3869e62ef9e580259149f0950ed7b12c?source=copy_link', '2026 상반기 회고 작성중', 1783072268000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_2__xxziiko', 'round_g3_2', 'part_g3_xxziiko', 'https://velog.io/@xxziiko/GraphQL-%EC%97%90%EB%9F%AC-%EC%96%B4%EB%96%BB%EA%B2%8C-%EB%8B%A4%EB%A4%84%EC%95%BC-%ED%95%A0%EA%B9%8C', '[GraphQL 에러, 어떻게 다뤄야 할까]()', 1783180757000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_2__YeongseoYoon', 'round_g3_2', 'part_g3_YeongseoYoon', 'https://www.yeongseo-blog.site/blog/memoir_2026_first_half', '회공', 1783240510000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_2__BBAK-jun', 'round_g3_2', 'part_g3_BBAK-jun', 'https://dev-bbak.site/blog/DEV/cognitive-intent-debt', '최근 지속가능성에 관해 많이 고민하고있어요
에이전트 시스템을 만들면서 지속가능성에 대해서 글을 써보았슴니당', 1783241326000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_2__j2h30728', 'round_g3_2', 'part_g3_j2h30728', 'https://app.notion.com/p/2026-394e8c228b65806dbc5af2bc2c191a38?source=copy_link', '[2026년 상반기 정산글 작성 중중중]()', 1783261338000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_2__Legitgoons', 'round_g3_2', 'part_g3_Legitgoons', 'https://western-lumber-687.notion.site/38f61b83c94880078fd3c7ab9cd9b50e?pvs=74', '[상반기 회고(작성 중)]()', 1783261816000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_2__yuhyeon99', 'round_g3_2', 'part_g3_yuhyeon99', 'https://velog.io/@jujini31/DTO에서는-왜-Record를-사용할까', '[DTO에서는 왜 Record를 사용할까]()', 1783262218000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_2__chan9yu', 'round_g3_2', 'part_g3_chan9yu', 'https://chan9yu.dev/posts/radio-system-design-02', '[[RADIO로 시스템 디자인하기 #2] 자동완성 검색창 설계 초안입니당]()', 1783262900000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_2__nemobim', 'round_g3_2', 'part_g3_nemobim', 'https://peripheral-nerv.tistory.com/entry/%EB%8F%84%EC%84%9C%EC%9E%90%EA%B8%B0%EA%B3%84%EB%B0%9C-%ED%98%B8%EA%B0%90%EC%9D%98-%EB%94%94%ED%85%8C%EC%9D%BC-w%EB%A0%88%EC%9D%BC-%EB%9D%BC%EC%9A%B4%EC%A6%88', '[도서자기계발-호감의-디테일-w레일-라운즈]()
인간관계에 대한 팁 책을 읽어보았습니다.', 1783263403000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_2__realstone2', 'round_g3_2', 'part_g3_realstone2', 'https://jindol-blog-two.vercel.app/blog/394f43437bda81599b8bc1f00948d90b', '[PC/MOBILE 반응형 웹 개발 어떻게 해야되는걸까?(진짜 모름) ]()', 1783263473000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_2__Legitgoons', 'round_g3_2', 'part_g3_Legitgoons', 'https://velog.io/@areumh__9/%EC%8A%A4%ED%83%80%EC%9D%BC-%EC%9A%B0%EC%84%A0%EC%88%9C%EC%9C%84-%EA%B3%B5%EB%B6%80%ED%95%98%EA%B8%B0', '@areumH [스타일 우선순위 공부하기]()
단순히 id, class, 태그 순으로 우선순위가 동작한다는건 알고 있었는데 명시도의 개념은 처음 알게되었네요.
그리고 자바스크립트 단에서 결합하는 순서는 의미가 없어서 오히려 flaky한 버그의 원인이 될 수 있다는 부분도 흥미로웠습니다.
문제를 발견하고 어떻게 꼼꼼하게 해결해나갔는지가 드러나서 아름님의 강점이 잘 드러나는 글인 것 같아요!
잘 읽었습니다 감사합니다!', 1783532493000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_2__nemobim', 'round_g3_2', 'part_g3_nemobim', 'https://western-lumber-687.notion.site/38f61b83c94880078fd3c7ab9cd9b50e', '@Legitgoons  [상반기회고(회사)]()
회고 잘 읽었습니다. 입사한지 이제 3개월 지나보이는데 많은걸 하셨네요 굿
바쁘다는 명목 아래에서 너무 많은 것을 뭉게고 넘어가는게 아닐까라는 걱정이 늘어나고 있다.
저도 급한 개발건을 ai로 쳐내고는 하는데 이런게 의미가 있을까? 내가 정말 이 코드를 이해하고 있나? 싶은 회의감이 들때가 있습니다. 그래서 가능한 문서를 많이 남겨두는거 같아요 이걸 다시 읽을지는 모르겠지만! 암튼 회고  잘 읽었습니다.
사용중인 기술부터 조금씩 학습하는것을 목표로 매일 출근 후 30분을 기술적인 학습에 투자해볼 생각이다. 
멋지다 잘 지켜내길 화이팅', 1783574968000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_3__chan9yu', 'round_g3_3', 'part_g3_chan9yu', 'https://chan9yu.dev/posts/radio-system-design-03', '[[RADIO로 시스템 디자인하기 #3] 실시간 채팅 앱 설계 부숴보기]()', 1783646797000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_3__YeongseoYoon', 'round_g3_3', 'part_g3_YeongseoYoon', 'https://github.com/user-attachments/files/30151093/_.pdf', '[윤영서_이력서.pdf]()', 1784379089000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_3__areumH', 'round_g3_3', 'part_g3_areumH', 'https://velog.io/@areumh__9/%EB%94%94%EC%9E%90%EC%9D%B8-%EC%8B%9C%EC%8A%A4%ED%85%9C-%EC%8A%A4%EB%82%B5%EB%B0%94-%EA%B5%AC%ED%98%84%EA%B8%B0', '[디자인 시스템 스낵바 구현기]()', 1784388041000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_3__BBAK-jun', 'round_g3_3', 'part_g3_BBAK-jun', 'https://www.dev-bbak.site/blog/DEV/frontend-rbac-permission-gate', '프론트엔드에서 RBAC를 어떻게해야 잘할까를 고민해보았어요', 1784443468000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_3__xxziiko', 'round_g3_3', 'part_g3_xxziiko', 'https://xxziiko.notion.site/Fragment-Colocation-3a24ae05ecc78035a21dc645d3a3a442', '[graphQL 4편:컴포넌트는 왜 자기 데이터를 스스로 선언해야 할까 — Fragment Colocation]()
아주 초안입니다', 1784465857000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_3__realstone2', 'round_g3_3', 'part_g3_realstone2', 'https://github.com/user-attachments/files/30165408/_.pdf', '[여진석_이력서.pdf]()
오랜만에 이력서 업데이트 해봤습니당', 1784466458000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_3__yuhyeon99', 'round_g3_3', 'part_g3_yuhyeon99', 'https://velog.io/@jujini31/AWS-ECS-Fargate로-Spring-Boot-백엔드-배포하기초안', '[ECS Fargate로 Spring Boot 백엔드 배포하기]()
초안입니다', 1784469678000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_3__nemobim', 'round_g3_3', 'part_g3_nemobim', 'https://github.com/user-attachments/files/30166320/2026-master.pdf', '[2026-정도은-이력서.pdf]()
일단 이력서 썼습니다... 1안이라 추후에 보완할 예정', 1784470862000);
INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES
  ('round_g3_3__Legitgoons', 'round_g3_3', 'part_g3_Legitgoons', 'https://western-lumber-687.notion.site/38f61b83c94880078fd3c7ab9cd9b50e?source=copy_link', '[상반기 회고]()', 1784473161000);


-- ─── 통계 요약 ──────────────────────────────────────────
-- 코호트 수: 3
-- 회차 수: 24
-- 참여자 수: 21
-- 제출 수: 298
-- 리뷰(인용) 댓글 스킵: 22건 (PRD 한계: reviews 테이블 추가 시 보존 가능)
-- URL 없는 댓글 스킵: 12건
--
-- 코호트별 회차 목록:
--   1기 (9월 28일 ~ 01월 18일): 8회차
--   2기 (01월 16일 ~ 05월 24일): 8회차
--   3기 (06월 08일 ~ 09월 27일): 8회차

-- 멤버 목록 (login → user_key):
--   BBAK-jun             → 1001 (박준형)
--   BangDori             → 1002 (BangDori)
--   JungWoo0203          → 1003 (JungWoo0203)
--   Legitgoons           → 1004 (이의찬)
--   YeongseoYoon         → 1005 (윤영서)
--   adds9810             → 1006 (김지혜)
--   angielxx             → 1007 (이은지)
--   areumH               → 1008 (아름)
--   chan9yu              → 1009 (여찬규)
--   ckdwns9121           → 1010 (ChangJun Park)
--   devchaeyoung         → 1011 (CharlieJin)
--   eveneul              → 1012 (eve)
--   heojungseok          → 1013 (jungseok.heo)
--   hyojin-k             → 1014 (HYOJIN)
--   j2h30728             → 1015 (Dahm)
--   nemobim              → 1016 (Doeun)
--   pitangland           → 1017 (Kim Wonpyo)
--   realstone2           → 1018 (진돌)
--   tooth-is-silver      → 1019 (Ga eun Lee)
--   xxziiko              → 1020 (권지호)
--   yuhyeon99            → 1021 (yuhyeon99)