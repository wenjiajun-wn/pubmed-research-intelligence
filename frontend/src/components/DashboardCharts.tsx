import { useEffect, useMemo, useRef } from "react";
import renderWordCloud from "wordcloud";
import type { EChartsOption } from "echarts";
import type { Analysis, Frequency } from "../types";
import { Chart } from "./Chart";
import { useLanguage } from "../i18n/LanguageContext";

export function TrendChart({ data }: { data: Analysis }) {
  const { t, language } = useLanguage();
  const option = useMemo<EChartsOption>(
    () => ({
      grid: { left: 50, right: 26, top: 20, bottom: 35 },
      tooltip: {
        trigger: "axis",
        renderMode: "richText",
        valueFormatter: (value) =>
          Number(value).toLocaleString(language === "zh" ? "zh-CN" : "en-US"),
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: data.annual_trend.map((x) => String(x.year)),
        axisLine: { lineStyle: { color: "#dbe3ed" } },
        axisTick: { show: false },
        axisLabel: { color: "#64748b", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        splitNumber: 4,
        axisLabel: {
          color: "#64748b",
          formatter: (v: number) =>
            language === "zh"
              ? v >= 10000
                ? `${v / 10000}万`
                : String(v)
              : v >= 1000
                ? `${v / 1000}k`
                : String(v),
          fontSize: 11,
        },
        splitLine: { lineStyle: { color: "#edf1f5", type: "dashed" } },
      },
      series: [
        {
          type: "line",
          name: t("Publications"),
          data: data.annual_trend.map((x) => x.count),
          smooth: 0.25,
          symbol: "circle",
          symbolSize: 6,
          showSymbol: false,
          itemStyle: { color: "#2563eb" },
          lineStyle: { width: 3 },
          areaStyle: { color: "#eaf1ff", opacity: 0.7 },
          markArea: {
            silent: true,
            itemStyle: { color: "#f1f5f9", opacity: 0.75 },
            label: { show: false },
            data: [
              [
                { xAxis: String(data.reference_year - 1) },
                { xAxis: String(data.reference_year) },
              ],
            ],
          },
        },
      ],
    }),
    [data, t, language],
  );
  return (
    <Chart
      option={option}
      label={t("Publication counts by year: {counts}", {
        counts: data.annual_trend
          .map((x) => `${x.year}: ${x.count}`)
          .join(", "),
      })}
    />
  );
}

export function BarChart({
  data,
  color = "#2563eb",
  height = 310,
}: {
  data: Frequency[];
  color?: string;
  height?: number;
}) {
  const { t } = useLanguage();
  const option = useMemo<EChartsOption>(
    () => ({
      grid: { left: 8, right: 42, top: 8, bottom: 10, containLabel: true },
      tooltip: {
        trigger: "axis",
        renderMode: "richText",
        axisPointer: { type: "shadow" },
      },
      xAxis: { type: "value", show: false },
      yAxis: {
        type: "category",
        inverse: true,
        data: data.map((x) => t(x.name)),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: {
          color: "#475569",
          width: 145,
          overflow: "truncate",
          fontSize: 12,
        },
      },
      series: [
        {
          type: "bar",
          name: t("Sample papers"),
          data: data.map((x) => x.count),
          barMaxWidth: 13,
          itemStyle: { color, borderRadius: [0, 3, 3, 0] },
          label: {
            show: true,
            position: "right",
            color: "#475569",
            fontSize: 12,
          },
        },
      ],
    }),
    [data, color, t],
  );
  return (
    <Chart
      option={option}
      height={height}
      label={data
        .map((x) => `${t(x.name)}: ${t("{count} papers", { count: x.count })}`)
        .join("; ")}
    />
  );
}

export function WordCloud({ data }: { data: Frequency[] }) {
  const { t } = useLanguage();
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = canvas.current,
      container = wrapper.current;
    if (!element || !container || !data.length) return;
    let active = true;
    const draw = () => {
      if (!active) return;
      element.width = Math.max(container.clientWidth, 250);
      element.height = 310;
      renderWordCloud(element, {
        list: data.map((x) => [
          x.name,
          12 + 23 * Math.sqrt(x.count / data[0].count),
        ]),
        fontFamily: "Inter, sans-serif",
        fontWeight: "500",
        backgroundColor: "#ffffff",
        gridSize: 7,
        rotateRatio: 0,
        shuffle: false,
        shrinkToFit: true,
        drawOutOfBound: false,
        weightFactor: (v: number) => v,
        color: (word: string) =>
          ["#2563eb", "#087f9b", "#334155", "#61728b", "#1847a3"][
            Math.max(
              0,
              data.findIndex((x) => x.name === word),
            ) % 5
          ],
      });
    };
    document.fonts.ready.then(draw);
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [data]);
  return (
    <div ref={wrapper} className="word-cloud">
      <canvas
        ref={canvas}
        role="img"
        aria-label={t("Topic word cloud. {topics}", {
          topics: data
            .slice(0, 12)
            .map((x) => `${x.name}: ${x.count}`)
            .join("; "),
        })}
      />
    </div>
  );
}
