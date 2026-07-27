import { useCallback, useEffect, useState } from 'react';
import { Button, ListHeader, Paragraph, Spacing } from '@toss/tds-mobile';
import type {
  ErrorRateRow,
  LogMetricResult,
  LogMetricType,
  LogMetricWindow,
  LogLevel,
  LogMetricRow,
  P95DurationRow,
  TimeseriesRow,
  TopEventsRow,
} from '@studyops/shared';
import { ApiError } from '../../api/client';
import { fetchLogsMetrics } from '../../api/logs';

// ADR-013 Phase 4 — AE 집계 메트릭 패널. 기존 로그 리스트 위에 마운트.
// 외부 차트 라이브러리 없이 inline div 막대로 시각화.

const LEVEL_COLORS: Record<string, string> = {
  debug: '#8B95A1',
  info: '#3182F6',
  warn: '#F59E0B',
  error: '#EF4444',
  fatal: '#991B1B',
};

const LEVEL_ORDER: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];

const METRIC_TABS: { type: LogMetricType; label: string }[] = [
  { type: 'error_rate', label: '에러율' },
  { type: 'top_events', label: 'Top 이벤트' },
  { type: 'p95_duration', label: 'p95 지연' },
  { type: 'timeseries', label: '시계열' },
];

const WINDOWS: LogMetricWindow[] = ['1h', '6h', '24h', '7d', '30d'];

// ─── 타입 가드 ────────────────────────────────────────────────────────────
// LogMetricRow는 union 타입이라 rows[i] 직접 접근시 narrow 필요.
function isErrorRateRow(r: LogMetricRow): r is ErrorRateRow {
  return typeof (r as ErrorRateRow).error_count === 'number';
}
function isTopEventsRow(r: LogMetricRow): r is TopEventsRow {
  return typeof (r as TopEventsRow).count === 'number' && !isErrorRateRow(r);
}
function isP95Row(r: LogMetricRow): r is P95DurationRow {
  return typeof (r as P95DurationRow).p95_duration_ms === 'number';
}
function isTimeseriesRow(r: LogMetricRow): r is TimeseriesRow {
  return typeof (r as TimeseriesRow).bucket === 'string'
    && typeof (r as TimeseriesRow).level === 'string';
}

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #E5E8EB',
  background: '#fff',
  fontSize: 14,
};

