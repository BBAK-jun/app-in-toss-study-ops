import { useNavigate, useParams } from '@tanstack/react-router';
import { BottomCTA, Button, ListHeader, ListRow, Paragraph, Spacing } from '@toss/tds-mobile';

import { EmptyState } from '../components/EmptyState';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { RateBadge, rateBadgeColor } from '../components/RateBadge';
import { ApiError } from '../lib/api-client';
import { useRoundStatusQuery } from '../query/roundQueries';
import { usePageLayout } from '../layout/PageLayoutContext';

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
  const rate = status?.rate ?? 0;
  const accentColor = rateBadgeColor(rate);

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
          <div style={{ padding: '20px 16px' }}>
            <Paragraph typography="t4" fontWeight="bold">
              {status.title}
            </Paragraph>
            <Spacing size={8} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <RateBadge rate={rate} size="medium" />
              <Paragraph typography="t6" color="#5B646B">
                {submittedCount}/{total}명 제출했어요
              </Paragraph>
            </div>
            {status.dueAt ? (
              <>
                <Spacing size={4} />
                <Paragraph typography="t7" color="#8B95A1">
                  마감 {new Date(status.dueAt).toLocaleString('ko-KR')}
                </Paragraph>
              </>
            ) : null}
          </div>

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

          <ListHeader title={`미제출자(${status.notSubmitted.length})`} />
          {status.notSubmitted.length === 0 ? (
            <div style={{ padding: '20px 16px' }}>
              <Paragraph typography="t6" color={accentColor === 'green' ? '#16A34A' : '#5B646B'}>
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

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '0 16px env(safe-area-inset-bottom)' }}>
        <BottomCTA onClick={() => navigate({ to: '/rounds/$roundId/reminder', params: { roundId } })}>리마인드 보내기</BottomCTA>
      </div>
    </ErrorBoundary>
  );
}
