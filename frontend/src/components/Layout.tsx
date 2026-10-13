import { useLanguage } from "../i18n/LanguageContext";
import { NavLink, Link } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  Database,
  Github,
  Languages,
} from "lucide-react";
import type { ReactNode } from "react";
export function Layout({
  children,
  analysisId,
}: {
  children: ReactNode;
  analysisId?: string;
}) {
  const { t, language, toggleLanguage } = useLanguage();
  return (
    <>
      <a className="skip-link" href="#main">
        {t("Skip to content")}
      </a>
      <header className="site-header">
        <div className="nav-inner">
          <Link className="brand" to="/">
            <span className="brand-symbol">
              <Activity size={23} strokeWidth={2} />
            </span>
            <span>
              PubMed
              <span className="brand-sub">{t("Research Intelligence")}</span>
            </span>
          </Link>
          <nav aria-label={t("Main navigation")}>
            <NavLink to={analysisId ? `/analysis/${analysisId}` : "/"} end>
              {t("Explore")}
            </NavLink>
            <NavLink to={analysisId ? `/sources/${analysisId}` : "/sources"}>
              {t("Data sources")}
            </NavLink>
            <NavLink to="/about">{t("About")}</NavLink>
            <NavLink to="/about#source" className="github-link">
              <Github size={16} /> <span>GitHub</span>
              <ArrowUpRight size={13} />
            </NavLink>
            <button
              type="button"
              className="language-toggle"
              onClick={toggleLanguage}
              aria-label={
                language === "en" ? "切换为中文" : "Switch to English"
              }
              title={language === "en" ? "切换为中文" : "Switch to English"}
            >
              <Languages size={15} />
              <span lang={language === "en" ? "zh-CN" : "en"}>
                {language === "en" ? "中文" : "English"}
              </span>
            </button>
          </nav>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="site-footer">
        <span>
          <Activity size={16} />
          {t("PubMed Research Intelligence")}
        </span>
        <span>
          <Database size={14} />
          {t("Powered by NCBI PubMed")} <span className="footer-dot">·</span>
          {t("Evidence before inference")}
        </span>
        <Link to="/sources">
          {t("Methodology")}
          <ArrowUpRight size={13} />
        </Link>
      </footer>
    </>
  );
}
