import { useNavigate } from 'react-router-dom';
import { Button, Paragraph, Spacing } from '@toss/tds-mobile';
import { AppShell } from '../components/AppShell';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <AppShell title="앗">
      <div style={{ padding: '72px 24px', textAlign: 'center' }}>
        <Paragraph typography="t3" fontWeight="bold">
          페이지를 찾을 수 없어요
        </Paragraph>
        <Spacing size={8} />
        <Paragraph typography="t6" color="#8B95A1">
          주소가 잘못됐거나, 삭제된 페이지일 수 있어요.
        </Paragraph>
        <Spacing size={20} />
        <Button onClick={() => navigate('/', { replace: true })}>홈으로 가기</Button>
      </div>
    </AppShell>
  );
}
