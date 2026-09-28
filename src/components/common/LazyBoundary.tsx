import React, { Suspense } from 'react';

interface LazyBoundaryProps {
  children: React.ReactNode;
  onClose: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Shows a message instead of crashing the whole game if a lazily loaded
// chunk (e.g. the 3D viewer) fails to download.
class LoadErrorBoundary extends React.Component<LazyBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="modal-overlay" onClick={this.props.onClose}>
        <div className="modal-content-card" style={{ maxWidth: '420px', textAlign: 'center' }}>
          <p style={{ marginBottom: '14px' }}>
            This feature could not be loaded. Please check your connection and try again.
          </p>
          <button className="btn-primary" onClick={this.props.onClose}>Close</button>
        </div>
      </div>
    );
  }
}

const LoadingOverlay: React.FC = () => (
  <div className="modal-overlay" role="status" aria-live="polite">
    <div className="modal-content-card" style={{ maxWidth: '320px', textAlign: 'center' }}>
      Loading…
    </div>
  </div>
);

/** Suspense + error handling for modals loaded with React.lazy. */
export const LazyBoundary: React.FC<LazyBoundaryProps> = ({ children, onClose }) => (
  <LoadErrorBoundary onClose={onClose}>
    <Suspense fallback={<LoadingOverlay />}>{children}</Suspense>
  </LoadErrorBoundary>
);
