'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default class VisualLearningErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '', stack: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Render error' };
  }

  componentDidCatch(error, info) {
    // Store stack for dev-mode inspection and log
    console.error('VisualLearningErrorBoundary:', error?.message, info?.componentStack);
    try {
      this.setState({ stack: info?.componentStack || null });
    } catch (e) {}
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '', stack: null });
    if (typeof this.props.onReset === 'function') {
      try {
        this.props.onReset();
      } catch (e) {
        console.error('VisualLearningErrorBoundary: onReset handler threw', e);
      }
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-3xl border border-red-500/30 bg-red-950/30 p-8 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-400 mb-4" />
          <p className="text-lg font-semibold text-white">Visual lesson crashed</p>
          <p className="mt-2 text-sm text-red-200/80">{this.state.message}</p>
          {process.env.NODE_ENV === 'development' && this.state.stack && (
            <pre className="mt-4 text-xs text-left text-red-100 max-h-40 overflow-auto">{this.state.stack}</pre>
          )}
          <Button
            className="mt-6"
            variant="outline"
            onClick={this.handleReset}
          >
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
