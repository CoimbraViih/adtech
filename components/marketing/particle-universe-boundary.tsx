"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

/**
 * Error boundary that silently catches WebGL / Three.js failures from
 * ParticleUniverse. If the canvas fails to initialize (e.g. WebGL not
 * supported), the rest of the marketing page continues to render normally.
 */
export class ParticleUniverseBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: { componentStack: string }) {
    // Log to console in development; in production Sentry picks this up via
    // its automatic error boundary integration.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[ParticleUniverse] WebGL render failed, hiding background:", error.message, info.componentStack);
    }
  }

  override render() {
    if (this.state.hasError) {
      // Render a simple black background fallback — no canvas, no crash.
      return (
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 0,
            pointerEvents: "none",
            background: "radial-gradient(ellipse at 20% 50%, #0d0520 0%, #000005 40%, #000000 100%)",
          }}
        />
      );
    }
    return this.props.children;
  }
}
