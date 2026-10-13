import { useLanguage } from "../i18n/LanguageContext";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Database,
  ExternalLink,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { api, dataLabel, number, timestamp } from "../services/api";
import type { Sources } from "../types";
const generalMethods = [
  {
    title: "Official biomedical metadata",
    text: "ESearch retrieves query counts and PMIDs. EFetch supplies article titles, abstracts, authors, affiliations, dates, DOI, publication types, keywords and MeSH terms.",
  },
  {
    title: "Transparent sampling",
    text: "Download 300–1,000 recent papers. Full-query publication trends and sample-based landscape statistics are labeled separately.",
  },
  {
    title: "External journal metrics",
    text: "Journal Impact Factor is not provided directly by PubMed. This demo uses a limited local CSV mapping with publisher source links. Missing metrics remain N/A.",
  },
  {
    title: "Evidence-grounded synthesis",
    text: "An optional LLM summarizes only supplied evidence. Without a key, a clearly labeled statistical brief is generated. No clinical efficacy conclusions are inferred from publication counts.",
  },
];
export function DataSourcesPage() {
  const { t, language } = useLanguage();
  const { id } = useParams();
  const [data, setData] = useState<Sources | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    setData(null);
    setError("");
    function load() {
      if (!id) return;
      api
        .sources(id)
        .then((d) => {
          if (active) {
            setData(d);
            if (d.summary_mode === "pending") timer = setTimeout(load, 1000);
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    }
    load();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [id]);
  return (
    <div className="sources-page page-width">
      <Link className="back-link" to={id ? `/analysis/${id}` : "/"}>
        <ArrowLeft size={15} />{" "}
        {t(id ? "Back to analysis" : "Back to explorer")}
      </Link>
      <div className="sources-title">
        <div>
          <h1>{t("Data sources & methodology")}</h1>
          <p>
            {t(
              "Every insight begins with a source. Here is how this analysis is built.",
            )}
          </p>
        </div>
        <button onClick={() => window.print()} className="button secondary">
          <Printer size={16} />
          {t("Print / Save PDF")}
        </button>
      </div>
      <section className="source-hero">
        <div className="source-identity">
          <Database size={33} />
          <div>
            <h2>PubMed</h2>
            <p>{t("National Library of Medicine")}</p>
            <span>NCBI E-utilities API</span>
          </div>
          <ShieldCheck className="source-check" size={28} />
        </div>
        <div className="source-description">
          <p>
            {t(
              "Biomedical literature from the U.S. National Library of Medicine. Metadata is retrieved directly from the official NCBI programming interface.",
            )}
          </p>
          <a
            href="https://pubmed.ncbi.nlm.nih.gov/"
            target="_blank"
            rel="noreferrer"
          >
            {t("Visit PubMed")}
            <ArrowUpRight size={15} />
          </a>
          <a
            href="https://www.ncbi.nlm.nih.gov/books/NBK25501/"
            target="_blank"
            rel="noreferrer"
          >
            {t("API documentation")}
            <ArrowUpRight size={15} />
          </a>
        </div>
      </section>
      {error && (
        <div className="error-message" role="alert">
          {t(error)} <Link to="/">{t("Start a new analysis")}</Link>
        </div>
      )}
      {id && !data && !error && (
        <p role="status">{t("Loading retrieval details\u2026")}</p>
      )}
      {data ? (
        <section className="panel retrieval-panel">
          <div className="panel-heading">
            <h2>{t("Retrieval record")}</h2>
            <span className="status-badge">
              <span />
              {t(dataLabel(data.data_mode))}
            </span>
          </div>
          <dl className="source-record">
            <div>
              <dt>{t("Query")}</dt>
              <dd className="query-value">“{data.query}”</dd>
            </div>
            <div>
              <dt>{t("Total PubMed matches")}</dt>
              <dd>
                {t("{count} publications", { count: number(data.total_count) })}
              </dd>
            </div>
            <div>
              <dt>{t("Retrieved & analyzed")}</dt>
              <dd>{t("{count} papers", { count: number(data.retrieved) })}</dd>
            </div>
            <div>
              <dt>{t("Retrieval time")}</dt>
              <dd>{timestamp(data.retrieved_at, language)}</dd>
            </div>
            <div>
              <dt>API</dt>
              <dd>PubMed E-utilities · ESearch / EFetch</dd>
            </div>
            <div>
              <dt>{t("Summary method")}</dt>
              <dd>
                {data.summary_mode === "pending"
                  ? t("Generating AI research brief")
                  : data.summary_mode === "llm"
                  ? t("LLM synthesis from supplied evidence")
                  : t("Deterministic statistical summary")}
              </dd>
            </div>
          </dl>
          <details className="query-details">
            <summary>{t("View PubMed query translation")}</summary>
            <code>{data.query_translation}</code>
          </details>
        </section>
      ) : (
        !id && (
          <div className="source-prompt">
            <p>
              {t(
                "Run an analysis to add its query, sample size and retrieval timestamp to this page.",
              )}
            </p>
            <Link to="/" className="button primary">
              {t("Explore a research field")}
              <ArrowUpRight size={15} />
            </Link>
          </div>
        )
      )}
      <div className="section-heading">
        <div>
          <h2>{t("How to read the results")}</h2>
          <p>{t("Methods, scope and limitations")}</p>
        </div>
      </div>
      <div className="methods-grid">
        {(data?.methods || generalMethods).map((m) => (
          <article key={m.title}>
            <div>
              <h3>{t(m.title)}</h3>
              <p>{t(m.text)}</p>
            </div>
          </article>
        ))}
      </div>
      <section className="source-links">
        <h2>{t("Source references")}</h2>
        <a
          href="https://pubmed.ncbi.nlm.nih.gov/"
          target="_blank"
          rel="noreferrer"
        >
          {t("PubMed \u00B7 National Library of Medicine")}
          <ExternalLink size={14} />
        </a>
        <a
          href="https://www.ncbi.nlm.nih.gov/books/NBK25499/"
          target="_blank"
          rel="noreferrer"
        >
          {t("NCBI E-utilities parameter reference")}
          <ExternalLink size={14} />
        </a>
        <a
          href="https://www.nature.com/nature-portfolio/about-journals/journal-metrics"
          target="_blank"
          rel="noreferrer"
        >
          {t("Nature Portfolio \u00B7 Publisher-reported journal metrics")}
          <ExternalLink size={14} />
        </a>
        <p className="fine-print">
          {t(
            "Additional journal metric sources are linked alongside each available metric. Cached data retains its original retrieval timestamp.",
          )}
        </p>
      </section>
    </div>
  );
}
