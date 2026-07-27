import { useCallback, useEffect, useState } from 'react';
import { Button, ListHeader, Paragraph, Spacing, TextField } from '@toss/tds-mobile';
import type { LogLevel } from '@studyops/shared';
import { LOG_LEVELS } from '@studyops/shared';
import type { ArchiveStats, ArchiveQuery, ArchiveQueryResult, ArchiveRow } from '@studyops/shared';
import { ApiError } from '../../api/client';
import { fetchArchiveStats, fetchArchiveQuery } from '../../api/logs';

// ADR-014 Phase 4 — R2 JSONL 아카이브 쿼리 패널. LogsPage 내부 탭으로 마운트.
// R2 객체 목록(stats)과 필터 기반 JSONL 스캔(query) 두 뷰를 토글.

type View = 'stats' | 'query';

const LEVEL_COLORS: Record<string, string> = {
  debug: '#8B95A1',
  info: '#3182F6',
  warn: '#F59E0B',
  error: '#EF4444',
  fatal: '#991B1B',
};

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #E5E8EB',
  background: '#fff',
  fontSize: 14,
};

export function LogsArchivePanel() {
  const [view, setView] = useState<View>('stats');
  const [stats, setStats] = useState<ArchiveStats | null>(null);
  const [queryResult, setQueryResult] = useState<ArchiveQueryResult | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [queryLoading, setQueryLoading] = useState(false);

  // query 필터
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [level, setLevel] = useState<LogLevel | ''>('');
  const [event, setEvent] = useState('');
  const [search, setSearch] = useState('');

  const loadStats = useCallback(async () => {
    setStatsError(null);
    setStatsLoading(true);
    try {
      const result = await fetchArchiveStats();
      setStats(result);
    } catch (e) {
      setStatsError(e instanceof ApiError ? e.message : '아카이브 통계를 불러오지 못했어요.');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const runQuery = useCallback(async () => {
    setQueryError(null);
    setQueryLoading(true);
    try {
      const params: ArchiveQuery = { limit: 100 };
      if (year.trim()) params.year = Number(year);
      if (month.trim()) params.month = Number(month);
      if (level) params.level = level;
      if (event.trim()) params.event = event.trim();
      if (search.trim()) params.search = search.trim();
      const result = await fetchArchiveQuery(params);
      setQueryResult(result);
    } catch (e) {
      setQueryError(e instanceof ApiError ? e.message : '아카이브 쿼리를 실행하지 못했어요.');
    } finally {
      setQueryLoading(false);
    }
  }, [year, month, level, event, search]);

  useEffect(() => {
    if (view === 'stats' && stats === null) loadStats();
  }, [view, stats, loadStats]);

  return (
    <section style={{ padding: '16px 0', borderBottom: '1px solid #E5E8EB' }}>
      <ListHeader title="아카이브 (R2)" />

      <div style={{ display: 'flex', gap: 6, padding: '0 16px 8px' }}>
        {(['stats', 'query'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            style={{
              padding: '6px 12px',
              borderRadius: 16,
              border: '1px solid',
              borderColor: view === v ? '#3182F6' : '#E5E8EB',
              background: view === v ? '#3182F6' : '#fff',
              color: view === v ? '#fff' : '#4E5968',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {v === 'stats' ? '객체 목록' : '쿼리'}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 16px' }}>
        {view === 'stats' ? (
          <StatsView
            stats={stats}
            error={statsError}
            loading={statsLoading}
            onRefresh={loadStats}
          />
        ) : (
          <QueryView
            result={queryResult}
            error={queryError}
            loading={queryLoading}
            filterProps={{
              year, setYear,
              month, setMonth,
              level, setLevel,
              event, setEvent,
              search, setSearch,
            }}
            onRun={runQuery}
          />
        )}
      </div>
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
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Button size="small" variant="weak" loading={loading} onClick={onRefresh}>
          새로고침
        </Button>
        {stats ? (
          <Paragraph typography="t7" color="#8B95A1">
            {stats.objectCount}개 · {formatBytes(stats.totalBytes)}
          </Paragraph>
        ) : null}
      </div>

      {error ? (
        <Paragraph typography="t6" color={error.startsWith('R2') ? '#F59E0B' : '#EF4444'}>
          {error}
        </Paragraph>
      ) : loading ? (
        <Paragraph typography="t6" color="#8B95A1">불러오는 중…</Paragraph>
      ) : !stats || stats.objectCount === 0 ? (
        <Paragraph typography="t6" color="#8B95A1">아카이브된 객체가 없어요.</Paragraph>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {stats.partitions.map((p) => (
            <li
              key={p.key}
              style={{
                background: '#fff',
                borderRadius: 8,
                padding: '8px 12px',
                border: '1px solid #E5E8EB',
                fontSize: 12,
              }}
            >
              <div style={{ fontFamily: 'monospace', color: '#333', wordBreak: 'break-all' }}>
                {p.key}
              </div>
              <div style={{ color: '#8B95A1', marginTop: 4 }}>
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
    level, setLevel,
    event, setEvent,
    search, setSearch,
  } = filterProps;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRun(e);
  };

  return (
    <>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            placeholder="연도(YYYY)"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            style={{ ...selectStyle, flex: 1 }}
          />
          <input
            type="number"
            placeholder="월(MM)"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{ ...selectStyle, flex: 1 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as LogLevel | '')}
            style={{ ...selectStyle, flex: 1 }}
          >
            <option value="">모든 레벨</option>
            {LOG_LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="이벤트명"
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            style={{ ...selectStyle, flex: 1 }}
          />
        </div>
        <TextField
          variant="box"
          placeholder="메시지 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="submit" variant="weak" size="small" display="block" loading={loading}>
          쿼리 실행
        </Button>
      </form>

      {error ? (
        <Paragraph typography="t6" color={error.startsWith('R2') ? '#F59E0B' : '#EF4444'}>
          {error}
        </Paragraph>
      ) : !result ? (
        <Paragraph typography="t6" color="#8B95A1">필터를 설정하고 쿼리를 실행하세요.</Paragraph>
      ) : result.rows.length === 0 ? (
        <Paragraph typography="t6" color="#8B95A1">매칭되는 로그가 없어요.</Paragraph>
      ) : (
        <>
          <Paragraph typography="t7" color="#8B95A1" style={{ marginBottom: 8 }}>
            {result.rows.length}행 · {result.scannedObjects}객체 스캔{result.truncated ? ' · 잘림' : ''}
          </Paragraph>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {result.rows.map((row, idx) => (
              <ArchiveRowItem key={`${row.ts}-${idx}`} row={row} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function ArchiveRowItem({ row }: { row: ArchiveRow }) {
  const time = new Date(row.ts).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const levelColor = LEVEL_COLORS[row.level] ?? '#8B95A1';

  return (
    <li
      style={{
        background: '#fff',
        borderRadius: 8,
        padding: '8px 12px',
        border: '1px solid #E5E8EB',
        fontSize: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span
          style={{
            display: 'inline-block',
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
            color: '#fff',
            background: levelColor,
            minWidth: 32,
            textAlign: 'center',
          }}
        >
          {row.level.toUpperCase()}
        </span>
        <span style={{ color: '#8B95A1', fontSize: 11 }}>{time}</span>
        <span style={{ color: '#8B95A1', fontSize: 11 }}>· {row.source}</span>
      </div>
      <div style={{ color: '#333', fontWeight: 500 }}>{row.message}</div>
      <div style={{ color: '#8B95A1', marginTop: 2 }}>{row.event}</div>
    </li>
  );
}

interface FilterProps {
  year: string;
  setYear: (v: string) => void;
  month: string;
  setMonth: (v: string) => void;
  level: LogLevel | '';
  setLevel: (v: LogLevel | '') => void;
  event: string;
  setEvent: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
