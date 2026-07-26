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
import { ApiError } from '../api/client';
import { createStudy, listStudies } from '../api/studies';

// 스터디 목록 화면(문서 4-5): GET /studies + BottomCTA(스터디 만들기 → Modal).
export function StudiesPage() {
  const navigate = useNavigate();
  const { openToast } = useToast();
  const [studies, setStudies] = useState<StudyDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await listStudies();
      setStudies(data);
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

  return (
    <AppShell
      title="내 스터디"
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

        {!error && studies !== null ? (
          studies.length === 0 ? (
            <EmptyState
              title="아직 스터디가 없어요"
              description="첫 스터디를 만들어 시작해보세요."
            />
          ) : (
            <>
              <ListHeader title="스터디 목록" />
              <List items={studies} onSelect={(s) => navigate(`/studies/${s.id}`)} />
            </>
          )
        ) : null}

        {!error && studies === null ? (
          <div style={{ padding: 24 }}>
            <Paragraph typography="t6" color="#8B95A1">
              불러오는 중…
            </Paragraph>
          </div>
        ) : null}
      </ErrorBoundary>

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '0 16px env(safe-area-inset-bottom)' }}>
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

function List({ items, onSelect }: { items: StudyDto[]; onSelect: (s: StudyDto) => void }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {items.map((s) => (
        <ListRow
          key={s.id}
          verticalPadding="large"
          arrowType="right"
          withTouchEffect
          onClick={() => onSelect(s)}
          contents={
            <>
              <Paragraph typography="t5" fontWeight="medium">
                {s.title}
              </Paragraph>
              {s.description ? (
                <>
                  <Spacing size={4} />
                  <Paragraph typography="t7" color="#8B95A1">
                    {s.description}
                  </Paragraph>
                </>
              ) : null}
            </>
          }
        />
      ))}
    </ul>
  );
}
