import { useState } from 'react';
import type { OverlayAsyncControllerComponent } from 'overlay-kit';
import { Button, Modal, Paragraph, Spacing, TextField, useToast } from '@toss/tds-mobile';

import { ApiError } from '../../lib/api-client';
import { useCreateStudyMutation } from '../../query/studyQueries';

export const CreateStudyModal: OverlayAsyncControllerComponent<void> = ({ isOpen, close }) => {
  const { openToast } = useToast();
  const mutation = useCreateStudyMutation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleClose = () => close(undefined);

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      await mutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
      });
      openToast('스터디를 만들었어요.');
      close(undefined);
    } catch {
      // mutation.error 로 에러 UI 표시
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
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
          {mutation.isError ? (
            <>
              <Paragraph typography="t7" color="#EF4444">
                {mutation.error instanceof ApiError
                  ? mutation.error.message
                  : '스터디 생성에 실패했어요.'}
              </Paragraph>
              <Spacing size={12} />
            </>
          ) : null}
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
};
