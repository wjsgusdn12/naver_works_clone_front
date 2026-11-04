"use client";

import { CHART_COLORS } from "@/lib/chart-colors";
import { useLayoutEffect, useRef, useState } from "react";

// 선 그래프 한 줄(계열). dashed면 점선으로 그려 색뿐 아니라 모양으로도 구분.
// values의 null은 "값 없음"(예: 요청이 없던 구간의 응답 시간)이라 선을 끊음.
// connectGaps면 끊지 않고 값 없는 칸을 건너뛰어 앞뒤 점을 바로 이음(응답 시간처럼 흐름을 볼 때).
export type LineSeries = {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
  connectGaps?: boolean;
  values: (number | null)[];
};

const PADDING = { top: 12, right: 16, bottom: 26, left: 48 };
const HEIGHT = 200;

// 눈금을 보기 좋은 숫자(1·2·5 단위)로 올림. 예: 37 → 40, 230 → 250
const niceCeil = (value: number) => {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * power >= value) ?? 10;
  return step * power;
};

// 부모 폭에 맞춰 그리기 위해 실제 폭을 잼(창 크기를 바꾸면 다시 잼).
// 화면에 그리기 전에 먼저 재서(useLayoutEffect) 첫 화면부터 그래프가 보임(빈 자리 → 그래프로 깜빡이지 않음).
function useElementWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(Math.round(element.getBoundingClientRect().width));
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

// 선으로 이은 추이 그래프. 가로 눈금선은 옅은 실선, 마우스를 올리면 세로줄·그 시점의 점·값들을 보여 줌.
export function LineChart({
  labels,
  tooltipTitles,
  series,
  formatValue,
  labelEvery,
  ariaLabel,
  showMarkers = false,
  totalLabel,
}: {
  // 아래쪽 시간 글자(점마다 하나)
  labels: string[];
  // 마우스를 올렸을 때 제목(예: "13시~14시")
  tooltipTitles: string[];
  series: LineSeries[];
  formatValue: (value: number) => string;
  // 아래쪽 글자를 몇 칸마다 보여 줄지
  labelEvery: number;
  ariaLabel: string;
  // 기본(false): 점은 숨기고 마우스가 올라간 시점만 점을 보여 줌. true면 모든 시점에 점.
  showMarkers?: boolean;
  // 있으면 툴팁 맨 아래에 계열 값을 더한 합계 줄(예: 영역별 요청 수의 "전체 요청")
  totalLabel?: string;
}) {
  const { ref, width } = useElementWidth();
  const [hovered, setHovered] = useState<number | null>(null);
  const count = labels.length;
  const values = series.flatMap((item) =>
    item.values.filter((value): value is number => value !== null),
  );
  const max = niceCeil(Math.max(0, ...values));
  const plotWidth = Math.max(0, width - PADDING.left - PADDING.right);
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const x = (index: number) =>
    PADDING.left + (count <= 1 ? plotWidth / 2 : (index / (count - 1)) * plotWidth);
  const y = (value: number) => PADDING.top + plotHeight - (value / max) * plotHeight;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ratio * max);

  // null에서 끊어 여러 조각의 선으로 만듦(connectGaps면 null을 건너뛰고 이음).
  const pathOf = (items: (number | null)[], connectGaps = false) => {
    let path = "";
    let drawing = false;
    items.forEach((value, index) => {
      if (value === null) {
        if (!connectGaps) drawing = false;
        return;
      }
      path += `${drawing ? "L" : "M"}${x(index).toFixed(1)},${y(value).toFixed(1)}`;
      drawing = true;
    });
    return path;
  };

  // 앞뒤가 비어 선으로 이어지지 않는 혼자인 값. 점을 숨기는 그래프에서도 이런 점은 보여 줘야 값이 안 사라짐.
  // (이어 그리는 계열은 값이 하나뿐일 때만 혼자)
  const isolated = (series: LineSeries, index: number) =>
    series.connectGaps
      ? series.values.filter((value) => value !== null).length === 1
      : (series.values[index - 1] ?? null) === null && (series.values[index + 1] ?? null) === null;

  // 마우스 x 위치에서 가장 가까운 칸 번호. 점이 수백 개여도 칸마다 영역을 만들지 않고 계산으로 찾음.
  const indexAt = (mouseX: number) => {
    if (count <= 1) return 0;
    const ratio = (mouseX - PADDING.left) / plotWidth;
    return Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1))));
  };
  return (
    // 높이를 미리 잡아 둬서 폭을 재기 전에도 그래프 자리가 접히지 않음
    <div
      ref={ref}
      className="relative w-full"
      style={{ height: HEIGHT }}
      role="img"
      aria-label={ariaLabel}
    >
      {width > 0 && (
        <svg width={width} height={HEIGHT} className="block overflow-visible">
          {/* 가로 눈금선(옅은 실선, 바닥선만 조금 진하게)과 왼쪽 값 */}
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PADDING.left}
                x2={width - PADDING.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke={tick === 0 ? CHART_COLORS.crosshair : CHART_COLORS.grid}
                strokeOpacity={tick === 0 ? 0.6 : 0.7}
              />
              <text
                x={PADDING.left - 8}
                y={y(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-slate-400 text-[10px] tabular-nums"
              >
                {formatValue(tick)}
              </text>
            </g>
          ))}
          {/* 아래쪽 시간 */}
          {labels.map((label, index) =>
            index % labelEvery === 0 && label ? (
              <text
                key={`${label}-${index}`}
                x={x(index)}
                y={HEIGHT - 6}
                textAnchor={index === 0 ? "start" : index === count - 1 ? "end" : "middle"}
                className="fill-slate-400 text-[10px] tabular-nums"
              >
                {label}
              </text>
            ) : null,
          )}
          {/* 마우스가 올라간 시점의 세로줄 */}
          {hovered !== null && (
            <line
              x1={x(hovered)}
              x2={x(hovered)}
              y1={PADDING.top}
              y2={PADDING.top + plotHeight}
              stroke={CHART_COLORS.crosshair}
              strokeOpacity={0.6}
            />
          )}
          {series.map((item) => (
            <g key={item.key}>
              <path
                d={pathOf(item.values, item.connectGaps)}
                fill="none"
                stroke={item.color}
                strokeWidth={1.75}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={item.dashed ? "5 4" : undefined}
              />
              {/* 점은 마우스가 올라간 시점에만(앞뒤가 비어 선으로 안 보이는 혼자인 값은 작게 늘 표시) */}
              {item.values.map((value, index) =>
                value === null ||
                (!showMarkers && hovered !== index && !isolated(item, index)) ? null : (
                  <circle
                    key={index}
                    cx={x(index)}
                    cy={y(value)}
                    r={hovered === index ? 4 : 2.5}
                    fill={item.color}
                    stroke={CHART_COLORS.surface}
                    strokeWidth={1.5}
                  />
                ),
              )}
            </g>
          ))}
          {/* 그래프 영역 전체를 마우스 영역으로 써서 가장 가까운 시점을 가리킴. */}
          <rect
            x={PADDING.left - 8}
            y={PADDING.top}
            width={plotWidth + 16}
            height={plotHeight}
            fill="transparent"
            onMouseMove={(event) =>
              setHovered(
                indexAt(
                  event.clientX - event.currentTarget.ownerSVGElement!.getBoundingClientRect().left,
                ),
              )
            }
            onMouseLeave={() => setHovered(null)}
          />
        </svg>
      )}
      {hovered !== null && width > 0 && (
        <div
          className="pointer-events-none absolute z-10 min-w-36 rounded-md border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-sm backdrop-blur-sm"
          style={{
            top: PADDING.top,
            left: x(hovered),
            transform: `translateX(${x(hovered) > width * 0.6 ? "calc(-100% - 12px)" : "12px"})`,
          }}
        >
          <p className="mb-1 font-semibold text-slate-800">{tooltipTitles[hovered]}</p>
          {series.map((item) => (
            <p key={item.key} className="flex items-center gap-2 text-slate-600">
              <LegendSwatch color={item.color} dashed={item.dashed} />
              <span className="flex-1">{item.label}</span>
              <span className="font-semibold tabular-nums text-slate-900">
                {item.values[hovered] === null ? "기록 없음" : formatValue(item.values[hovered]!)}
              </span>
            </p>
          ))}
          {totalLabel &&
            (() => {
              const present = series
                .map((item) => item.values[hovered])
                .filter((value): value is number => value !== null);
              return (
                <p className="mt-1 flex items-center gap-2 border-t border-slate-100 pt-1 text-slate-600">
                  <span className="w-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{totalLabel}</span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    {present.length === 0
                      ? "기록 없음"
                      : formatValue(present.reduce((sum, value) => sum + value, 0))}
                  </span>
                </p>
              );
            })()}
        </div>
      )}
    </div>
  );
}

