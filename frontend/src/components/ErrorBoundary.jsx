import React from "react";
import api from "../lib/api";

export default class ErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error, info) {
    api.post("/error-logs/client", { kind: "RenderError", message: error.message, route: window.location.pathname, screen: info.componentStack?.slice(0, 600) }).catch(() => {});
  }
  render() {
    if (this.state.failed) return <div className="min-h-screen grid place-items-center p-6 text-center"><div><h1 className="text-xl font-bold text-ink">This screen needs a refresh</h1><p className="mt-2 text-sm text-subink">The issue has been recorded for the administrator.</p><button className="mt-5 text-sm font-semibold text-brand" onClick={() => window.location.reload()}>Refresh app</button></div></div>;
    return this.props.children;
  }
}
