// A crash in one screen must never leave the student with a blank page: show what happened and a way back.
import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidUpdate(prev: { resetKey: string }) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="stack" role="alert">
        <div className="alert error">Something went wrong on this screen. Your details are safe on this device.</div>
        <p className="body-m muted" data-error>{this.state.error.message}</p>
        <button className="btn tonal" onClick={() => history.back()}>Go back</button>
      </div>
    );
  }
}
