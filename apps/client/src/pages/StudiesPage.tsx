import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BottomCTA,
  Button,
  ListHeader,
  ListRow,
  Modal,
  Paragraph,
  Spacing,
  TextField,
  useToast,
} from '@toss/tds-mobile';
import type { StudyDto } from '@studyops/shared';
import { AppShell } from '../components/AppShell';
import { EmptyState } from '../components/EmptyState';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { RateBadge, rateHexColor } from '../components/RateBadge';
import { ApiError } from '../api/client';
import { createStudy, listStudies, listRoundSummaries, type RoundSummary } from '../api/studies';
import { getDeadlineUrgency } from '../lib/formatDate';

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
  const [dashboards, setDashboards] = useState<StudyDashboard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const studies = await listStudies();
      const allSummaries = await Promise.all(
        studies.map((s) =>
          listRoundSummaries(s.id).catch(() => [] as RoundSummary[]),
        ),
      );
      setDashboards(
        studies.map((study, i) => {
          const latest = pickLatestRound(allSummaries[i]);
          return {
            study,
            latest,
            notSubmitted: latest ? latest.total - latest.submittedCount : 0,
          };
        }),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '스터디를 불러오지 못했어요.');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await createStudy({ title: title.trim(), description: description.trim() || undefined });
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      openToast('스터디를 만들었어요.');
      refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '스터디 생성에 실패했어요.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalNotSubmitted = (dashboards ?? []).reduce((s, d) => s + d.notSubmitted, 0);
  const studiesWithPending = (dashboards ?? []).filter((d) => d.notSubmitted > 0);

  const mostUrgent = studiesWithPending
    .filter((d) => d.latest !== null)
    .sort((a, b) => {
      const aDue = a.latest!.dueAt ?? Number.MAX_SAFE_INTEGER;
      const bDue = b.latest!.dueAt ?? Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
    })[0];

  const hasData = !error && dashboards !== null;
  const isEmpty = hasData && dashboards.length === 0;
  const showDashboard = hasData && dashboards.length > 0;

  return (
    <AppShell
      title="스터디옵스"
      right={
        <Button variant="weak" size="small" onClick={refresh}>
          새로고침
        </Button>
      }
    >
      <ErrorBoundary>
        {error ? (
          <div style={{ padding: '24px' }}>
            <Paragraph typography="t6" color="#EF4444">
              {error}
            </Paragraph>
            <Spacing size={8} />
            <Button size="small" onClick={refresh}>
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
              totalStudies={dashboards.length}
              remindTargetRoundId={mostUrgent?.latest?.roundId ?? null}
              onRemind={(rid) => navigate(`/rounds/${rid}/reminder`)}
            />

            <ListHeader title="내 스터디" />
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {dashboards.map((d) => {
                const urgency = d.latest ? getDeadlineUrgency(d.latest.dueAt) : null;
                const pct = d.latest ? Math.round(d.latest.rate * 100) : null;
                return (
                  <ListRow
                    key={d.study.id}
                    verticalPadding="large"
                    arrowType="right"
                    withTouchEffect
                    onClick={() => navigate(`/studies/${d.study.id}`)}
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

        {!error && dashboards === null ? (
          <div style={{ padding: 24 }}>
            <Paragraph typography="t6" color="#8B95A1">
              불러오는 중…
            </Paragraph>
          </div>
        ) : null}
      </ErrorBoundary>

      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '0 16px env(safe-area-inset-bottom)',
        }}
      >
        <BottomCTA onClick={() => setCreateOpen(true)}>스터디 만들기</BottomCTA>
      </div>

      <Modal open={createOpen} onOpenChange={setCreateOpen}>
        <Modal.Overlay />
        <Modal.Content>
          <div style={{ padding: 24 }}>
            <Paragraph typography="t4" fontWeight="bold">
              스터디 만들기
            </Paragraph>
            <Spacing size={20} />
            <TextField
              variant="box"
              label="스터디 이름"
              placeholder="예: 알고리즘 스터디"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Spacing size={12} />
            <TextField
              variant="box"
              label="설명(선택)"
              placeholder="스터디 목적을 적어보세요"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Spacing size={20} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="weak" display="block" onClick={() => setCreateOpen(false)}>
                취소
              </Button>
              <Button display="block" loading={submitting} onClick={handleCreate}>
                만들기
              </Button>
            </div>
          </div>
        </Modal.Content>
      </Modal>
    </AppShell>
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
