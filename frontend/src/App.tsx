import { useLanguage } from "./i18n/LanguageContext";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { Layout } from "./components/Layout";
import { AnalysisProgress } from "./components/AnalysisProgress";
import { HomePage } from "./pages/HomePage";
import { DashboardPage } from "./pages/DashboardPage";
import { DataSourcesPage } from "./pages/DataSourcesPage";
import { AboutPage } from "./pages/AboutPage";
import { api } from "./services/api";
import type { Job } from "./types";
function AnalysisRoute({
  onSearch,
  onId,
  busy,
}: {
  onSearch: (q: string, mode: "live" | "demo", size: number) => void;
  onId: (id: string) => void;
  busy: boolean;
}) {
  const { t } = useLanguage();
  const { id } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true,
      timer: ReturnType<typeof setTimeout>,
      failures = 0;
    setJob(null);
    setError("");
    if (id) onId(id);
    async function poll() {
      try {
        const next = await api.job(id!);
        if (!active) return;
        failures = 0;
        setJob(next);
        if (next.status === "running") timer = setTimeout(poll, 1000);
        if (next.status === "failed")
          setError(next.error || "Analysis failed.");
      } catch (e) {
        if (!active) return;
        if (++failures < 3) timer = setTimeout(poll, 1800);
        else
          setError(e instanceof Error ? e.message : "Could not load analysis.");
      }
    }
    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [id, retry, onId]);
  return (
    <>
      {error && (
        <div className="page-width route-error" role="alert">
          <h2>{t("We couldn\u2019t finish this analysis")}</h2>
          <p>{t(error)}</p>
          <div>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => {
                if (job?.status === "failed" && job.request) {
                  onSearch(job.request.query, job.request.mode, job.request.sample_size);
                } else setRetry((r) => r + 1);
              }}
            >
              {t(job?.status === "failed" && job.request ? "Retry analysis" : "Check again")}
            </button>
            <button
              className="button primary"
              onClick={() => onSearch("Alzheimer's disease", "demo", 500)}
            >
              {t("Open sample demo")}
            </button>
          </div>
        </div>
      )}
      {!error && (!job || job.status === "running") && !job?.result && (
        <div className="page-width">
          <AnalysisProgress
            stage={job?.stage || "queued"}
            progress={job?.progress || 0}
          />
        </div>
      )}
      {job?.result && (
        <DashboardPage data={job.result} onSearch={onSearch} busy={busy} />
      )}
    </>
  );
}
export default function App() {
  const { t } = useLanguage();
  const navigate = useNavigate(),
    location = useLocation();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [lastId, setLastId] = useState<string>();
  const submitting = useRef(false);
  const remember = useCallback((id: string) => setLastId(id), []);
  useEffect(() => {
    if (!location.hash) window.scrollTo(0, 0);
    else document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [location.pathname, location.hash]);
  const search = async (query: string, mode: "live" | "demo", size: number) => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const job = await api.start(query, mode, size);
      setLastId(job.id);
      navigate(`/analysis/${job.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start analysis.");
      navigate("/");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  return (
    <Layout analysisId={lastId}>
      <Routes>
        <Route
          path="/"
          element={<HomePage onSearch={search} busy={busy} error={error} />}
        />
        <Route
          path="/analysis/:id"
          element={
            <AnalysisRoute
              key={location.pathname}
              onSearch={search}
              onId={remember}
              busy={busy}
            />
          }
        />
        <Route path="/sources" element={<DataSourcesPage />} />
        <Route path="/sources/:id" element={<DataSourcesPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route
          path="*"
          element={
            <div className="page-width route-error">
              <h1>{t("Page not found")}</h1>
              <button className="button primary" onClick={() => navigate("/")}>
                {t("Return to explorer")}
              </button>
            </div>
          }
        />
      </Routes>
    </Layout>
  );
}
