import { useLanguage } from "../i18n/LanguageContext";
import { useState } from "react";
import { ArrowRight, Search, Play } from "lucide-react";
const suggestions = [
  "Alzheimer's Disease",
  "Cancer Immunotherapy",
  "Large Language Models",
  "CRISPR",
  "GLP-1",
];
export function SearchForm({
  onSearch,
  busy = false,
  initial = "",
  initialSize = 500,
  compact = false,
}: {
  onSearch: (query: string, mode: "live" | "demo", size: number) => void;
  busy?: boolean;
  initial?: string;
  initialSize?: number;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState(initial);
  const [size, setSize] = useState(initialSize);
  return (
    <div className={compact ? "search-wrap compact-search" : "search-wrap"}>
      <form
        className="search-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim().length >= 2) onSearch(query.trim(), "live", size);
        }}
      >
        <Search size={21} />
        <label
          className="sr-only"
          htmlFor={compact ? "topic-compact" : "topic"}
        >
          {t("Research topic")}
        </label>
        <input
          id={compact ? "topic-compact" : "topic"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Enter a research topic\u2026")}
          required
          minLength={2}
          maxLength={300}
          disabled={busy}
        />
        <label className="sr-only" htmlFor={compact ? "size-compact" : "size"}>
          {t("Sample size")}
        </label>
        <select
          id={compact ? "size-compact" : "size"}
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          disabled={busy}
        >
          <option value={300}>{t("300 papers")}</option>
          <option value={500}>{t("500 papers")}</option>
          <option value={1000}>{t("1,000 papers")}</option>
        </select>
        <button
          className="button primary"
          disabled={busy || query.trim().length < 2}
          type="submit"
        >
          {busy ? t("Analyzing\u2026") : t("Analyze")}
          <ArrowRight size={17} />
        </button>
      </form>
      {!compact && (
        <>
          <div className="suggestions">
            <span>{t("Try a topic")}</span>
            {suggestions.map((s) => (
              <button disabled={busy} key={s} onClick={() => setQuery(s)}>
                {t(s)}
              </button>
            ))}
          </div>
          <div className="demo-invite">
            <span>{t("Just exploring?")}</span>
            <button
              disabled={busy}
              onClick={() => {
                setQuery("Alzheimer's disease");
                onSearch("Alzheimer's disease", "demo", 500);
              }}
            >
              <Play size={14} />
              {t("Open sample demo")}
              <ArrowRight size={14} />
            </button>
            <span className="demo-caption">
              {t("Real publications. Ready offline.")}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
