import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    console.error('[admin-client]', error.message, error.stack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, message: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>문제가 발생했어요</h2>
          <p className="muted">{this.state.message ?? '잠시 후 다시 시도해주세요.'}</p>
          <button onClick={this.handleReset}>다시 시도하기</button>
        </div>
      );
    }
    return this.props.children;
  }
}
