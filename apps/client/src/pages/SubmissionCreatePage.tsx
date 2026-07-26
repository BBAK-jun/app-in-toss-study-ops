import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BottomCTA,
  Button,
  ListHeader,
  ListRow,
  Paragraph,
  Spacing,
  TextField,
  useToast,
} from '@toss/tds-mobile';
import type { ParticipantDto } from '@studyops/shared';

import { EmptyState } from '../components/EmptyState';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ApiError } from '../api/client';
import { listParticipants } from '../api/studies';
import { createSubmission, getRoundStatus } from '../api/rounds';

export function SubmissionCreatePage() {
  const { roundId = '' } = useParams();
  const navigate = useNavigate();
  const { openToast } = useToast();

  const [participants, setParticipants] = useState<ParticipantDto[] | null>(null);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setError(null);
      try {
        const status = await getRoundStatus(roundId);
        if (!active) return;
        const studyId =
          status.submitted[0]?.participant.studyId ?? status.notSubmitted[0]?.studyId ?? '';
        setSubmittedIds(new Set(status.submitted.map((s) => s.participant.id)));
        if (studyId) {
          const all = await listParticipants(studyId);
          if (active) setParticipants(all);
        } else {
          if (active) setParticipants([]);
        }
      } catch (e) {
        if (active) setError(e instanceof ApiError ? e.message : '정보를 불러오지 못했어요.');
      }
    })();
    return () => {
      active = false;
    };
  }, [roundId]);

  const selectable = (participants ?? []).filter((p) => !submittedIds.has(p.id));

  const handleSubmit = async () => {
    if (!selectedId || !url.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createSubmission(roundId, {
        participantId: selectedId,
        url: url.trim(),
        note: note.trim() || undefined,
      });
      openToast('제출을 등록했어요.');
      navigate(`/rounds/${roundId}`, { replace: true });
    } catch (e) {
      const code = e instanceof ApiError ? e.code : '';
      if (code === 'CONFLICT') {
        setError('이미 제출했어요. 회차당 한 번만 제출할 수 있어요.');
      } else {
        setError(e instanceof ApiError ? e.message : '제출 등록에 실패했어요.');
      }
    } finally {
      setSubmitting(false);
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

      <ListHeader title="참여자 선택" />
      {!participants ? (
        <div style={{ padding: 24 }}>
          <Paragraph typography="t6" color="#8B95A1">
            불러오는 중…
          </Paragraph>
        </div>
      ) : selectable.length === 0 ? (
        <EmptyState title="제출할 참여자가 없어요" description="모두 제출했거나 참여자가 없어요." />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {selectable.map((p) => {
            const selected = selectedId === p.id;
            return (
              <ListRow
                key={p.id}
                verticalPadding="medium"
                withTouchEffect
                onClick={() => setSelectedId(p.id)}
                contents={
                  <Paragraph typography="t5" fontWeight={selected ? 'bold' : 'medium'}>
                    {p.name}
                    {p.discordHandle ? <span style={{ color: '#8B95A1' }}> · {p.discordHandle}</span> : null}
                  </Paragraph>
                }
                right={
                  <Button variant={selected ? 'fill' : 'weak'} size="small">
                    {selected ? '선택됨' : '선택'}
                  </Button>
                }
              />
            );
          })}
        </ul>
      )}

      <Spacing size={16} />
      <div style={{ padding: '0 16px' }}>
        <TextField
          variant="box"
          label="제출 링크"
          placeholder="https://github.com/...  (글/PR/Issue/Notion)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          hasError={url.length > 0 && !isValidUrl(url)}
          help={url.length > 0 && !isValidUrl(url) ? '올바른 URL을 입력해주세요.' : undefined}
        />
        <Spacing size={12} />
        <TextField
          variant="box"
          label="메모(선택)"
          placeholder="간단한 설명을 남겨도 좋아요"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '0 16px env(safe-area-inset-bottom)' }}>
        <BottomCTA loading={submitting} disabled={!selectedId || !url.trim() || !isValidUrl(url)} onClick={handleSubmit}>
          제출하기
        </BottomCTA>
      </div>
    </ErrorBoundary>
  );
}

function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
