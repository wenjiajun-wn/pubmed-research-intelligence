import { useLanguage } from "../i18n/LanguageContext";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Database,
  Download,
  Globe2,
  Info,
  Layers,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { Analysis } from "../types";
import { dataLabel, number, timestamp } from "../services/api";
import { SearchForm } from "../components/SearchForm";
import { TrendChart, BarChart, WordCloud } from "../components/DashboardCharts";
import { PapersTable } from "../components/PapersTable";
export function DashboardPage({
  data,
  onSearch,
  busy,
}: {
  data: Analysis;
  onSearch: (q: string, mode: "live" | "demo", size: number) => void;
  busy: boolean;
}) {
  const { t, language } = useLanguage();
  const overview = data.overview,
    insight = data.insights;
  const exportBrief = () => {
    const content =
      `# ${data.query}\n\n${t("Retrieved")}: ${timestamp(data.retrieved_at, language)}\n${t("Source")}: ${t(dataLabel(data.data_mode))}\n${t("Summary method")}: ${t(data.summary_mode === "llm" ? "AI assisted" : "Statistical summary")}\n${t("Sample size")}: ${data.sample_size}\n\n` +
      data.research_brief
        .map(
          (s) =>
            `## ${s.title}\n${s.text}\n${s.pmids.map((id) => `https://pubmed.ncbi.nlm.nih.gov/${id}/`).join("\n")}`,
        )
        .join("\n\n");
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/markdown;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "research-brief.md";
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="dashboard page-width">
      <div className="dashboard-search">
        <span>
          <SearchLabel />
          {t("Analyze a research field")}
        </span>
        <SearchForm
          key={data.id}
          compact
          initial={data.query}
          initialSize={
            data.requested_sample_size ??
            ([300, 500, 1000].includes(data.sample_size) ? data.sample_size : 500)
          }
          busy={busy}
          onSearch={onSearch}
        />
      </div>
      <div className="dashboard-title">
        <div>
          <h1>{data.query}</h1>
          <p>
            {t("PubMed contains")}{" "}
            <strong>{number(overview.total_publications)}</strong>{" "}
            {t("publications related to this topic.")}
          </p>
        </div>
        <div className="provenance">
          <span
            className={`status-badge ${data.data_mode === "live" ? "live" : ""}`}
          >
            <span />
            {t(dataLabel(data.data_mode))}
          </span>
          <span>{timestamp(data.retrieved_at, language)}</span>
          <Link to={`/sources/${data.id}`}>
            {t("View data sources")}
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
      <div className="scope-note">
        <Info size={15} />
        <span>
          {t(
            "Full-query publication counts · Landscape analysis based on {count} recent papers · Journal metrics from external sources",
            { count: number(data.sample_size) },
          )}
        </span>
      </div>
      {data.warnings.map((w, i) => (
        <div className="warning-message" key={i}>
          <Info size={16} />
          {t(w)}
        </div>
      ))}
      {!data.sample_size ? (
        <section className="panel empty-state">
          <BookOpen size={32} />
          <h2>{t("No publications found")}</h2>
          <p>
            {t(
              "Try a broader medical term or remove restrictive query filters.",
            )}
          </p>
          <button
            className="button secondary"
            onClick={() => onSearch("Alzheimer's disease", "demo", 500)}
          >
            {t("Open sample demo")}
          </button>
        </section>
      ) : (
        <>
          <section className="kpi-strip" aria-label={t("Overview statistics")}>
            {[
              {
                label: t("Total publications"),
                value: number(overview.total_publications),
                note: t("All PubMed matches"),
                icon: BookOpen,
              },
              {
                label: t("Last 5 complete years"),
                value: t(number(overview.last_five_years)),
                note: `${data.reference_year - 5}–${data.reference_year - 1} · ${t("Full query")}`,
                icon: CalendarDays,
              },
              {
                label: t("Countries / regions"),
                value: number(overview.countries),
                note: t("In the analyzed sample"),
                icon: Globe2,
              },
              {
                label: t("Journals"),
                value: number(overview.journals),
                note: t("In the analyzed sample"),
                icon: Layers,
              },
              {
                label: t("Leading topic"),
                value: overview.top_topic || t("N/A"),
                note: t("Most frequent sample topic"),
                icon: Sparkles,
              },
            ].map((k, i) => (
              <div
                className={`kpi ${i === 4 ? "topic-kpi" : ""}`}
                key={k.label}
              >
                <div className="kpi-label">
                  {k.label}
                  <k.icon size={16} />
                </div>
                <strong>{k.value}</strong>
                <span>{k.note}</span>
              </div>
            ))}
          </section>
          <nav className="section-nav" aria-label={t("Dashboard sections")}>
            <a href="#overview" className="selected">
              {t("Overview")}
            </a>
            <a href="#landscape">{t("Research landscape")}</a>
            <a href="#papers">{t("Top papers")}</a>
            <a href="#brief">{t("Research brief")}</a>
          </nav>
          <div id="overview" className="overview-grid">
            <section className="panel trend-panel">
              <div className="panel-heading">
                <div>
                  <h2>{t("Publications over time")}</h2>
                  <p>
                    {data.trend_scope === "full_query"
                      ? t("Full PubMed query")
                      : t("Recent sample only")}{" "}
                    · {t("Annual publication volume")}
                  </p>
                </div>
                <span className="chart-legend">
                  <i />
                  {t("Publications")}
                </span>
              </div>
              <TrendChart data={data} />
              <div className="chart-footnote">
                <span>
                  {t("{year} is a partial year", { year: data.reference_year })}
                </span>
                <span>{t("Source: NCBI ESearch")}</span>
              </div>
            </section>
            <section className="panel insights-panel">
              <div className="panel-heading">
                <h2>
                  <Sparkles size={17} />
                  {t("Research insights")}
                </h2>
                <span className="small-badge">{t("Computed")}</span>
              </div>
              <div className="growth-feature">
                <span>{t("Publication growth")}</span>
                <strong>
                  {insight.publication_growth == null
                    ? t("N/A")
                    : `${insight.publication_growth > 0 ? "+" : ""}${insight.publication_growth}%`}
                  <TrendingUp size={24} />
                </strong>
                <p>
                  {t("{start} to {end} · Complete years", {
                    start: insight.growth_start,
                    end: insight.growth_end,
                  })}
                </p>
              </div>
              <dl className="insight-list">
                <div>
                  <dt>{t("Most active country / region")}</dt>
                  <dd>{t(insight.top_country || "Unknown")}</dd>
                </div>
                <div>
                  <dt>{t("Most active journal")}</dt>
                  <dd>{insight.top_journal || t("N/A")}</dd>
                </div>
                <div>
                  <dt>{t("Emerging topic")}</dt>
                  <dd>
                    {insight.emerging_topic?.name ||
                      t("Insufficient historical sample")}
                  </dd>
                </div>
                <div>
                  <dt>
                    {t("Research diversity")}{" "}
                    <details className="metric-explainer">
                      <summary aria-label={t("Explain research diversity")}>
                        <Info size={12} />
                      </summary>
                      <span>
                        {t(
                          "Normalized Shannon entropy of topic frequencies, from 0 to 100. It measures topic spread, not research quality.",
                        )}
                      </span>
                    </details>
                  </dt>
                  <dd>
                    {insight.research_diversity != null
                      ? `${insight.research_diversity} / 100`
                      : t("N/A")}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
          <div id="landscape" className="section-heading">
            <div>
              <h2>{t("The research landscape")}</h2>
              <p>
                {t(
                  "What this sample studies, and where the work is happening.",
                )}
              </p>
            </div>
            <span className="small-badge">
              {t("{count} papers analyzed", { count: data.sample_size })}
            </span>
          </div>
          <div className="two-column">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>{t("Top research topics")}</h3>
                  <p>{t("Number of papers mentioning each topic")}</p>
                </div>
                <span className="small-badge">{t("Top 10")}</span>
              </div>
              <BarChart data={data.topics.slice(0, 10)} />
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>{t("Topic constellation")}</h3>
                  <p>{t("MeSH terms, author keywords & text phrases")}</p>
                </div>
                <Layers size={17} />
              </div>
              <WordCloud data={data.word_cloud} />
              <div className="chart-footnote">
                {t("Word size reflects frequency in the sample")}
              </div>
            </section>
          </div>
          <div className="two-column second-row">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>{t("Geographic distribution")}</h3>
                  <p>{t("Top countries / regions from author affiliations")}</p>
                </div>
                <Globe2 size={18} />
              </div>
              <BarChart data={data.countries} color="#0891b2" />
              <div className="chart-footnote">
                {t(
                  "{count} papers with unknown country · Collaborative papers may count in multiple regions",
                  { count: data.unknown_country_count },
                )}
              </div>
            </section>
            <section className="panel journal-panel">
              <div className="panel-heading">
                <div>
                  <h3>{t("Top journals")}</h3>
                  <p>{t("Publication volume in the analyzed sample")}</p>
                </div>
                <BookOpen size={18} />
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{t("Journal")}</th>
                      <th>{t("Papers")}</th>
                      <th>{t("Impact factor")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.journals.slice(0, 8).map((j) => (
                      <tr key={j.name}>
                        <td>{j.name}</td>
                        <td>{j.count}</td>
                        <td>
                          {j.metric_url ? (
                            <a
                              href={j.metric_url}
                              target="_blank"
                              rel="noreferrer"
                              title={`${j.metric_source}; ${t("metric year")} ${j.metric_year || t("unspecified")}`}
                            >
                              {j.impact_factor?.toFixed(1)}{" "}
                              <ArrowUpRight size={11} />
                            </a>
                          ) : (
                            <span className="muted">{t("N/A")}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="chart-footnote">
                {t(
                  "Local journal metric mapping \u00B7 N/A = no verified match",
                )}
              </div>
            </section>
          </div>
          <section className="themes-section">
            <div className="section-heading">
              <div>
                <h2>{t("Research directions")}</h2>
                <p>
                  {data.summary_mode === "pending"
                    ? t("Preparing research directions\u2026")
                    : data.summary_mode === "llm"
                    ? t("AI synthesis grounded in the supplied papers")
                    : t(
                        "Evidence clusters derived from sample topic frequencies",
                      )}
                </p>
              </div>
              <span className="small-badge">
                {data.summary_mode === "pending"
                  ? t("Generating AI research brief")
                  : data.summary_mode === "llm"
                  ? t("AI assisted")
                  : t("Statistical summary")}
              </span>
            </div>
            <div className="theme-grid">
              {data.research_themes.map((theme, i) => (
                <article className="theme" key={theme.title}>
                  <span className="theme-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3>{theme.title}</h3>
                  <p>{theme.text}</p>
                  <div className="references">
                    {theme.pmids.slice(0, 2).map((id) => (
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/${id}/`}
                        target="_blank"
                        rel="noreferrer"
                        key={id}
                      >
                        PMID {id}
                        <ArrowUpRight size={10} />
                      </a>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            {data.summary_mode === "pending" && (
              <p className="empty-state">
                {t("Preparing research directions\u2026")}
              </p>
            )}
          </section>
          <PapersTable data={data} />
          <section id="brief" className="panel brief-panel">
            <div className="panel-heading">
              <div>
                <h2>
                  <Sparkles size={20} />
                  {t("AI Research Brief")}{" "}
                  <span className="small-badge">中文</span>
                </h2>
                <p>
                  {data.summary_mode === "pending"
                    ? t("Generating AI research brief")
                    : data.summary_mode === "llm"
                    ? t(
                        "AI-generated synthesis \u00B7 Verify claims against linked papers",
                      )
                    : "基于真实统计的自动简报 · 未使用大语言模型"}
                </p>
              </div>
              <button
                className="button secondary"
                onClick={exportBrief}
                disabled={!data.research_brief.length}
              >
                <Download size={15} />
                {t("Export brief")}
              </button>
            </div>
            <div className="brief-grid" lang="zh-CN">
              {data.research_brief.map((s, i) => (
                <article key={s.title}>
                  <h3>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    {s.title}
                  </h3>
                  <p>{s.text}</p>
                  <div className="references">
                    {s.pmids.map((id) => (
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/${id}/`}
                        target="_blank"
                        rel="noreferrer"
                        key={id}
                      >
                        PMID {id}
                        <ArrowUpRight size={11} />
                      </a>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            <div className="brief-disclaimer">
              <Info size={15} />
              {data.summary_note || "正在整理文献证据。"}
            </div>
          </section>
        </>
      )}
      <section className="methodology-banner">
        <Database size={24} />
        <div>
          <h3>{t("Research you can trace back.")}</h3>
          <p>
            {t(
              "Review the query, retrieval details, analytical methods and limitations behind this report.",
            )}
          </p>
        </div>
        <Link className="button secondary" to={`/sources/${data.id}`}>
          {t("Data sources & methodology")}
          <ArrowUpRight size={15} />
        </Link>
      </section>
      <div className="analysis-complete">
        <CheckCircle2 size={14} />{" "}
        {data.summary_mode === "pending"
          ? t("Metadata analysis complete \u00B7 Preparing brief")
          : t("Analysis complete")}
        <span>PubMed / NCBI E-utilities</span>
      </div>
    </div>
  );
}
function SearchLabel() {
  return <Database size={16} />;
}
