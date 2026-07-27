import { useNavigate } from '@tanstack/react-router';
import {
  BottomCTA,
  Button,
  ListHeader,
  ListRow,
  Paragraph,
  Spacing,
  useToast,
} from '@toss/tds-mobile';
import type { StudyDto } from '@studyops/shared';

import { EmptyState } from '../components/EmptyState';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ApiError } from '../lib/api-client';
import { useStudiesQuery } from '../query/studyQueries';
import { usePageLayout } from '../layout/PageLayoutContext';
import { openCreateStudyModal } from '../ui/CreateStudyModal/openCreateStudyModal';

export function StudiesPage() {
  const navigate = useNavigate();
  const { openToast } = useToast();
  const { data: studies, isLoading, error, refetch } = useStudiesQuery();

  usePageLayout({ onRefresh: () => { void refetch(); } });

  const errorMessage = error instanceof ApiError ? error.message : error ? '스터디를 불러오지 못했어요.' : null;

  const handleCreate = async () => {
    // 모달에서 mutation + invalidation 처리.
    // useStudiesQuery 가 자동으로 refetch 되어 목록에 반영됨.
    await openCreateStudyModal();
  };

  return (
    <ErrorBoundary>
      {errorMessage ? (
        <div style={{ padding: '24px' }}>
          <Paragraph typography="t6" color="#EF4444">
            {errorMessage}
          </Paragraph>
          <Spacing size={8} />
          <Button size="small" onClick={() => void refetch()}>
            다시 불러오기
          </Button>
        </div>
      ) : null}

      {!errorMessage && !isLoading && studies ? (
        studies.length === 0 ? (
          <EmptyState title="아직 스터디가 없어요" description="첫 스터디를 만들어 시작해보세요." />
        ) : (
          <>
            <ListHeader title="스터디 목록" />
            <List items={studies} onSelect={(s) => navigate({ to: '/studies/$studyId', params: { studyId: s.id } })} />
          </>
        )
      ) : null}

      {!errorMessage && isLoading ? (
        <div style={{ padding: 24 }}>
          <Paragraph typography="t6" color="#8B95A1">
            불러오는 중…
          </Paragraph>
        </div>
      ) : null}

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '0 16px env(safe-area-inset-bottom)' }}>
        <BottomCTA onClick={() => void handleCreate()}>스터디 만들기</BottomCTA>
      </div>
    </ErrorBoundary>
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
