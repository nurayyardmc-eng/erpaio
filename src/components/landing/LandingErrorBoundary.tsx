"use client";
// Sprint G.4 — error boundary for interactive landing widgets.
//
// The marketing page is mostly static SSR, but the interactive islands
// (AiDemoPreview, DemoRequest) run client JS that could throw. A crash in
// one of them must NOT blank the whole landing page. This boundary
// isolates each island: on error it renders a quiet inline fallback and
// reports to console (Sentry already auto-instruments unhandled errors;
// this gives a contextual breadcrumb + a graceful UI).
//
// React error boundaries must be class components — there is no hook
// equivalent for componentDidCatch.

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Short label shown in the fallback, e.g. "demo". */
  section?: string;
  /** Optional custom fallback overriding the default inline message. */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class LandingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Sentry's global handler captures the throw; this adds a labeled
    // breadcrumb so we know WHICH island failed.
    console.error(`[landing:${this.props.section ?? "widget"}]`, error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div
        role="alert"
        style={{
          maxWidth: 560,
          margin: "0 auto",
          padding: "24px 20px",
          textAlign: "center",
          color: "var(--text-secondary)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          background: "var(--bg-alt)",
          fontSize: 14,
        }}
      >
        This section couldn’t load. Please refresh the page.
      </div>
    );
  }
}
