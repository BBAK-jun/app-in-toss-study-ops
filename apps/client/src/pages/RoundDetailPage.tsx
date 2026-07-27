import { useNavigate, useParams } from '@tanstack/react-router';
import { BottomCTA, Button, ListHeader, ListRow, Paragraph, Spacing } from '@toss/tds-mobile';
import type { RoundStatusDto } from '@studyops/shared';

import { EmptyState } from '../components/EmptyState';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { rateBadgeColor, rateHexColor } from '../components/RateBadge';
import { getDeadlineUrgency } from '../lib/formatDate';
import { ApiError } from '../lib/api-client';
import { useRoundStatusQuery } from '../query/roundQueries';
import { usePageLayout } from '../layout/PageLayoutContext';

const HERO_BG: Record<'green' | 'yellow' | 'red', string> = {
  green: '#F0FDF4',
  yellow: '#FFFBEB',
  red: '#FEF2F2',
};
const HERO_BORDER: Record<'green' | 'yellow' | 'red', string> = {
  green: '#BBF7D0',
  yellow: '#FDE68A',
  red: '#FECACA',
};

export function RoundDetailPage() {
  const { roundId = '' } = useParams({ strict: false });
  const navigate = useNavigate();
  const { data: status, isLoading, error, refetch } = useRoundStatusQuery(roundId);

  usePageLayout({
    title: status ? `${status.roundNumber}회차` : '회차',
    onRefresh: () => { void refetch(); },
  });

  const errorMessage = error instanceof ApiError ? error.message : error ? '회차 현황을 불러오지 못했어요.' : null;

  const submittedCount = status?.submitted.length ?? 0;
  const total = status?.total ?? 0;
  const notSubmittedCount = status?.notSubmitted.length ?? 0;
  const hasNotSubmitted = notSubmittedCount > 0;

  if (isLoading && !status) {
    return (
      <ErrorBoundary>
        <div style={{ padding: 24 }}>
          <Paragraph typography="t6" color="#8B95A1">
            불러오는 중…
          </Paragraph>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      {errorMessage ? (
        <div style={{ padding: 24 }}>
          <Paragraph typography="t6" color="#EF4444">
            {errorMessage}
          </Paragraph>
        </div>
      ) : null}

      {status ? (
        <>
          <HeroRateCard status={status} />

          <ListHeader
            title={`제출자(${submittedCount})`}
            right={
              <Button variant="weak" size="small" onClick={() => navigate({ to: '/rounds/$roundId/submit', params: { roundId } })}>
                제출 등록
              </Button>
            }
          />
          {submittedCount === 0 ? (
            <EmptyState title="아직 제출자가 없어요" />
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {status.submitted.map(({ participant, submission }) => (
                <ListRow
                  key={submission.id}
                  verticalPadding="medium"
                  contents={
                    <>
                      <Paragraph typography="t5" fontWeight="medium">
                        {participant.name}
                        {participant.discordHandle ? (
                          <span style={{ color: '#8B95A1' }}> · {participant.discordHandle}</span>
                        ) : null}
                      </Paragraph>
                      <Spacing size={2} />
                      <a
                        href={submission.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: '#0064FF',
                          fontSize: 13,
                          textDecoration: 'none',
                          wordBreak: 'break-all',
                        }}
                      >
                        {submission.url}
                      </a>
                    </>
                  }
                />
              ))}
            </ul>
          )}

          <Spacing size={16} />

          {hasNotSubmitted ? (
            <div
              style={{
                background: '#FEF2F2',
                borderRadius: '16px 16px 0 0',
                padding: '12px 16px 0',
                margin: '0 0 -8px',
              }}
            >
              <ListHeader title={`미제출자(${notSubmittedCount})`} />
            </div>
          ) : (
            <ListHeader title={`미제출자(${notSubmittedCount})`} />
          )}

          {!hasNotSubmitted ? (
            <div style={{ padding: '20px 16px' }}>
              <Paragraph typography="t6" color="#16A34A" fontWeight="medium">
                {total > 0 ? '🎉 전원 제출 완료! 아주 좋아요.' : '참여자를 먼저 추가해주세요.'}
              </Paragraph>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {status.notSubmitted.map((p) => (
                <ListRow
                  key={p.id}
                  verticalPadding="medium"
                  contents={
                    <Paragraph typography="t5">
                      {p.name}
                      {p.discordHandle ? <span style={{ color: '#8B95A1' }}> · {p.discordHandle}</span> : null}
                    </Paragraph>
                  }
                />
              ))}
            </ul>
          )}
        </>
      ) : null}

      {hasNotSubmitted ? (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '0 16px env(safe-area-inset-bottom)' }}>
          <BottomCTA onClick={() => navigate({ to: '/rounds/$roundId/reminder', params: { roundId } })}>리마인드 보내기</BottomCTA>
        </div>
      ) : null}
    </ErrorBoundary>
  );
}

function HeroRateCard({ status }: { status: RoundStatusDto }) {
  const pct = Math.round(status.rate * 100);
  const accent = rateBadgeColor(status.rate);
  const accentHex = rateHexColor(status.rate);
  const urgency = getDeadlineUrgency(status.dueAt);

  return (
    <div style={{ padding: '12px 16px 4px' }}>
      <div
        style={{
          background: HERO_BG[accent],
          borderRadius: 20,
          padding: '20px',
          border: `1px solid ${HERO_BORDER[accent]}`,
        }}
      >
        <Paragraph typography="t6" fontWeight="medium" color="#5B646B">
          {status.roundNumber}회차 · {status.title}
        </Paragraph>
        <Spacing size={12} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 44, fontWeight: 800, color: accentHex, lineHeight: 1 }}>
            {pct}
          </span>
          <span style={{ fontSize: 20, fontWeight: 700, color: accentHex }}>%</span>
        </div>
        <Spacing size={12} />
        <div
          style={{
            width: '100%',
            height: 8,
            background: '#FFFFFF',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: accentHex,
              borderRadius: 4,
            }}
          />
        </div>
        <Spacing size={12} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Paragraph typography="t7" color="#5B646B">
            {status.submitted.length}/{status.total}명 제출 ·{' '}
            {status.notSubmitted.length}명 미제출
          </Paragraph>
          {urgency ? (
            <Paragraph typography="t7" fontWeight="bold" color={urgency.color}>
              {urgency.label}
            </Paragraph>
          ) : null}
        </div>
      </div>
    </div>
  );
}