// 범례·툴팁에 쓰는 작은 선 견본(점선 계열은 점선으로). 점은 그리지 않음.
export function LegendSwatch({ color, dashed }: { color: string; dashed?: boolean }) {
  return (
    <svg width="16" height="8" aria-hidden="true" className="shrink-0">
      <line
        x1="1"
        x2="15"
        y1="4"
        y2="4"
        stroke={color}
        strokeWidth="1.75"
        strokeDasharray={dashed ? "4 3" : undefined}
        strokeLinecap="round"
      />
    </svg>
  );
}

// 목록 옆 작은 추이선. 가는 실선 하나만(점 없음).
export function Sparkline({
  values,
  color,
  label,
}: {
  values: (number | null)[];
  color: string;
  label: string;
}) {
  const width = 96;
  const height = 28;
  const numbers = values.filter((value): value is number => value !== null);
  const max = Math.max(1, ...numbers);
  const step = values.length > 1 ? (width - 6) / (values.length - 1) : 0;
  const point = (value: number, index: number) => ({
    x: 3 + index * step,
    y: height - 3 - (value / max) * (height - 6),
  });
  // 값 없는 칸은 건너뛰고 앞뒤 점을 바로 이어 선이 끊기지 않게 함.
  let path = "";
  let drawing = false;
  values.forEach((value, index) => {
    if (value === null) return;
    const { x, y } = point(value, index);
    path += `${drawing ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    drawing = true;
  });
  return (
    <svg width={width} height={height} role="img" aria-label={label} className="shrink-0">
      <title>{label}</title>
      <line x1="0" x2={width} y1={height - 3} y2={height - 3} stroke={CHART_COLORS.grid} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.25}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
