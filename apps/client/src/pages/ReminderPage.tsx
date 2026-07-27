import { useEffect, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  BottomCTA,
  Button,
  ListHeader,
  Modal,
  Paragraph,
  SegmentedControl,
  Spacing,
  useToast,
} from '@toss/tds-mobile';

import { EmptyState } from '../components/EmptyState';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ApiError } from '../lib/api-client';
import { useRoundStatusQuery, useReminderMessageMutation, useShareDiscordMutation } from '../query/roundQueries';

type Tone = 'friendly' | 'formal';

export function ReminderPage() {
  const { roundId = '' } = useParams({ strict: false });
  const { openToast } = useToast();

  const { data: status, isLoading: statusLoading } = useRoundStatusQuery(roundId);
  const reminderMutation = useReminderMessageMutation(roundId);
  const shareMutation = useShareDiscordMutation(roundId);

  const [message, setMessage] = useState<string>('');
  const [tone, setTone] = useState<Tone>('friendly');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    reminderMutation.mutate(undefined, {
      onSuccess: (res) => setMessage(res.message),
      onError: (e) =>
        setError(e instanceof ApiError ? e.message : '리마인드 문구를 만들지 못했어요.'),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId]);

  const loading = reminderMutation.isPending;
  const regenerating = reminderMutation.isPending;

  const handleToneChange = (next: Tone) => {
    setTone(next);
    reminderMutation.mutate({ tone: next }, {
      onSuccess: (res) => setMessage(res.message),
      onError: () => openToast('문구를 다시 만들지 못했어요.'),
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      openToast('복사했어요.');
    } catch {
      openToast('복사하지 못했어요. 길게 눌러 직접 복사해주세요.');
    }
  };

  const handleShareDiscord = async () => {
    setError(null);
    try {
      await shareMutation.mutateAsync({ message });
      setConfirmOpen(false);
      openToast('Discord로 보냈어요.');
    } catch (e) {
      const code = e instanceof ApiError ? e.code : '';
      if (code === 'VALIDATION_ERROR' || code === 'DISCORD_WEBHOOK_FAILED') {
        setError(
          'Discord 발송에 실패했어요. 스터디에 Discord webhook URL이 설정돼 있는지 확인해주세요.',
        );
      } else {
        setError(e instanceof ApiError ? e.message : 'Discord 발송에 실패했어요.');
      }
    }
  };

  const recipients = status?.notSubmitted ?? [];
  const roundNumber = status?.roundNumber ?? null;
  const allSubmitted = !!status && recipients.length === 0;

  return (
    <ErrorBoundary>
      {error ? (
        <div style={{ padding: '16px 24px 0' }}>
          <Paragraph typography="t6" color="#EF4444">
            {error}
          </Paragraph>
        </div>
      ) : null}

      {loading && !status ? (
        <div style={{ padding: 24 }}>
          <Paragraph typography="t6" color="#8B95A1">
            불러오는 중…
          </Paragraph>
        </div>
      ) : null}

      {allSubmitted ? (
        <EmptyState title="전원 제출 완료! 🎉" description="리마인드가 필요하지 않아요." />
      ) : null}

      {!loading && !allSubmitted && status ? (
        <>
          <ListHeader title={`받는 사람 (${recipients.length})`} />
          <div style={{ padding: '0 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {recipients.map((p) => (
              <span
                key={p.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: '#F4F5F7',
                  borderRadius: 999,
                  padding: '6px 14px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#2D3A41',
                }}
              >
                {p.name}
                {p.discordHandle ? (
                  <span style={{ color: '#8B95A1', fontSize: 12 }}>{p.discordHandle}</span>
                ) : null}
              </span>
            ))}
          </div>

          <Spacing size={20} />

          <div style={{ padding: '0 16px' }}>
            <Paragraph typography="t6" fontWeight="medium">
              말투
            </Paragraph>
            <Spacing size={8} />
            <SegmentedControl
              value={tone}
              onChange={(v) => handleToneChange(v as Tone)}
              size="large"
            >
              <SegmentedControl.Item value="friendly">친근하게</SegmentedControl.Item>
              <SegmentedControl.Item value="formal">정중하게</SegmentedControl.Item>
            </SegmentedControl>
          </div>

          <Spacing size={20} />

          <div style={{ padding: '0 16px' }}>
            <Paragraph typography="t6" fontWeight="medium">
              미리보기
            </Paragraph>
            <Spacing size={8} />
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E5E8EB',
                borderRadius: 16,
                padding: 16,
              }}
            >
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={regenerating}
                placeholder={regenerating ? '문구를 다시 만드는 중…' : '리마인드 문구를 입력하세요'}
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  minHeight: 160,
                  fontSize: 15,
                  lineHeight: 1.6,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  color: '#2D3A41',
                }}
              />
            </div>
            <Spacing size={8} />
            <Button
              variant="weak"
              size="small"
              onClick={handleCopy}
              disabled={!message || regenerating}
            >
              복사하기
            </Button>
          </div>
        </>
      ) : null}

      {!loading && !allSubmitted && status ? (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '0 16px env(safe-area-inset-bottom)',
          }}
        >
          <BottomCTA
            onClick={() => setConfirmOpen(true)}
            disabled={!message || regenerating}
          >
            Discord로 보내기
          </BottomCTA>
        </div>
      ) : null}

      <Modal open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Modal.Overlay />
        <Modal.Content>
          <div style={{ padding: 24 }}>
            <Paragraph typography="t4" fontWeight="bold">
              Discord로 보낼까요?
            </Paragraph>
            <Spacing size={8} />
            <Paragraph typography="t6" color="#5B646B">
              스터디에 설정된 Discord 채널로 리마인드 메시지를 전송해요.
            </Paragraph>
            <Spacing size={20} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="weak" display="block" onClick={() => setConfirmOpen(false)}>
                취소
              </Button>
              <Button
                color="primary"
                display="block"
                loading={shareMutation.isPending}
                onClick={handleShareDiscord}
              >
                보내기
              </Button>
            </div>
          </div>
        </Modal.Content>
      </Modal>
    </ErrorBoundary>
  );
}
