import { useState } from 'react';
import { Button, ListHeader, ListRow, Paragraph, Spacing, TextField } from '@toss/tds-mobile';
import type { LogLevel, LogRow, LogSource } from '@studyops/shared';
import { LOG_LEVELS } from '@studyops/shared';

import { ErrorBoundary } from '../../components/ErrorBoundary';
import { ApiError } from '../../lib/api-client';
import { useLogsInfiniteQuery, useInvalidateLogs } from '../../query/logQueries';

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '#8B95A1',
  info: '#3182F6',
  warn: '#F59E0B',
  error: '#EF4444',
  fatal: '#991B1B',
};

const SOURCES: LogSource[] = ['client', 'server', 'cron', 'mcp'];

export function LogsPage() {
  const [level, setLevel] = useState<LogLevel | ''>('');
  const [source, setSource] = useState<LogSource | ''>('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const params = {
    ...(level ? { level } : {}),
    ...(source ? { source } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
    limit: 50,
  };

  const { data, error, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useLogsInfiniteQuery(params);

  const invalidateLogs = useInvalidateLogs();

  const errorMessage = error instanceof ApiError ? error.message : error ? '로그를 불러오지 못했어요.' : null;

  const allLogs: LogRow[] = data?.pages.flatMap((p) => p.logs) ?? [];
  const total = data?.pages[0]?.total;

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void refetch();
  };

  return (
    <ErrorBoundary>
      {/* 필터 */}
      <form onSubmit={handleFilterSubmit} style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as LogLevel | '')}
            style={selectStyle}
          >
            <option value="">모든 레벨</option>
            {LOG_LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          <select
            value={source}
            onChange={(e) => setSource(e.target.value as LogSource | '')}
            style={selectStyle}
          >
            <option value="">모든 소스</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <Spacing size={8} />
        <TextField
          variant="box"
          placeholder="메시지 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Spacing size={8} />
        <Button type="submit" variant="weak" size="small" display="block">
          필터 적용
        </Button>
      </form>

      {/* 에러 */}
      {errorMessage ? (
        <div style={{ padding: '0 24px 16px' }}>
          <Paragraph typography="t6" color="#EF4444">{errorMessage}</Paragraph>
          <Spacing size={8} />
          <Button size="small" onClick={() => void invalidateLogs()}>다시 시도</Button>
        </div>
      ) : null}

      {/* 로딩 */}
      {isLoading ? (
        <div style={{ padding: 24 }}>
          <Paragraph typography="t6" color="#8B95A1">불러오는 중…</Paragraph>
        </div>
      ) : null}

      {/* 로그 목록 */}
      {!isLoading && data ? (
        allLogs.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Paragraph typography="t6" color="#8B95A1">로그가 없어요.</Paragraph>
          </div>
        ) : (
          <>
            <ListHeader title={`로그 (${allLogs.length}${total ? ` / ${total}` : ''})`} />
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {allLogs.map((log) => (
                <LogRowItem
                  key={log.id}
                  log={log}
                  expanded={expandedId === log.id}
                  onToggle={() =>
                    setExpandedId(expandedId === log.id ? null : log.id)
                  }
                />
              ))}
            </ul>

            {hasNextPage ? (
              <div style={{ padding: '16px 24px' }}>
                <Button
                  variant="weak"
                  display="block"
                  loading={isFetchingNextPage}
                  onClick={() => void fetchNextPage()}
                >
                  더 보기
                </Button>
              </div>
            ) : null}
          </>
        )
      ) : null}
    </ErrorBoundary>
  );
}

function LogRowItem({
  log,
  expanded,
  onToggle,
}: {
  log: LogRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const time = new Date(log.ts).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <ListRow
      verticalPadding="medium"
      withTouchEffect
      onClick={onToggle}
      contents={
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                display: 'inline-block',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                color: '#fff',
                background: LEVEL_COLORS[log.level],
                minWidth: 36,
                textAlign: 'center',
              }}
            >
              {log.level.toUpperCase()}
            </span>
            <Paragraph typography="t7" color="#8B95A1">
              {time}
            </Paragraph>
            <Paragraph typography="t7" color="#8B95A1">
              · {log.source}
            </Paragraph>
          </div>
          <Spacing size={4} />
          <Paragraph typography="t6" fontWeight="medium">
            {log.message}
          </Paragraph>
          <Paragraph typography="t7" color="#8B95A1">
            {log.event}
          </Paragraph>

          {expanded ? (
            <>
              <Spacing size={8} />
              <div
                style={{
                  background: '#fff',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: '#333',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {log.context ? (
                  <DetailRow label="context" value={JSON.stringify(log.context, null, 2)} />
                ) : null}
                {log.stack ? (
                  <DetailRow label="stack" value={log.stack} />
                ) : null}
                {log.requestId ? (
                  <DetailRow label="requestId" value={log.requestId} />
                ) : null}
                {log.sessionId ? (
                  <DetailRow label="sessionId" value={log.sessionId} />
                ) : null}
                {log.path ? (
                  <DetailRow
                    label="http"
                    value={`${log.method ?? ''} ${log.path}${log.status ? ` ${log.status}` : ''}${log.durationMs != null ? ` (${log.durationMs}ms)` : ''}`}
                  />
                ) : null}
                <DetailRow label="env" value={`${log.env}${log.userAgent ? ` · ${log.userAgent}` : ''}`} />
              </div>
            </>
          ) : null}
        </>
      }
    />
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ color: '#8B95A1', fontWeight: 600 }}>{label}: </span>
      <span style={{ fontFamily: 'monospace' }}>{value}</span>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #E5E8EB',
  background: '#fff',
  fontSize: 14,
};
