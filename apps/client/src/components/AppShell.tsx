import { type ReactNode } from 'react';
import { Top, TopNavigation, TopNavigationBackButton } from '@toss/tds-mobile';

interface AppShellProps {
  title: string;
  // onBack 이 있으면 TopNavigation(+뒤로가기), 없으면 Top(타이틀 블록).
  onBack?: () => void;
  right?: ReactNode;
  children: ReactNode;
}

// 공통 모바일 레이아웃. 최상단 Top/TopNavigation + 스크롤 영역.
// BottomCTA 가 fixed 로 하단에 뜨므로 main 에 하단 여백을 둔다.
export function AppShell({ title, onBack, right, children }: AppShellProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        background: '#F4F5F7', // adaptive greyBackground 근사치
      }}
    >
      {onBack ? (
        <TopNavigation
          leading={<TopNavigationBackButton aria-label="뒤로 가기" onClick={onBack} />}
          content={title}
          trailing={right}
        />
      ) : (
        <Top title={title} right={right} />
      )}
      <main style={{ flex: 1, paddingBottom: 112 }}>{children}</main>
    </div>
  );
}
