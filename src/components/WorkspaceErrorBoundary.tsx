import React from 'react';

/** Keep navigation usable if a view or an outdated lazy-loaded asset fails. */
export class WorkspaceErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  render() {
    if (!this.state.failed) return this.props.children;
    return <section className="dm-card" role="alert" style={{ margin: 24 }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>This screen couldn’t load</h1>
      <p style={{ marginBottom: 16 }}>Reload to get the latest app files. Your saved workspace data is unaffected.</p>
      <button className="dm-button" onClick={() => window.location.reload()}>Reload app</button>
    </section>;
  }
}
