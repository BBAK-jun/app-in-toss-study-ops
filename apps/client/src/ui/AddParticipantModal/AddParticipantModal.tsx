import { useState } from 'react';
import { Button, Modal, Paragraph, Spacing, TextField, useToast } from '@toss/tds-mobile';

import { ApiError } from '../../api/client';
import { useAddParticipantMutation } from '../../query/studyQueries';

type AddParticipantModalProps = {
  overlayId: string;
  isOpen: boolean;
  close: (result: void) => void;
  reject: (reason?: unknown) => void;
  unmount: () => void;
  studyId: string;
};

export function AddParticipantModal({
  isOpen,
  close,
  studyId,
}: AddParticipantModalProps) {
  const { openToast } = useToast();
  const mutation = useAddParticipantMutation(studyId);
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => close(undefined);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setError(null);
    try {
      await mutation.mutateAsync({
        name: name.trim(),
        discordHandle: handle.trim() || undefined,
      });
      openToast('참여자를 추가했어요.');
      close(undefined);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '참여자 추가에 실패했어요.');
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
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
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Spacing size={12} />
          <TextField
            variant="box"
            label="Discord 핸들(선택)"
            placeholder="예: @sondi"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
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
            <Button display="block" loading={mutation.isPending} onClick={handleAdd}>
              추가하기
            </Button>
          </div>
        </div>
      </Modal.Content>
    </Modal>
  );
}
