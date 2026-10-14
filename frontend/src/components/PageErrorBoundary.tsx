import { Component, type ErrorInfo, type ReactNode } from "react";
import { useLanguage } from "../i18n/LanguageContext";

function PageFailure() {
  const { t } = useLanguage();
  return (
    <div className="page-width route-error" role="alert">
      <h2>{t("This page could not be displayed")}</h2>
      <p>{t("The analysis may still be running. Refresh this page to reconnect, or return to the explorer.")}</p>
      <div>
        <button className="button secondary" onClick={() => window.location.reload()}>
          {t("Reload page")}
        </button>
        <a className="button primary" href="/">{t("Return to explorer")}</a>
      </div>
    </div>
  );
}

export class PageErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Analysis page rendering failed", error, info.componentStack);
  }
  render() { return this.state.failed ? <PageFailure /> : this.props.children; }
}
