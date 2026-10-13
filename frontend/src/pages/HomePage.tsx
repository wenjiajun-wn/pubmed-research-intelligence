import { useLanguage } from "../i18n/LanguageContext";
import {
  ArrowUpRight,
  ChartNoAxesCombined,
  FileText,
  ScanSearch,
} from "lucide-react";
import { SearchForm } from "../components/SearchForm";
import { Link } from "react-router-dom";
export function HomePage({
  onSearch,
  busy,
  error,
}: {
  onSearch: (q: string, mode: "live" | "demo", size: number) => void;
  busy: boolean;
  error: string;
}) {
  const { t } = useLanguage();
  return (
    <div className="home page-width">
      <section className="hero">
        <h1>
          {t("PubMed Research")}
          <br />
          <span>{t("Intelligence")}</span>
        </h1>
        <p className="hero-description">
          {t(
            "Discover research trends, influential papers and emerging topics",
          )}
          <br className="desktop-break" />
          {t("from millions of biomedical publications.")}
        </p>
        <SearchForm onSearch={onSearch} busy={busy} />
        {error && (
          <div role="alert" className="error-message">
            {t(error)}
          </div>
        )}
      </section>
      <section className="home-value">
        <div>
          <ScanSearch size={24} />
          <h2>{t("Start with a question.")}</h2>
          <p>
            {t(
              "Search the biomedical literature directly through NCBI. Every analysis starts with real, traceable publications.",
            )}
          </p>
        </div>
        <div>
          <ChartNoAxesCombined size={24} />
          <h2>{t("See the research landscape.")}</h2>
          <p>
            {t(
              "Explore publication trends, active institutions\u2019 countries, journals and the topics connecting a field.",
            )}
          </p>
        </div>
        <div>
          <FileText size={24} />
          <h2>{t("Read with context.")}</h2>
          <p>
            {t(
              "Move from a field overview to individual papers and an evidence-grounded Chinese research brief.",
            )}
          </p>
        </div>
      </section>
      <div className="home-proof">
        <span>{t("Built on open scientific metadata")}</span>
        <strong>
          PubMed <span>/</span>
          {t("National Library of Medicine")}
        </strong>
        <Link to="/sources">
          {t("Explore our methodology")}
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </div>
  );
}
