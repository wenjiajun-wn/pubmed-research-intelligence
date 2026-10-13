import type { Job, Sources } from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`/api${path}`, {
      ...init,
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        typeof body?.detail === "string"
          ? body.detail
          : "The request could not be completed. Please check your input and retry.";
      throw new Error(message);
    }
    return body as T;
  } catch (error) {
    if (
      error instanceof TypeError ||
      (error instanceof DOMException && error.name === "AbortError")
    ) {
      throw new Error(
        "Cannot reach the analysis server. Make sure the backend is running, then retry.",
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  start: (query: string, mode: "live" | "demo", sample_size: number) =>
    request<{ id: string }>("/analyses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, mode, sample_size }),
    }),
  job: (id: string) => request<Job>(`/analyses/${encodeURIComponent(id)}`),
  sources: (id: string) =>
    request<Sources>(`/analyses/${encodeURIComponent(id)}/sources`),
};
export const number = (value: number | null | undefined) =>
  value == null ? "N/A" : value.toLocaleString("en-US");
export const timestamp = (value: string, language: "en" | "zh" = "en") =>
  new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai",
  }).format(new Date(value)) + (language === "zh" ? "（北京时间）" : " CST");
export const dataLabel = (mode: string) =>
  mode === "live"
    ? "Live Data"
    : mode === "cached_demo"
      ? "Cached Demo Data"
      : "Cached Data";
