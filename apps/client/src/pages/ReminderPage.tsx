import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BottomCTA,
  Button,
  Modal,
  Paragraph,
  Spacing,
  useToast,
} from '@toss/tds-mobile';
import { AppShell } from '../components/AppShell';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { apiClient, ApiError } from '../lib/api-client';

// 리마인드/공유(문서 4-5): POST /reminder-message → 문구 표시 + 복사(Toast)
// + BottomCTA(Discord로 보내기) → POST /share-discord.
export function ReminderPage() {
  const { roundId = '' } = useParams();
  const navigate = useNavigate();
  const { openToast } = useToast();

  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setError(null);
      try {
        const res = await apiClient.rounds.getReminderMessage(roundId);
        if (active) setMessage(res.message);
      } catch (e) {
        if (active) setError(e instanceof ApiError ? e.message : '리마인드 문구를 만들지 못했어요.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [roundId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      openToast('복사했어요.');
    } catch {
      // 웹뷰 폴백: @apps-in-toss/web-framework 의 setClipboardText 사용 가능.
      openToast('복사하지 못했어요. 길게 눌러 직접 복사해주세요.');
    }
  };

  const handleShareDiscord = async () => {
    setSending(true);
    setError(null);
    try {
      await apiClient.rounds.shareDiscord(roundId);
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
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell title="리마인드/공유" onBack={() => navigate(-1)}>
      <ErrorBoundary>
        {error ? (
          <div style={{ padding: '16px 24px 0' }}>
            <Paragraph typography="t6" color="#EF4444">
              {error}
            </Paragraph>
          </div>
        ) : null}

        <div style={{ padding: '16px 24px' }}>
          <Paragraph typography="t5" fontWeight="medium">
            리마인드 문구
          </Paragraph>
          <Spacing size={8} />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={loading}
            placeholder={loading ? '문구를 만드는 중…' : '리마인드 문구를 입력하세요'}
            style={{
              width: '100%',
              background: '#FFFFFF',
              border: '1px solid #E5E8EB',
              borderRadius: 16,
              padding: 16,
              minHeight: 160,
              fontSize: 15,
              lineHeight: 1.5,
              resize: 'vertical',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />

          <Spacing size={12} />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="weak" display="block" onClick={handleCopy} disabled={!message}>
              복사하기
            </Button>
            <Button
              variant="weak"
              display="block"
              onClick={() => navigate(-1)}
            >
              뒤로
            </Button>
          </div>
        </div>

        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '0 16px env(safe-area-inset-bottom)' }}>
          <BottomCTA onClick={() => setConfirmOpen(true)} disabled={!message}>
            Discord로 보내기
          </BottomCTA>
        </div>

        <Modal open={confirmOpen} onOpenChange={setConfirmOpen}>
          <Modal.Overlay />
          <Modal.Content>
            <div style={{ padding: 24 }}>
              <Paragraph typography="t4" fontWeight="bold">
                Discord로 보낼까요?
              </Paragraph>
              <Spacing size={8} />
              <Paragraph typography="t6" color="#5B646B">
                스터디에 설정된 Discord 채널로 현황 메시지를 전송해요.
              </Paragraph>
              <Spacing size={20} />
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="weak" display="block" onClick={() => setConfirmOpen(false)}>
                  취소
                </Button>
                <Button color="primary" display="block" loading={sending} onClick={handleShareDiscord}>
                  보내기
                </Button>
              </div>
            </div>
          </Modal.Content>
        </Modal>
      </ErrorBoundary>
    </AppShell>
  );
}
