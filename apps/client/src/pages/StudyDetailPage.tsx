import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useQueryState, parseAsStringLiteral } from 'nuqs';
import {
  BottomCTA,
  Button,
  ListHeader,
  ListRow,
  Paragraph,
  SegmentedControl,
  Spacing,
  useToast,
} from '@toss/tds-mobile';

import { EmptyState } from '../components/EmptyState';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ApiError } from '../lib/api-client';
import {
  useRemoveParticipantMutation,
  useRoundSummariesQuery,
  useStudyParticipantsQuery,
  useStudyQuery,
  useStudyRoundsQuery,
} from '../query/studyQueries';
import { getDeadlineUrgency } from '../lib/formatDate';
import { rateHexColor } from '../components/RateBadge';
import { usePageLayout } from '../layout/PageLayoutContext';
import { openCreateRoundModal } from '../ui/CreateRoundModal/openCreateRoundModal';
import { openAddParticipantModal } from '../ui/AddParticipantModal/openAddParticipantModal';
import { openDiscordWebhookModal } from '../ui/DiscordWebhookModal/openDiscordWebhookModal';

type TabValue = 'rounds' | 'participants';

export function StudyDetailPage() {
  const { studyId = '' } = useParams({ strict: false });
  const navigate = useNavigate();
  const { openToast } = useToast();

  const { data: study, refetch } = useStudyQuery(studyId);
  const { data: rounds } = useStudyRoundsQuery(studyId);
  const { data: roundSummaries } = useRoundSummariesQuery(studyId);
  const { data: participants } = useStudyParticipantsQuery(studyId);

  const removeParticipantMutation = useRemoveParticipantMutation(studyId);

  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useQueryState(
    'tab',
    parseAsStringLiteral(['rounds', 'participants']).withDefault('rounds'),
  );

  usePageLayout({
    title: study?.title ?? '스터디',
    onRefresh: () => { void refetch(); },
  });

  const handleCreateRound = async () => {
    const next = (rounds?.length ?? 0) + 1;
    const created = await openCreateRoundModal({ studyId, initialRoundNumber: next });
    if (created) {
      navigate({ to: '/rounds/$roundId', params: { roundId: created.id } });
    }
  };

  const handleAddParticipant = async () => {
    await openAddParticipantModal(studyId);
  };

  const handleOpenWebhook = async () => {
    await openDiscordWebhookModal({ studyId, currentUrl: study?.discordWebhookUrl ?? undefined });
  };

  const handleRemoveParticipant = async (pid: string) => {
    try {
      await removeParticipantMutation.mutateAsync(pid);
      openToast('참여자를 삭제했어요.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '참여자 삭제에 실패했어요.');
    }
  };

  return (
    <ErrorBoundary>
      {error ? (
        <div style={{ padding: 24 }}>
          <Paragraph typography="t6" color="#EF4444">
            {error}
          </Paragraph>
        </div>
      ) : null}

      <div style={{ padding: '12px 16px' }}>
        <SegmentedControl value={tab} onChange={(v) => setTab(v as TabValue)} size="large">
          <SegmentedControl.Item value="rounds">회차</SegmentedControl.Item>
          <SegmentedControl.Item value="participants">참여자</SegmentedControl.Item>
        </SegmentedControl>
      </div>

      {tab === 'rounds' ? (
        <>
          <ListHeader
            title="회차"
            right={
              <Button variant="weak" size="small" onClick={() => void handleOpenWebhook()}>
                Discord 설정
              </Button>
            }
          />
          {rounds && rounds.length === 0 ? (
            <EmptyState title="아직 회차가 없어요" description="첫 회차를 만들어 제출을 받아보세요." />
          ) : null}
          {rounds ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {rounds.map((r) => {
                const summary = roundSummaries?.find((s) => s.roundId === r.id);
                const urgency = getDeadlineUrgency(r.dueAt);
                const rateColor = summary ? rateHexColor(summary.rate) : '#8B95A1';
                const pct = summary ? Math.round(summary.rate * 100) : null;
                return (
                  <ListRow
                    key={r.id}
                    verticalPadding="large"
                    arrowType="right"
                    withTouchEffect
                    onClick={() => navigate({ to: '/rounds/$roundId', params: { roundId: r.id } })}
                    contents={
                      <>
                        <Paragraph typography="t5" fontWeight="medium">
                          {r.roundNumber}회차 · {r.title}
                        </Paragraph>
                        {urgency ? (
                          <>
                            <Spacing size={4} />
                            <Paragraph typography="t7" color={urgency.color} fontWeight={urgency.bold ? 'bold' : 'medium'}>
                              {urgency.label}
                            </Paragraph>
                          </>
                        ) : null}
                        {summary ? (
                          <>
                            <Spacing size={4} />
                            <Paragraph typography="t7" color="#8B95A1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                              제출 {summary.submittedCount}/{summary.total}명 · 미제출 {summary.total - summary.submittedCount}명
                            </Paragraph>
                            <Spacing size={6} />
                            <div style={{ width: '100%', height: 4, background: '#E5E8EB', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: rateColor, borderRadius: 2 }} />
                            </div>
                          </>
                        ) : null}
                      </>
                    }
                    right={
                      summary && pct !== null ? (
                        <span style={{
                          fontSize: 13,
                          fontWeight: 'bold',
                          color: rateColor,
                          fontVariantNumeric: 'tabular-nums',
                          minWidth: 36,
                          textAlign: 'right',
                        }}>
                          {pct}%
                        </span>
                      ) : undefined
                    }
                  />
                );
              })}
            </ul>
          ) : null}
        </>
      ) : (
        <>
          <ListHeader title={`참여자${participants ? ` (${participants.length})` : ''}`} />
          {participants && participants.length === 0 ? (
            <EmptyState title="아직 참여자가 없어요" description="스터디 멤버를 추가해보세요." />
          ) : null}
          {participants ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {participants.map((p) => (
                <ListRow
                  key={p.id}
                  verticalPadding="large"
                  contents={
                    <Paragraph typography="t5" fontWeight="medium">
                      {p.name}
                      {p.discordHandle ? <span style={{ color: '#8B95A1' }}> · {p.discordHandle}</span> : null}
                    </Paragraph>
                  }
                  right={
                    <Button variant="weak" size="small" onClick={() => handleRemoveParticipant(p.id)}>
                      삭제
                    </Button>
                  }
                />
              ))}
            </ul>
          ) : null}
        </>
      )}

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '0 16px env(safe-area-inset-bottom)' }}>
        {tab === 'rounds' ? (
          <BottomCTA onClick={() => void handleCreateRound()}>
            회차 만들기
          </BottomCTA>
        ) : (
          <BottomCTA onClick={() => void handleAddParticipant()}>참여자 추가하기</BottomCTA>
        )}
      </div>
    </ErrorBoundary>
  );
}
