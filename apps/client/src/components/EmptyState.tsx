import { Paragraph, Spacing } from '@toss/tds-mobile';

interface EmptyStateProps {
  title?: string;
  description?: string;
}

// 빈 목록 안내. 토스 보이스톤(해요체/긍정형).
export function EmptyState({
  title = '아직 항목이 없어요',
  description,
}: EmptyStateProps) {
  return (
    <div style={{ padding: '72px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, lineHeight: 1 }} aria-hidden>
        📭
      </div>
      <Spacing size={16} />
      <Paragraph typography="t5" fontWeight="medium">
        {title}
      </Paragraph>
      {description ? (
        <>
          <Spacing size={6} />
          <Paragraph typography="t6" color="#8B95A1">
            {description}
          </Paragraph>
        </>
      ) : null}
    </div>
  );
}
