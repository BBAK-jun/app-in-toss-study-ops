import { useCallback, useEffect, useState } from 'react';
import type { LogLevel } from '@studyops/shared';
import { LOG_LEVELS } from '@studyops/shared';
import type { ArchiveStats, ArchiveQuery, ArchiveQueryResult } from '@studyops/shared';
import { fetchArchiveStats, fetchArchiveQuery } from '../api/logs';

// ADR-014 Phase 4 — R2 JSONL 아카이브 쿼리 패널. LogsPage 내부 탭으로 마운트.
// R2 객체 목록(stats)과 필터 기반 JSONL 스캔(query) 두 뷰를 토글.

type View = 'stats' | 'query';

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  border: '1px solid #d0d5dd',
  borderRadius: 6,
  fontSize: 13,
};

export function LogsArchivePanel() {
  const [view, setView] = useState<View>('stats');

  // Stats state
  const [stats, setStats] = useState<ArchiveStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Query state
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [level, setLevel] = useState<LogLevel | ''>('');
  const [event, setEvent] = useState('');
  const [search, setSearch] = useState('');
  const [queryResult, setQueryResult] = useState<ArchiveQueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  const loadStats = useCallback(async () => {
    setStatsError(null);
    setStatsLoading(true);
    try {
      setStats(await fetchArchiveStats());
    } catch (e) {
      setStatsError(e instanceof Error ? e.message : '아카이브 통계를 불러오지 못했어요.');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'stats') loadStats();
  }, [view, loadStats]);

  const runQuery = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setQueryError(null);
    setQueryLoading(true);
    try {
      const params: ArchiveQuery = { limit: 100 };
      if (year.trim()) params.year = Number(year);
      if (month.trim()) params.month = Number(month);
      if (day.trim()) params.day = Number(day);
      if (level) params.level = level;
      if (event.trim()) params.event = event.trim();
      if (search.trim()) params.search = search.trim();
      setQueryResult(await fetchArchiveQuery(params));
    } catch (e) {
      setQueryError(e instanceof Error ? e.message : '아카이브 쿼리를 실행하지 못했어요.');
    } finally {
      setQueryLoading(false);
    }
  }, [year, month, day, level, event, search]);

  return (
    <section>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['stats', 'query'] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={view === v ? 'btn btn-primary' : 'btn btn-secondary'}
          >
            {v === 'stats' ? '객체 목록' : '쿼리'}
          </button>
        ))}
      </div>

      {view === 'stats' ? (
        <StatsView stats={stats} error={statsError} loading={statsLoading} onRefresh={loadStats} />
      ) : (
        <QueryView
          result={queryResult}
          error={queryError}
          loading={queryLoading}
          filterProps={{
            year, setYear,
            month, setMonth,
            day, setDay,
            level, setLevel,
            event, setEvent,
            search, setSearch,
          }}
          onRun={runQuery}
        />
      )}
    </section>
  );
}

function StatsView({
  stats,
  error,
  loading,
  onRefresh,
}: {
  stats: ArchiveStats | null;
  error: string | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  if (loading) return <div className="loading">불러오는 중…</div>;
  if (error) return (
    <div className="error-msg">
      {error}
      <button className="btn btn-secondary" onClick={onRefresh} style={{ marginLeft: 8 }}>다시</button>
    </div>
  );
  if (!stats) return null;

  return (
    <>
      <div className="log-meta" style={{ marginBottom: 8 }}>
        객체 {stats.objectCount}개 · {formatBytes(stats.totalBytes)}
      </div>
      {stats.partitions.length === 0 ? (
        <div className="empty">아카이브된 객체가 없어요.</div>
      ) : (
        <ul className="log-list">
          {stats.partitions.map((p) => (
            <li key={p.key} className="log-item">
              <div style={{ fontWeight: 600, fontSize: 13, wordBreak: 'break-all' }}>
                {p.key}
              </div>
              <div className="log-meta">
                {formatBytes(p.size)}
                {p.uploaded ? ` · ${new Date(p.uploaded).toLocaleString('ko-KR')}` : ''}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

interface FilterProps {
  year: string;
  setYear: (v: string) => void;
  month: string;
  setMonth: (v: string) => void;
  day: string;
  setDay: (v: string) => void;
  level: LogLevel | '';
  setLevel: (v: LogLevel | '') => void;
  event: string;
  setEvent: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
}

function QueryView({
  result,
  error,
  loading,
  filterProps,
  onRun,
}: {
  result: ArchiveQueryResult | null;
  error: string | null;
  loading: boolean;
  filterProps: FilterProps;
  onRun: (e: React.FormEvent) => void;
}) {
  const {
    year, setYear,
    month, setMonth,
    day, setDay,
    level, setLevel,
    event, setEvent,
    search, setSearch,
  } = filterProps;

  return (
    <>
      <form className="filters" onSubmit={onRun} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="number" placeholder="연도(YYYY)" value={year} onChange={(e) => setYear(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          <input type="number" placeholder="월(MM)" value={month} onChange={(e) => setMonth(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          <input type="number" placeholder="일(DD)" value={day} onChange={(e) => setDay(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={level} onChange={(e) => setLevel(e.target.value as LogLevel | '')} style={{ ...inputStyle, flex: 1 }}>
            <option value="">모든 레벨</option>
            {LOG_LEVELS.map((l) => (<option key={l} value={l}>{l}</option>))}
          </select>
          <input type="text" placeholder="이벤트명" value={event} onChange={(e) => setEvent(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        </div>
        <input type="text" placeholder="메시지 검색..." value={search} onChange={(e) => setSearch(e.target.value)} style={inputStyle} />
        <button type="submit" className="btn btn-primary">쿼리 실행</button>
      </form>

      {error ? <div className="error-msg">{error}</div> : null}
      {loading ? <div className="loading">쿼리 중…</div> : null}

      {!loading && result ? (
        result.rows.length === 0 ? (
          <div className="empty">결과가 없어요. ({result.scannedObjects}개 객체 스캔)</div>
        ) : (
          <>
            <div className="log-meta" style={{ marginBottom: 8 }}>
              {result.rows.length}행{result.truncated ? ' (잘림)' : ''} · {result.scannedObjects}개 객체 스캔
            </div>
            <ul className="log-list">
              {result.rows.map((row, i) => (
                <li key={`${row.id}-${i}`} className="log-item">
                  <div className="log-header">
                    <span className={`level-badge level-${row.level}`}>{row.level.toUpperCase()}</span>
                    <span className="log-meta">{new Date(row.ts).toLocaleString('ko-KR')}</span>
                    <span className="log-meta">· {row.source}</span>
                  </div>
                  <div className="log-message">{row.message}</div>
                  <div className="log-event">{row.event}</div>
                </li>
              ))}
            </ul>
          </>
        )
      ) : null}
    </>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
