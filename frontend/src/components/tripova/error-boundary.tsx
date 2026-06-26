"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  t: Record<string, string>;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("ErrorBoundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          maxWidth: 480, margin: "0 auto", minHeight: "100dvh",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: 16, padding: 32,
          background: this.props.t.bg, color: this.props.t.text,
        }}>
          <div style={{ fontSize: 48 }}>!</div>
          <div style={{ fontFamily: "var(--font-dm-serif), Georgia, serif", fontSize: 22, color: this.props.t.heading, textAlign: "center" }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 14, color: this.props.t.muted, textAlign: "center", lineHeight: 1.5 }}>
            This screen encountered an error. Try refreshing the page.
          </div>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{
              marginTop: 8, padding: "12px 24px", borderRadius: 11, border: "none",
              background: this.props.t.accent, color: this.props.t.onAccent,
              fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
