import { useCallback, useEffect, useState } from 'react';
import type { LogLevel, LogQuery, LogQueryResult, LogRow, LogSource } from '@studyops/shared';
import { LOG_LEVELS } from '@studyops/shared';
import { useQueryStates, parseAsString } from 'nuqs';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { fetchLogs } from '../api/logs';

const SOURCES: LogSource[] = ['client', 'server', 'cron', 'mcp'];

export function LogsPage() {
  const [data, setData] = useState<LogQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [{ level, source }, setFilters] = useQueryStates({
    level: parseAsString,
    source: parseAsString,
  });
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const buildQuery = useCallback((cursor?: string): LogQuery => {
    const q: LogQuery = { limit: 50 };
    if (level) q.level = level as LogLevel;
    if (source) q.source = source as LogSource;
    if (search.trim()) q.search = search.trim();
    if (cursor) q.cursor = cursor;
    return q;
  }, [level, source, search]);

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await fetchLogs(buildQuery());
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : '로그를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleLoadMore = async () => {
    if (!data?.nextCursor) return;
    setLoadingMore(true);
    try {
      const result = await fetchLogs(buildQuery(data.nextCursor));
      setData((prev) => ({
        logs: [...(prev?.logs ?? []), ...result.logs],
        nextCursor: result.nextCursor,
        total: result.total,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : '추가 로그를 불러오지 못했어요.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    refresh();
  };

  return (
    <div className="app">
      <div className="app-header">
        <h1>로그 대시보드</h1>
        <span className="muted">StudyOps Admin</span>
      </div>

      <ErrorBoundary>
        <form className="filters" onSubmit={handleFilterSubmit}>
          <select
            value={level ?? ''}
            onChange={(e) => setFilters({ level: e.target.value || null })}
          >
            <option value="">모든 레벨</option>
            {LOG_LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          <select
            value={source ?? ''}
            onChange={(e) => setFilters({ source: e.target.value || null })}
          >
            <option value="">모든 소스</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="메시지 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button type="submit" className="btn btn-primary">필터 적용</button>
        </form>

        {error ? (
          <div className="error-msg">
            {error}
            <button className="btn btn-secondary" onClick={refresh} style={{ marginLeft: 8 }}>
              다시 시도
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="loading">불러오는 중…</div>
        ) : null}

        {!loading && data ? (
          data.logs.length === 0 ? (
            <div className="empty">로그가 없어요.</div>
          ) : (
            <>
              <div className="log-meta" style={{ marginBottom: 8 }}>
                로그 {data.logs.length}개{data.total ? ` / 총 ${data.total}개` : ''}
              </div>
              <ul className="log-list">
                {data.logs.map((log) => (
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

              {data.nextCursor ? (
                <div className="load-more">
                  <button
                    className="btn btn-secondary btn-block"
                    disabled={loadingMore}
                    onClick={handleLoadMore}
                  >
                    {loadingMore ? '불러오는 중…' : '더 보기'}
                  </button>
                </div>
              ) : null}
            </>
          )
        ) : null}
      </ErrorBoundary>
    </div>
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
    <li className="log-item" onClick={onToggle}>
      <div className="log-header">
        <span className={`level-badge level-${log.level}`}>
          {log.level.toUpperCase()}
        </span>
        <span className="log-meta">{time}</span>
        <span className="log-meta">· {log.source}</span>
      </div>
      <div className="log-message">{log.message}</div>
      <div className="log-event">{log.event}</div>

      {expanded ? (
        <div className="log-detail">
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
          <DetailRow
            label="env"
            value={`${log.env}${log.userAgent ? ` · ${log.userAgent}` : ''}`}
          />
        </div>
      ) : null}
    </li>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}: </span>
      <span>{value}</span>
    </div>
  );
}
