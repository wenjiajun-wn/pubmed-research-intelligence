import { useLanguage } from "../i18n/LanguageContext";
import { useMemo, useState } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import type { Analysis } from "../types";
export function PapersTable({ data }: { data: Analysis }) {
  const { t } = useLanguage();
  const [sort, setSort] = useState("impact_factor");
  const [expanded, setExpanded] = useState(false);
  const papers = useMemo(() => {
    const list = [...data.papers];
    if (sort === "year")
      list.sort(
        (a, b) => (b.publication_year || 0) - (a.publication_year || 0),
      );
    if (sort === "journal")
      list.sort((a, b) => a.journal.localeCompare(b.journal));
    return list.slice(0, expanded ? 100 : 10);
  }, [data.papers, sort, expanded]);
  return (
    <section id="papers" className="panel paper-panel">
      <div className="panel-heading">
        <div>
          <h2>
            {t("Top papers")}{" "}
            <span className="count-pill">
              {data.paper_year_start}–{data.reference_year}
            </span>
          </h2>
          <p>
            {t(
              "Ranked within the sample by journal impact factor. Missing metrics sort last.",
            )}
          </p>
        </div>
        <label className="sort-control">
          {t("Sort by")}{" "}
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="impact_factor">{t("Impact factor")}</option>
            <option value="year">{t("Publication year")}</option>
            <option value="journal">{t("Journal")}</option>
          </select>
        </label>
      </div>
      <div className="table-scroll">
        <table className="papers-table">
          <thead>
            <tr>
              <th className="rank-cell">#</th>
              <th>{t("Publication")}</th>
              <th>{t("Journal / year")}</th>
              <th>{t("Impact factor")}</th>
              <th>
                <span className="sr-only">{t("Source")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {papers.map((paper, i) => (
              <tr key={paper.pmid}>
                <td className="rank-cell">{String(i + 1).padStart(2, "0")}</td>
                <td>
                  <a
                    className="paper-title"
                    href={`https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}/`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {paper.title}
                  </a>
                  <p className="authors">
                    {paper.authors.slice(0, 3).join(", ") ||
                      t("Author information unavailable")}
                    {paper.authors.length > 3 ? t(" et al.") : ""}
                  </p>
                  <div className="paper-identifiers">
                    <span>PMID {paper.pmid}</span>
                    {paper.publication_type?.map((type) => (
                      <span key={type}>{t(type)}</span>
                    ))}
                    {paper.doi && (
                      <a
                        href={`https://doi.org/${encodeURIComponent(paper.doi)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        DOI <ArrowUpRight size={11} />
                      </a>
                    )}
                  </div>
                  <details className="abstract-details">
                    <summary>{t("Read abstract")}</summary>
                    <p>
                      {paper.abstract ||
                        t("No abstract is available for this record.")}
                    </p>
                  </details>
                </td>
                <td className="journal-cell">
                  {paper.journal}
                  <span>{paper.publication_year ?? t("Unknown year")}</span>
                </td>
                <td>
                  <span
                    className={
                      paper.impact_factor != null ? "metric-value" : "muted"
                    }
                  >
                    {paper.impact_factor?.toFixed(1) ?? t("N/A")}
                  </span>
                  {paper.metric_url && (
                    <a
                      className="metric-source"
                      href={paper.metric_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {paper.metric_year || t("Year unspecified")}{" "}
                      <ArrowUpRight size={10} />
                    </a>
                  )}
                </td>
                <td>
                  <a
                    className="icon-link"
                    title={t("View on PubMed")}
                    aria-label={t("View paper {index} on PubMed", {
                      index: i + 1,
                    })}
                    href={`https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}/`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ArrowUpRight size={17} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!papers.length && (
        <p className="empty-state">
          {t("No papers in the selected date range.")}
        </p>
      )}
      <div className="table-footer">
        <span>
          {t(
            "Showing {shown} of {total} ranked papers · Metrics available for {matched}/{eligible} eligible papers",
            {
              shown: papers.length,
              total: data.papers.length,
              matched: data.metric_coverage,
              eligible: data.eligible_paper_count,
            },
          )}
        </span>
        {data.papers.length > 10 && (
          <button
            className="text-button"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded
              ? t("Show top 10")
              : t("View top {count}", { count: data.papers.length })}
            <ChevronDown
              size={15}
              style={{ transform: expanded ? "rotate(180deg)" : undefined }}
            />
          </button>
        )}
      </div>
    </section>
  );
}
