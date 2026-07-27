import { useNavigate } from '@tanstack/react-router';
import { useQueries } from '@tanstack/react-query';
import {
  BottomCTA,
  Button,
  ListHeader,
  ListRow,
  Paragraph,
  Spacing,
  useToast,
} from '@toss/tds-mobile';
import type { RoundSummary, StudyDto } from '@studyops/shared';

import { EmptyState } from '../components/EmptyState';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { RateBadge, rateHexColor } from '../components/RateBadge';
import { getDeadlineUrgency } from '../lib/formatDate';
import { ApiError, apiClient } from '../lib/api-client';
import { useStudiesQuery } from '../query/studyQueries';
import { studyKeys } from '../query/queryKeys';
import { usePageLayout } from '../layout/PageLayoutContext';
import { openCreateStudyModal } from '../ui/CreateStudyModal/openCreateStudyModal';

interface StudyDashboard {
  study: StudyDto;
  latest: RoundSummary | null;
  notSubmitted: number;
}

function pickLatestRound(summaries: RoundSummary[]): RoundSummary | null {
  if (summaries.length === 0) return null;
  return summaries.reduce((a, b) => (b.roundNumber > a.roundNumber ? b : a));
}

export function StudiesPage() {
  const navigate = useNavigate();
  const { openToast } = useToast();
  const { data: studies, isLoading, error, refetch } = useStudiesQuery();

  const summaryQueries = useQueries({
    queries: (studies ?? []).map((s) => ({
      queryKey: studyKeys.roundSummaries(s.id),
      queryFn: () => apiClient.studies.listRoundSummaries(s.id),
    })),
  });

  usePageLayout({ onRefresh: () => { void refetch(); } });

  const errorMessage = error instanceof ApiError ? error.message : error ? '스터디를 불러오지 못했어요.' : null;

  const handleCreate = async () => {
    await openCreateStudyModal();
  };

  const dashboards: StudyDashboard[] | null =
    studies && summaryQueries.every((q) => q.isSuccess)
      ? studies.map((study, i) => {
          const summaries = summaryQueries[i].data ?? [];
          const latest = pickLatestRound(summaries);
          return {
            study,
            latest,
            notSubmitted: latest ? latest.total - latest.submittedCount : 0,
          };
        })
      : null;

  const totalNotSubmitted = (dashboards ?? []).reduce((s, d) => s + d.notSubmitted, 0);
  const studiesWithPending = (dashboards ?? []).filter((d) => d.notSubmitted > 0);

  const mostUrgent = studiesWithPending
    .filter((d) => d.latest !== null)
    .sort((a, b) => {
      const aDue = a.latest!.dueAt ?? Number.MAX_SAFE_INTEGER;
      const bDue = b.latest!.dueAt ?? Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
    })[0];

  const isEmpty = dashboards !== null && dashboards.length === 0;
  const showDashboard = dashboards !== null && dashboards.length > 0;

  return (
    <ErrorBoundary>
      {errorMessage ? (
        <div style={{ padding: '24px' }}>
          <Paragraph typography="t6" color="#EF4444">
            {errorMessage}
          </Paragraph>
          <Spacing size={8} />
          <Button size="small" onClick={() => void refetch()}>
            다시 불러오기
          </Button>
        </div>
      ) : null}

      {isEmpty ? (
        <EmptyState title="아직 스터디가 없어요" description="첫 스터디를 만들어 시작해보세요." />
      ) : null}

      {showDashboard ? (
        <>
          <HeroCard
            totalNotSubmitted={totalNotSubmitted}
            pendingStudyCount={studiesWithPending.length}
            totalStudies={dashboards!.length}
            remindTargetRoundId={mostUrgent?.latest?.roundId ?? null}
            onRemind={(rid) => navigate({ to: '/rounds/$roundId/reminder', params: { roundId: rid } })}
          />

          <ListHeader title="내 스터디" />
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {dashboards!.map((d) => {
              const urgency = d.latest ? getDeadlineUrgency(d.latest.dueAt) : null;
              const pct = d.latest ? Math.round(d.latest.rate * 100) : null;
              return (
                <ListRow
                  key={d.study.id}
                  verticalPadding="large"
                  arrowType="right"
                  withTouchEffect
                  onClick={() => navigate({ to: '/studies/$studyId', params: { studyId: d.study.id } })}
                  contents={
                    <>
                      <Paragraph typography="t5" fontWeight="medium">
                        {d.study.title}
                      </Paragraph>
                      {d.latest ? (
                        <>
                          <Spacing size={4} />
                          <Paragraph typography="t7" color="#5B646B">
                            {d.notSubmitted > 0
                              ? `${d.notSubmitted}명 미제출 · ${d.latest.roundNumber}회차`
                              : `전원 제출 · ${d.latest.roundNumber}회차`}
                            {urgency ? ` · ${urgency.label}` : ''}
                          </Paragraph>
                          <Spacing size={6} />
                          <div
                            style={{
                              width: '100%',
                              height: 4,
                              background: '#E5E8EB',
                              borderRadius: 2,
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${pct}%`,
                                height: '100%',
                                background: rateHexColor(d.latest.rate),
                                borderRadius: 2,
                              }}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <Spacing size={4} />
                          <Paragraph typography="t7" color="#8B95A1">
                            회차를 만들어 시작해보세요
                          </Paragraph>
                        </>
                      )}
                    </>
                  }
                  right={
                    d.latest ? (
                      <div style={{ textAlign: 'right' }}>
                        <RateBadge rate={d.latest.rate} size="small" />
                      </div>
                    ) : undefined
                  }
                />
              );
            })}
          </ul>
        </>
      ) : null}

      {!errorMessage && isLoading ? (
        <div style={{ padding: 24 }}>
          <Paragraph typography="t6" color="#8B95A1">
            불러오는 중…
          </Paragraph>
        </div>
      ) : null}

      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '0 16px env(safe-area-inset-bottom)',
        }}
      >
        <BottomCTA onClick={() => void handleCreate()}>스터디 만들기</BottomCTA>
      </div>
    </ErrorBoundary>
  );
}

function HeroCard({
  totalNotSubmitted,
  pendingStudyCount,
  totalStudies,
  remindTargetRoundId,
  onRemind,
}: {
  totalNotSubmitted: number;
  pendingStudyCount: number;
  totalStudies: number;
  remindTargetRoundId: string | null;
  onRemind: (roundId: string) => void;
}) {
  const hasPending = totalNotSubmitted > 0;
  const accentColor = hasPending ? '#EF4444' : '#16A34A';
  const bgColor = hasPending ? '#FEF2F2' : '#F0FDF4';

  return (
    <div style={{ padding: '12px 16px 4px' }}>
      <div
        style={{
          background: bgColor,
          borderRadius: 20,
          padding: '24px 20px',
          border: `1px solid ${hasPending ? '#FECACA' : '#BBF7D0'}`,
        }}
      >
        {hasPending ? (
          <>
            <Paragraph typography="t7" fontWeight="medium" color="#991B1B">
              리마인드가 필요해요
            </Paragraph>
            <Spacing size={4} />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 40, fontWeight: 800, color: accentColor, lineHeight: 1 }}>
                {totalNotSubmitted}
              </span>
              <span style={{ fontSize: 18, fontWeight: 600, color: accentColor }}>명</span>
            </div>
            <Spacing size={4} />
            <Paragraph typography="t7" color="#7F1D1D">
              {pendingStudyCount}개 스터디에서 미제출
            </Paragraph>
            {remindTargetRoundId ? (
              <>
                <Spacing size={16} />
                <Button
                  display="block"
                  color="primary"
                  onClick={() => onRemind(remindTargetRoundId)}
                >
                  리마인드 보내기
                </Button>
              </>
            ) : null}
          </>
        ) : (
          <>
            <Paragraph typography="t6" fontWeight="medium" color="#166534">
              전원 제출 완료! 🎉
            </Paragraph>
            <Spacing size={4} />
            <Paragraph typography="t5" fontWeight="bold" color={accentColor}>
              {totalStudies}개 스터디 모두 제출했어요
            </Paragraph>
          </>
        )}
      </div>
    </div>
  );
}
