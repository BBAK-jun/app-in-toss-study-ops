import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BottomCTA,
  Button,
  ListHeader,
  ListRow,
  Modal,
  Paragraph,
  SegmentedControl,
  Spacing,
  TextField,
  useToast,
} from '@toss/tds-mobile';
import type { ParticipantDto, RoundDto, StudyDto } from '@studyops/shared';
import { AppShell } from '../components/AppShell';
import { EmptyState } from '../components/EmptyState';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ApiError } from '../api/client';
import {
  addParticipant,
  createRound,
  getStudy,
  listParticipants,
  listRounds,
  listRoundSummaries,
  type RoundSummary,
  removeParticipant,
  updateStudy,
} from '../api/studies';
import { getDeadlineUrgency } from '../lib/formatDate';
import { rateHexColor } from '../components/RateBadge';

type TabValue = 'rounds' | 'participants';

// 스터디 상세(문서 4-5): Tab(회차/참여자) + 회차 생성 + 참여자 추가 + Discord webhook 설정.
export function StudyDetailPage() {
  const { studyId = '' } = useParams();
  const navigate = useNavigate();
  const { openToast } = useToast();

  const [study, setStudy] = useState<StudyDto | null>(null);
  const [rounds, setRounds] = useState<RoundDto[] | null>(null);
  const [roundSummaries, setRoundSummaries] = useState<RoundSummary[] | null>(null);
  const [participants, setParticipants] = useState<ParticipantDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabValue>('rounds');

  // 회차 생성 Modal
  const [roundOpen, setRoundOpen] = useState(false);
  const [roundTitle, setRoundTitle] = useState('');
  const [roundNumber, setRoundNumber] = useState('1');
  const [roundDueAt, setRoundDueAt] = useState('');
  const [roundSubmitting, setRoundSubmitting] = useState(false);

  // 참여자 추가 Modal
  const [participantOpen, setParticipantOpen] = useState(false);
  const [pName, setPName] = useState('');
  const [pHandle, setPHandle] = useState('');
  const [pSubmitting, setPSubmitting] = useState(false);

  // Discord webhook 설정 Modal
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [s, r, rs, p] = await Promise.all([
        getStudy(studyId),
        listRounds(studyId),
        listRoundSummaries(studyId),
        listParticipants(studyId),
      ]);
      setStudy(s);
      setRounds(r);
      setRoundSummaries(rs);
      setParticipants(p);
      setWebhookUrl(s.discordWebhookUrl ?? '');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '스터디 정보를 불러오지 못했어요.');
    }
  }, [studyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreateRound = async () => {
    const num = Number(roundNumber);
    if (!roundTitle.trim() || Number.isNaN(num)) return;
    setRoundSubmitting(true);
    try {
      const created = await createRound(studyId, {
        roundNumber: num,
        title: roundTitle.trim(),
        dueAt: roundDueAt ? new Date(roundDueAt).getTime() : undefined,
      });
      setRoundOpen(false);
      setRoundTitle('');
      setRoundDueAt('');
      openToast('회차를 만들었어요.');
      navigate(`/rounds/${created.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '회차 생성에 실패했어요.');
    } finally {
      setRoundSubmitting(false);
    }
  };

  const handleAddParticipant = async () => {
    if (!pName.trim()) return;
    setPSubmitting(true);
    try {
      const created = await addParticipant(studyId, {
        name: pName.trim(),
        discordHandle: pHandle.trim() || undefined,
      });
      setParticipants((prev) => [...(prev ?? []), created]);
      setParticipantOpen(false);
      setPName('');
      setPHandle('');
      openToast('참여자를 추가했어요.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '참여자 추가에 실패했어요.');
    } finally {
      setPSubmitting(false);
    }
  };

  const handleRemoveParticipant = async (pid: string) => {
    try {
      await removeParticipant(studyId, pid);
      setParticipants((prev) => (prev ?? []).filter((p) => p.id !== pid));
      openToast('참여자를 삭제했어요.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '참여자 삭제에 실패했어요.');
    }
  };

  const handleSaveWebhook = async () => {
    setRoundSubmitting(true);
    try {
      const updated = await updateStudy(studyId, {
        discordWebhookUrl: webhookUrl.trim() || null,
      });
      setStudy(updated);
      setWebhookOpen(false);
      openToast('Discord 알림을 설정했어요.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Discord 설정에 실패했어요.');
    } finally {
      setRoundSubmitting(false);
    }
  };

  return (
    <AppShell title={study?.title ?? '스터디'} onBack={() => navigate('/')}>
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
                <Button variant="weak" size="small" onClick={() => setWebhookOpen(true)}>
                  Discord 설정
                </Button>
              }
            />
            {rounds && rounds.length === 0 ? (
              <EmptyState
                title="아직 회차가 없어요"
                description="첫 회차를 만들어 제출을 받아보세요."
              />
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
                      onClick={() => navigate(`/rounds/${r.id}`)}
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
              <EmptyState
                title="아직 참여자가 없어요"
                description="스터디 멤버를 추가해보세요."
              />
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
                        {p.discordHandle ? (
                          <span style={{ color: '#8B95A1' }}> · {p.discordHandle}</span>
                        ) : null}
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
            <BottomCTA
              onClick={() => {
                const next = (rounds?.length ?? 0) + 1;
                setRoundNumber(String(next));
                setRoundOpen(true);
              }}
            >
              회차 만들기
            </BottomCTA>
          ) : (
            <BottomCTA onClick={() => setParticipantOpen(true)}>참여자 추가하기</BottomCTA>
          )}
        </div>

        {/* 회차 생성 Modal */}
        <Modal open={roundOpen} onOpenChange={setRoundOpen}>
          <Modal.Overlay />
          <Modal.Content>
            <div style={{ padding: 24 }}>
              <Paragraph typography="t4" fontWeight="bold">
                회차 만들기
              </Paragraph>
              <Spacing size={20} />
              <TextField
                variant="box"
                label="회차 번호"
                type="number"
                inputMode="numeric"
                value={roundNumber}
                onChange={(e) => setRoundNumber(e.target.value)}
              />
              <Spacing size={12} />
              <TextField
                variant="box"
                label="회차 제목"
                placeholder="예: 이분탐색"
                value={roundTitle}
                onChange={(e) => setRoundTitle(e.target.value)}
              />
              <Spacing size={12} />
              <TextField
                variant="box"
                label="마감일(선택)"
                type="datetime-local"
                value={roundDueAt}
                onChange={(e) => setRoundDueAt(e.target.value)}
              />
              <Spacing size={20} />
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="weak" display="block" onClick={() => setRoundOpen(false)}>
                  취소
                </Button>
                <Button display="block" loading={roundSubmitting} onClick={handleCreateRound}>
                  만들기
                </Button>
              </div>
            </div>
          </Modal.Content>
        </Modal>

        {/* 참여자 추가 Modal */}
        <Modal open={participantOpen} onOpenChange={setParticipantOpen}>
          <Modal.Overlay />
          <Modal.Content>
            <div style={{ padding: 24 }}>
              <Paragraph typography="t4" fontWeight="bold">
                참여자 추가
              </Paragraph>
              <Spacing size={20} />
              <TextField
                variant="box"
                label="이름"
                placeholder="참여자 이름"
                value={pName}
                onChange={(e) => setPName(e.target.value)}
              />
              <Spacing size={12} />
              <TextField
                variant="box"
                label="Discord 핸들(선택)"
                placeholder="예: @sondi"
                value={pHandle}
                onChange={(e) => setPHandle(e.target.value)}
              />
              <Spacing size={20} />
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="weak" display="block" onClick={() => setParticipantOpen(false)}>
                  취소
                </Button>
                <Button display="block" loading={pSubmitting} onClick={handleAddParticipant}>
                  추가하기
                </Button>
              </div>
            </div>
          </Modal.Content>
        </Modal>

        {/* Discord webhook 설정 Modal */}
        <Modal open={webhookOpen} onOpenChange={setWebhookOpen}>
          <Modal.Overlay />
          <Modal.Content>
            <div style={{ padding: 24 }}>
              <Paragraph typography="t4" fontWeight="bold">
                Discord 알림 설정
              </Paragraph>
              <Spacing size={8} />
              <Paragraph typography="t6" color="#8B95A1">
                스터디 전용 Discord webhook URL을 등록하면 리마인드/현황을 바로 보낼 수 있어요.
              </Paragraph>
              <Spacing size={20} />
              <TextField
                variant="box"
                label="Webhook URL"
                placeholder="https://discord.com/api/webhooks/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <Spacing size={20} />
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="weak" display="block" onClick={() => setWebhookOpen(false)}>
                  취소
                </Button>
                <Button display="block" loading={roundSubmitting} onClick={handleSaveWebhook}>
                  저장하기
                </Button>
              </div>
            </div>
          </Modal.Content>
        </Modal>
      </ErrorBoundary>
    </AppShell>
  );
}
