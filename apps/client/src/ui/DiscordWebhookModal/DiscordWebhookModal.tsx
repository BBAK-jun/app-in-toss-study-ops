import { useState } from 'react';
import { Button, Modal, Paragraph, Spacing, TextField, useToast } from '@toss/tds-mobile';

import { ApiError } from '../../lib/api-client';
import { useUpdateStudyMutation } from '../../query/studyQueries';

type DiscordWebhookModalProps = {
  overlayId: string;
  isOpen: boolean;
  close: (result: void) => void;
  reject: (reason?: unknown) => void;
  unmount: () => void;
  studyId: string;
  currentUrl?: string;
};

export function DiscordWebhookModal({
  isOpen,
  close,
  studyId,
  currentUrl,
}: DiscordWebhookModalProps) {
  const { openToast } = useToast();
  const mutation = useUpdateStudyMutation(studyId);
  const [url, setUrl] = useState(currentUrl ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => close(undefined);

  const handleSave = async () => {
    setError(null);
    try {
      await mutation.mutateAsync({
        discordWebhookUrl: url.trim() || null,
      });
      openToast('Discord 알림을 설정했어요.');
      close(undefined);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Discord 설정에 실패했어요.');
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
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
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          {error ? (
            <>
              <Spacing size={12} />
              <Paragraph typography="t7" color="#EF4444">{error}</Paragraph>
            </>
          ) : null}
          <Spacing size={20} />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="weak" display="block" onClick={handleClose}>
              취소
            </Button>
            <Button display="block" loading={mutation.isPending} onClick={handleSave}>
              저장하기
            </Button>
          </div>
        </div>
      </Modal.Content>
    </Modal>
  );
}
