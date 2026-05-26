'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default class VisualLearningErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Render error' };
  }

  componentDidCatch(error, info) {
    console.error('VisualLearningErrorBoundary:', error?.message, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-3xl border border-red-500/30 bg-red-950/30 p-8 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-400 mb-4" />
          <p className="text-lg font-semibold text-white">Visual lesson crashed</p>
          <p className="mt-2 text-sm text-red-200/80">{this.state.message}</p>
          <Button
            className="mt-6"
            variant="outline"
            onClick={() => this.setState({ hasError: false, message: '' })}
          >
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
