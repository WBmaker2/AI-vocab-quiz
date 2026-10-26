import { Component } from "react";
import { reportClientError } from "../lib/observability.js";
import { formatAppError } from "../utils/appError.js";
import { ErrorNotice } from "./ErrorNotice.jsx";

export class AppErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    reportClientError(error, {
      source: "react-error-boundary",
      view: this.props.view ?? "",
      componentStack: info?.componentStack ?? "",
    });
  }

  handleRetry = () => {
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <section className="workspace-panel app-error-fallback">
        <p className="mode-label">{this.props.eyebrow ?? "Activity Error"}</p>
        <h2>{this.props.title ?? "화면을 불러오지 못했습니다"}</h2>
        <ErrorNotice
          title="잠시 문제가 생겼어요"
          message={formatAppError(
            this.state.error,
            "활동을 계속할 수 없습니다. 다시 시도하거나 홈으로 돌아가 주세요.",
          )}
          onRetry={this.handleRetry}
          onHome={this.props.onHome}
        />
      </section>
    );
  }
}
