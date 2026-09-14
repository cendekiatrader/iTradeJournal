import React from 'react';
import { AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  label?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep a breadcrumb for debugging without breaking the whole app
    console.error('[iTradeJournal] View crashed:', error, info);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            padding: '56px 24px',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: 'var(--loss-red-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <AlertTriangle size={22} color="var(--loss-red)" />
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Something went wrong{this.props.label ? ` in ${this.props.label}` : ' in this view'}
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '460px', lineHeight: 1.5 }}>
            {this.state.error.message || 'An unexpected error occurred while rendering this section.'}
          </p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={this.handleRetry}>
              <RotateCcw size={14} /> Try again
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={this.handleReload}>
              <RefreshCw size={14} /> Reload app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
