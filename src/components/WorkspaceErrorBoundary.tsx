import React from 'react';

/** Keep navigation usable if a view or an outdated lazy-loaded asset fails. */
export class WorkspaceErrorBoundary extends React.Component<
  React.PropsWithChildren,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="dm-card mx-auto my-8 max-w-lg" role="alert">
        <h1 className="text-xl font-semibold text-[#0f172a]">This screen could not load</h1>
        <p className="mt-2 text-sm text-[#475569]">
          Reload to fetch the latest application bundle. Your saved workspace data is unaffected.
        </p>
        <button
          type="button"
          className="dm-button dm-button-primary mt-5"
          onClick={() => window.location.reload()}
        >
          Reload workspace
        </button>
      </section>
    );
  }
}
