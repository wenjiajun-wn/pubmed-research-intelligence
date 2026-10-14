import { useLanguage } from "../i18n/LanguageContext";
import { Check, LoaderCircle, Database, Minus } from "lucide-react";
import type { Job } from "../types";
const stages = [
  ["searching", "Searching PubMed", "PubMed search"],
  ["collecting", "Collecting publications", "Publication collection"],
  ["analyzing", "Analyzing research trends", "Research trend analysis"],
  ["extracting", "Extracting research topics", "Research topic extraction"],
  ["ranking", "Ranking influential papers", "Paper ranking"],
  ["summarizing", "Generating research brief", "Research brief generation"],
];
export function AnalysisProgress({
  stage,
  progress,
  steps,
  dataMode,
  syncing = false,
  compact = false,
}: {
  stage: string;
  progress: number;
  steps?: Job["steps"];
  dataMode?: Job["data_mode"];
  syncing?: boolean;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const current = stages.findIndex((s) => s[0] === stage);
  const complete = stage === "complete";
  const description = syncing ? "Synchronizing analysis status"
    : stage === "queued" ? "Your analysis is queued."
    : stage === "checking_cache" ? "Checking saved publications"
    : complete ? "Analysis complete"
    : stages[current]?.[1] || "Collecting real publications and building your research landscape.";
  const stateFor = (key: string, i: number) => steps?.[key] ?? (
    (key === "searching" || key === "collecting") && dataMode && dataMode !== "live" ? "skipped"
    : complete || i < current ? "completed" : i === current ? "active" : "pending"
  );
  return (
    <section className={`progress-panel${compact ? " compact-progress" : ""}`} aria-label={t("Analysis progress")}>
      <div className="progress-title">
        <Database size={23} />
        <div>
          <h2>{t(complete ? "Analysis complete" : "Connecting the evidence")}</h2>
          <p role="status">
            {!complete && current < 0 && <LoaderCircle className="spin" size={14} />}
            {t(description)}
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
            transition: complete ? "none" : "transform .5s ease",
          }}
        />
      </div>
      <ol>
        {stages.map(([key, label, name], i) => {
          const state = stateFor(key, i);
          return (
          <li
            key={key}
            data-step={key}
            data-state={state}
            aria-current={state === "active" ? "step" : undefined}
            className={state === "completed" ? "done" : state}
          >
            {state === "completed" ? (
              <Check size={15} />
            ) : state === "skipped" ? (
              <Minus size={15} />
            ) : state === "active" ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <span className="stage-dot" />
            )}
            <span>{t(state === "active" ? label : name)}
              {state === "completed" && <small>{t("Completed")}</small>}
              {state === "skipped" && <small>{t("Cached data · skipped")}</small>}
            </span>
          </li>
          );
        })}
      </ol>
      {!complete && <p className="fine-print">
        {t(
          "Live analysis usually takes 30\u201360 seconds; network retries can take longer. The sample demo works without external APIs.",
        )}
      </p>}
    </section>
  );
}
