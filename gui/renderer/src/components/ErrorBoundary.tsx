/**
 * 단일 영역(예: ReportPanel) 의 렌더 에러를 캐치해서 흰화면 대신
 * 에러 메시지를 표시. 부모 트리는 살아남는다.
 *
 * React 19 class component — 함수형은 componentDidCatch 등가 hook 이 없다.
 */

import { Component, type ErrorInfo, type JSX, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  /** 에러 발생 영역 이름 (메시지에 표시). */
  label?: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // console 에 stack 남겨두면 dev mode 에서 디버깅 가능.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', this.props.label ?? 'unknown', error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error !== null) {
      return (
        <ErrorFallback
          label={this.props.label}
          error={this.state.error}
          onReset={this.reset}
        />
      );
    }
    return this.props.children;
  }
}

function ErrorFallback({
  label,
  error,
  onReset,
}: {
  label?: string;
  error: Error;
  onReset: () => void;
}): JSX.Element {
  return (
    <div
      style={{
        padding: 20,
        height: '100%',
        overflow: 'auto',
        background: '#fff',
      }}
    >
      <h3 style={{ color: '#b91c1c', margin: '0 0 8px', fontSize: 14 }}>
        {label ?? '영역'} 렌더 중 에러 발생
      </h3>
      <p style={{ fontSize: 13, color: '#7f1d1d', margin: '0 0 8px' }}>
        {error.message}
      </p>
      {error.stack && (
        <pre
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            padding: 8,
            borderRadius: 4,
            fontSize: 11,
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            color: '#7f1d1d',
          }}
        >
          {error.stack}
        </pre>
      )}
      <button
        type="button"
        onClick={onReset}
        style={{
          marginTop: 10,
          padding: '6px 12px',
          fontSize: 12,
          background: '#fff',
          border: '1px solid #ddd',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        다시 시도
      </button>
    </div>
  );
}
