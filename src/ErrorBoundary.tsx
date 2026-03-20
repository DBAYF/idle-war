import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/** Catches render errors so a blank screen becomes a recoverable message (helps production debugging). */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err?.message ?? 'Unknown error' };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', err, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            background: '#0a0b0f',
            color: '#e8eaed',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          <h1 style={{ color: '#00d4aa', marginBottom: '0.5rem' }}>Something went wrong</h1>
          <p style={{ opacity: 0.85, maxWidth: '32rem', marginBottom: '1rem' }}>
            The app hit an error. Try refreshing the page. If this persists, open the browser console for details.
          </p>
          {import.meta.env.DEV && (
            <pre
              style={{
                textAlign: 'left',
                fontSize: '0.75rem',
                opacity: 0.7,
                overflow: 'auto',
                maxWidth: '100%',
              }}
            >
              {this.state.message}
            </pre>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1.5rem',
              padding: '0.6rem 1.2rem',
              background: '#00d4aa',
              color: '#0a0b0f',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
