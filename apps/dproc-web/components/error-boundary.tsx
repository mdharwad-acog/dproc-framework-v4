"use client";

import { Component, ReactNode } from "react";
import { ErrorAlert } from "./error-alert";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Error boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <ErrorAlert
              error={this.state.error}
              title="Application Error"
              onDismiss={() => this.setState({ hasError: false, error: null })}
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
