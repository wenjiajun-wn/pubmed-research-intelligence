import { useLanguage } from "../i18n/LanguageContext";
import { Link } from "react-router-dom";
import { ArrowRight, Database, Github } from "lucide-react";
export function AboutPage() {
  const { t } = useLanguage();
  return (
    <div className="about-page page-width">
      <h1>{t("From publications to perspective.")}</h1>
      <p className="about-lead">
        {t(
          "PubMed Research Intelligence is a focused research exploration demo: a transparent view of the literature, with the evidence always one click away.",
        )}
      </p>
      <section className="panel">
        <h2>{t("One query. A connected research landscape.")}</h2>
        <p>
          {t(
            "Search PubMed, review publication trends, compare journals and countries, explore research topics, and read a concise Chinese research brief. Every chart makes its statistical scope explicit.",
          )}
        </p>
        <div className="pipeline">
          <span>{t("Search")}</span>
          <ArrowRight size={17} />
          <span>{t("Collect")}</span>
          <ArrowRight size={17} />
          <span>{t("Analyze")}</span>
          <ArrowRight size={17} />
          <span>{t("Synthesize")}</span>
        </div>
        <Link className="button primary" to="/">
          {t("Explore the literature")}
          <ArrowRight size={15} />
        </Link>
      </section>
      <section className="about-columns">
        <div>
          <Database size={24} />
          <h2>{t("Made for inspectable research")}</h2>
          <p>
            {t(
              "Real PubMed metadata, a reproducible local snapshot and clear separation between publication statistics and inferred themes. This is an exploratory tool, not a systematic review or clinical recommendation.",
            )}
          </p>
          <Link to="/sources">{t("Read the methodology")}</Link>
        </div>
        <div id="source">
          <Github size={24} />
          <h2>{t("Project source")}</h2>
          <p>
            {t(
              "This demo is delivered as a local project with a React frontend and a Python FastAPI backend. A public GitHub repository has not been configured.",
            )}
          </p>
          <p>
            {t(
              "See the included README for installation, API documentation, environment variables and demo preparation.",
            )}
          </p>
        </div>
      </section>
    </div>
  );
}