export function LogsMetricsPanel() {
  const [type, setType] = useState<LogMetricType>('error_rate');
  const [window, setWindow] = useState<LogMetricWindow>('24h');
  const [data, setData] = useState<LogMetricResult | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await fetchLogsMetrics({ type, window, limit: 10 });
      setData(result);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError('INTERNAL_ERROR', '메트릭을 불러오지 못했어요.', 500));
    } finally {
      setLoading(false);
    }
  }, [type, window]);

  useEffect(() => { load(); }, [load]);

  return (
    <section style={{ padding: '16px 0', borderBottom: '1px solid #E5E8EB' }}>
      <ListHeader title="메트릭 (Analytics Engine)" />

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6, padding: '0 16px 8px', overflowX: 'auto' }}>
        {METRIC_TABS.map((t) => (
          <button
            key={t.type}
            type="button"
            onClick={() => setType(t.type)}
            style={{
              padding: '6px 12px',
              borderRadius: 16,
              border: '1px solid',
              borderColor: type === t.type ? '#3182F6' : '#E5E8EB',
              background: type === t.type ? '#3182F6' : '#fff',
              color: type === t.type ? '#fff' : '#4E5968',
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* window + 새로고침 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px 12px' }}>
        <select
          value={window}
          onChange={(e) => setWindow(e.target.value as LogMetricWindow)}
          style={selectStyle}
        >
          {WINDOWS.map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
        <Button size="small" variant="weak" loading={loading} onClick={load}>
          새로고침
        </Button>
        {data?.cached ? (
          <Paragraph typography="t7" color="#8B95A1">캐시됨</Paragraph>
        ) : null}
      </div>

      {/* 본문 */}
      <div style={{ padding: '0 16px' }}>
        {error ? (
          <Paragraph typography="t6" color={error.code === 'ANALYTICS_ENGINE_ERROR' ? '#F59E0B' : '#EF4444'}>
            {error.code === 'ANALYTICS_ENGINE_ERROR'
              ? 'Analytics Engine이 설정되지 않았어요. ADR-013 참조.'
              : error.message}
          </Paragraph>
        ) : loading ? (
          <Paragraph typography="t6" color="#8B95A1">불러오는 중…</Paragraph>
        ) : !data || data.rows.length === 0 ? (
          <Paragraph typography="t6" color="#8B95A1">데이터가 없어요.</Paragraph>
        ) : (
          <MetricView type={type} rows={data.rows} />
        )}
      </div>
    </section>
  );
}

// ─── 메트릭별 렌더 ──────────────────────────────────────────────────────────
function MetricView({ type, rows }: { type: LogMetricType; rows: LogMetricRow[] }) {
  if (type === 'error_rate') {
    const filtered = rows.filter(isErrorRateRow);
    if (filtered.length === 0) return <EmptyHint />;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((r) => {
          const rate = r.total_count > 0 ? (r.error_count / r.total_count) * 100 : 0;
          return (
            <BarRow
              key={r.event}
              label={r.event}
              right={`${rate.toFixed(1)}% (${r.error_count}/${r.total_count})`}
              pct={rate}
              color="#EF4444"
            />
          );
        })}
      </div>
    );
  }

  if (type === 'top_events') {
    const filtered = rows.filter(isTopEventsRow);
    if (filtered.length === 0) return <EmptyHint />;
    const max = Math.max(...filtered.map((r) => r.count), 1);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((r) => (
          <BarRow
            key={r.event}
            label={r.event}
            right={r.count.toLocaleString()}
            pct={(r.count / max) * 100}
            color="#3182F6"
          />
        ))}
      </div>
    );
  }

  if (type === 'p95_duration') {
    const filtered = rows.filter(isP95Row);
    if (filtered.length === 0) return <EmptyHint />;
    const max = Math.max(...filtered.map((r) => r.p95_duration_ms), 1);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((r) => (
          <BarRow
            key={r.path}
            label={r.path}
            right={`${r.p95_duration_ms.toFixed(0)}ms · n=${r.sample_count}`}
            pct={(r.p95_duration_ms / max) * 100}
            color="#F59E0B"
          />
        ))}
      </div>
    );
  }

  // timeseries
  const filtered = rows.filter(isTimeseriesRow);
  if (filtered.length === 0) return <EmptyHint />;

  // bucket별로 그룹핑, 각 bucket 안에서 level별 카운트. 최근 순 정렬.
  const grouped = new Map<string, { level: string; count: number }[]>();
  for (const r of filtered) {
    const arr = grouped.get(r.bucket) ?? [];
    arr.push({ level: r.level, count: r.count });
    grouped.set(r.bucket, arr);
  }
  const buckets = [...grouped.keys()].sort().reverse();
  const maxLevelCount = Math.max(
    ...filtered.map((r) => r.count),
    1,
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {buckets.map((bucket) => {
        const items = grouped.get(bucket)!;
        const byLevel = new Map(items.map((i) => [i.level, i.count]));
        return (
          <div key={bucket}>
            <Paragraph typography="t7" color="#8B95A1">
              {formatBucket(bucket)}
            </Paragraph>
            <Spacing size={4} />
            <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 32 }}>
              {LEVEL_ORDER.map((lvl) => {
                const count = byLevel.get(lvl) ?? 0;
                if (count === 0) return null;
                const h = Math.max((count / maxLevelCount) * 100, 8);
                return (
                  <div
                    key={lvl}
                    title={`${lvl}: ${count}`}
                    style={{
                      width: 12,
                      height: `${h}%`,
                      background: LEVEL_COLORS[lvl],
                      borderRadius: 2,
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BarRow({
  label,
  right,
  pct,
  color,
}: {
  label: string;
  right: string;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Paragraph typography="t7" fontWeight="medium">{label}</Paragraph>
        <Paragraph typography="t7" color="#8B95A1">{right}</Paragraph>
      </div>
      <Spacing size={4} />
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: '#F2F4F6',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(pct, 100)}%`,
            background: color,
            borderRadius: 3,
          }}
        />
      </div>
    </div>
  );
}

function EmptyHint() {
  return <Paragraph typography="t7" color="#8B95A1">표시할 데이터가 없어요.</Paragraph>;
}

function formatBucket(iso: string): string {
  // AE returns timestamps as ISO strings (e.g. "2026-07-27 00:00:00" or "2026-07-27T00:00:00Z").
  const normalized = iso.includes('T') ? iso : iso.replace(' ', 'T');
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
