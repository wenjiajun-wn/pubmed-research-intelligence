import { useLanguage } from "../i18n/LanguageContext";
import { Check, LoaderCircle, Database } from "lucide-react";
const stages = [
  ["searching", "Searching PubMed"],
  ["collecting", "Collecting publications"],
  ["analyzing", "Analyzing research trends"],
  ["extracting", "Extracting research topics"],
  ["ranking", "Ranking influential papers"],
  ["summarizing", "Generating AI research brief"],
];
export function AnalysisProgress({
  stage,
  progress,
}: {
  stage: string;
  progress: number;
}) {
  const { t } = useLanguage();
  const current = stages.findIndex((s) => s[0] === stage);
  return (
    <section className="progress-panel" aria-live="polite">
      <div className="progress-title">
        <Database size={23} />
        <div>
          <h2>{t("Connecting the evidence")}</h2>
          <p>
            {stage === "queued"
              ? t("Your analysis is queued.")
              : t(
                  "Collecting real publications and building your research landscape.",
                )}
          </p>
        </div>
        <strong>{progress}%</strong>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={t("Analysis progress")}
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span
          style={{
            transform: `scaleX(${progress / 100})`,
            width: "100%",
            transformOrigin: "left",
            transition: "transform .5s ease",
          }}
        />
      </div>
      <ol>
        {stages.map(([key, label], i) => (
          <li
            key={key}
            className={i < current ? "done" : i === current ? "active" : ""}
          >
            {i < current ? (
              <Check size={15} />
            ) : i === current ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <span className="stage-dot" />
            )}
            {t(label)}
          </li>
        ))}
      </ol>
      <p className="fine-print">
        {t(
          "Live analysis usually takes 30\u201360 seconds; network retries can take longer. The sample demo works without external APIs.",
        )}
      </p>
    </section>
  );
}
