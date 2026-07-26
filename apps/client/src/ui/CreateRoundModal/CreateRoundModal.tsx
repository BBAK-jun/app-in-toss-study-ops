import { useState } from 'react';
import { Button, Modal, Paragraph, Spacing, TextField } from '@toss/tds-mobile';
import type { RoundDto } from '@studyops/shared';

import { ApiError } from '../../api/client';
import { useCreateRoundMutation } from '../../query/studyQueries';

export type CreateRoundModalResult = Pick<RoundDto, 'id'>;

type CreateRoundModalProps = {
  overlayId: string;
  isOpen: boolean;
  close: (result: CreateRoundModalResult | null) => void;
  reject: (reason?: unknown) => void;
  unmount: () => void;
  studyId: string;
  initialRoundNumber: number;
};

export function CreateRoundModal({
  isOpen,
  close,
  studyId,
  initialRoundNumber,
}: CreateRoundModalProps) {
  const mutation = useCreateRoundMutation(studyId);
  const [title, setTitle] = useState('');
  const [number, setNumber] = useState(String(initialRoundNumber));
  const [dueAt, setDueAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => close(null);

  const handleCreate = async () => {
    const num = Number(number);
    if (!title.trim() || Number.isNaN(num)) return;
    setError(null);
    try {
      const created = await mutation.mutateAsync({
        roundNumber: num,
        title: title.trim(),
        dueAt: dueAt ? new Date(dueAt).getTime() : undefined,
      });
      close({ id: created.id });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '회차 생성에 실패했어요.');
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
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
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
          <Spacing size={12} />
          <TextField
            variant="box"
            label="회차 제목"
            placeholder="예: 이분탐색"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Spacing size={12} />
          <TextField
            variant="box"
            label="마감일(선택)"
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
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
            <Button display="block" loading={mutation.isPending} onClick={handleCreate}>
              만들기
            </Button>
          </div>
        </div>
      </Modal.Content>
    </Modal>
  );
}
