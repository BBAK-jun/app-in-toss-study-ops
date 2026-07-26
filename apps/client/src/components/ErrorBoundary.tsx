import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Paragraph, Spacing, Button } from '@toss/tds-mobile';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  message?: string;
}

// 렌더/라이프사이클 에러를 잡아 폴백 화면 제공. API 에러(ApiError)는 각 페이지에서 처리.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // MVP: 콘솔 로그. 추후 센터리/로그 연동 지점.
    console.error('[ErrorBoundary]', error, info);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, message: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '64px 24px', textAlign: 'center' }}>
          <Paragraph typography="t4" fontWeight="bold">
            문제가 발생했어요
          </Paragraph>
          <Spacing size={8} />
          <Paragraph typography="t6" color="#8B95A1">
            {this.state.message ?? '잠시 후 다시 시도해주세요.'}
          </Paragraph>
          <Spacing size={16} />
          <Button onClick={this.handleReset}>다시 시도하기</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
