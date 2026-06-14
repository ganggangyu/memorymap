import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-paper-surface z-[9999] p-8">
          <div className="text-6xl mb-4">💔</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">出了点小问题</h2>
          <p className="text-sm text-gray-500 mb-6 text-center max-w-md">
            {this.state.error?.message || '应用遇到了意外错误'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-6 py-2 bg-seal-500 text-white rounded-lg font-bold shadow-lg hover:bg-seal-600 transition-colors"
          >
            重新加载
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
