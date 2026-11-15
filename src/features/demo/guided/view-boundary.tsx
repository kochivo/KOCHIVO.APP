import { Component } from 'react';
import type { ReactNode } from 'react';
import { ErrorState } from '@/ui/error-state';

export class ViewBoundary extends Component<{ children: ReactNode; message: string; retryLabel: string }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() {
    return this.state.failed ? <ErrorState message={this.props.message} retryLabel={this.props.retryLabel} onRetry={() => window.location.reload()} /> : this.props.children;
  }
}
