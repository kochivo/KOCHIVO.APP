'use client';

import { Component } from 'react';
import type { ReactNode } from 'react';

export class TourBoundary extends Component<{ children: ReactNode; onClose: () => void }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch(error: Error) {
    console.warn('Could not display tour', error);
    this.props.onClose();
  }
  override render() { return this.state.failed ? null : this.props.children; }
}
