import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          maxWidth: '800px',
          margin: '2rem auto',
          backgroundColor: '#fee',
          border: '2px solid #dc3545',
          borderRadius: '8px'
        }}>
          <h1 style={{ color: '#dc3545', marginBottom: '1rem' }}>Something went wrong</h1>
          <details style={{ whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Error Details
            </summary>
            <div style={{
              backgroundColor: '#fff',
              padding: '1rem',
              borderRadius: '4px',
              border: '1px solid #ddd',
              marginTop: '0.5rem',
              fontFamily: 'monospace',
              fontSize: '0.875rem'
            }}>
              <strong>Error:</strong> {this.state.error?.toString()}
              <br /><br />
              <strong>Stack:</strong>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {this.state.error?.stack}
              </pre>
              <br />
              <strong>Component Stack:</strong>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
