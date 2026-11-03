"use client";

import { CHART_COLORS } from "@/lib/chart-colors";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useId, type ReactNode } from "react";

// 매일 증시 보고 게시글의 꾸밈 블록. 서버(BoardContent·MarketBlocks)가 정해 둔 속성만 남겨 보내고,
// 여기서는 그 값을 글자·숫자로만 그림(HTML 문자열을 넣지 않음). 오름 빨강·내림 파랑(한국 증시 표기).
type Attrs = Record<string, unknown>;

const str = (value: unknown) => (typeof value === "string" ? value : "");
const num = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const list = (value: unknown) =>
  (Array.isArray(value) ? value : []).filter(
    (item): item is Attrs => typeof item === "object" && item !== null,
  );

type Tone = "up" | "down" | "flat";
const toneOf = (rate: number | null): Tone =>
  rate === null || rate === 0 ? "flat" : rate > 0 ? "up" : "down";
const rateText = (rate: number) => `${rate > 0 ? "+" : ""}${rate.toFixed(2)}%`;

const TEXT: Record<Tone, string> = {
  up: "text-red-600",
  down: "text-blue-600",
  flat: "text-slate-500",
};
const PILL: Record<Tone, string> = {
  up: "bg-red-50 text-red-600 ring-red-100",
  down: "bg-blue-50 text-blue-600 ring-blue-100",
  flat: "bg-slate-100 text-slate-600 ring-slate-200",
};

function RatePill({ rate, className = "" }: { rate: number | null; className?: string }) {
  if (rate === null) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums ring-1 ${PILL[toneOf(rate)]} ${className}`}
    >
      {rateText(rate)}
    </span>
  );
}

// ───────────── 맨 위 히어로 ─────────────

export function MarketHero({ attrs }: { attrs: Attrs }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-6 py-7 text-white shadow-lg">
      {/* 배경 장식: 옅은 눈금선과 오르내리는 선 */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-30"
        viewBox="0 0 400 120"
        preserveAspectRatio="none"
      >
        {[20, 50, 80, 110].map((y) => (
          <line key={y} x1="0" x2="400" y1={y} y2={y} stroke="#334155" strokeWidth="0.5" />
        ))}
        <polyline
          points="0,95 40,80 80,88 120,60 160,70 200,45 240,52 280,30 320,38 360,18 400,24"
          fill="none"
          stroke="#60a5fa"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points="0,105 50,98 100,102 150,85 200,90 250,72 300,80 350,62 400,66"
          fill="none"
          stroke="#f87171"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="relative">
        <p className="text-[11px] font-semibold tracking-[0.3em] text-blue-300 uppercase">
          {str(attrs.title) || "Daily Market Report"}
        </p>
        <p className="mt-2 text-2xl font-extrabold tracking-tight">{str(attrs.date)}</p>
        <p className="mt-1 text-sm text-slate-300">간밤 뉴욕과 여의도의 흐름을 한눈에 📊</p>
      </div>
    </div>
  );
}

// ───────────── 시장 배너 ─────────────

const MOOD_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;

export function MarketBanner({ attrs }: { attrs: Attrs }) {
  const market = str(attrs.market) === "us" ? "US" : "KR";
  const moodValue = str(attrs.mood);
  const mood: Tone | null =
    moodValue === "up" || moodValue === "down" || moodValue === "flat" ? moodValue : null;
  const Icon = mood ? MOOD_ICON[mood] : null;
  return (
    <div className="mt-6 flex items-center gap-3 border-b-2 border-slate-900 pb-3">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-black tracking-wider text-white shadow-sm ${market === "US" ? "bg-gradient-to-br from-blue-600 to-indigo-700" : "bg-gradient-to-br from-rose-500 to-red-700"}`}
      >
        {market}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-extrabold text-slate-950">{str(attrs.title)}</h3>
        <p className="text-xs text-slate-500">{str(attrs.date)}</p>
      </div>
      {mood && Icon && str(attrs.moodLabel) && (
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ring-1 ${PILL[mood]}`}
        >
          <Icon size={15} aria-hidden="true" />
          {str(attrs.moodLabel)}
        </span>
      )}
    </div>
  );
}

// ───────────── 콜아웃(요약·안내) ─────────────

const CALLOUT: Record<string, string> = {
  up: "border-red-400 bg-red-50/70 text-slate-800",
  down: "border-blue-400 bg-blue-50/70 text-slate-800",
  flat: "border-slate-400 bg-slate-50 text-slate-800",
  info: "border-slate-400 bg-slate-50 text-slate-800",
  muted: "border-slate-200 bg-slate-50 text-xs leading-6 text-slate-500",
};

export function Callout({ attrs, children }: { attrs?: Attrs; children: ReactNode }) {
  const tone = str(attrs?.tone);
  return (
    <div
      className={`rounded-xl border-l-4 px-4 py-3 [&>p]:min-h-0 ${CALLOUT[tone] ?? CALLOUT.info}`}
    >
      {children}
    </div>
  );
}

// ───────────── 지수 카드 + 추이 그래프 ─────────────

function Sparkline({ values, tone }: { values: number[]; tone: Tone }) {
  const gradientId = useId();
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => [
    (index / (values.length - 1)) * 100,
    36 - ((value - min) / span) * 32,
  ]);
  const line = points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const color = CHART_COLORS.market[tone];
  const [lastX, lastY] = points[points.length - 1];
  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className="mt-3 h-12 w-full overflow-visible"
      role="img"
      aria-label={`최근 ${values.length}거래일 추이`}
    >
      <title>{`최근 ${values.length}거래일 추이`}</title>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,40 ${line} 100,40`} fill={`url(#${gradientId})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={lastX}
        cy={lastY}
        r="2.4"
        fill={color}
        stroke={CHART_COLORS.surface}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function MarketStats({ attrs }: { attrs: Attrs }) {
  const items = list(attrs.items);
  if (items.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => {
        const rate = num(item.rate);
        const tone = toneOf(rate);
        const spark = (Array.isArray(item.spark) ? item.spark : []).filter(
          (value): value is number => typeof value === "number" && Number.isFinite(value),
        );
        return (
          <div
            key={index}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">{str(item.label)}</p>
                <p className="truncate text-[11px] text-slate-400">{str(item.sub)}</p>
              </div>
              <RatePill rate={rate} />
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 tabular-nums">
              {str(item.value)}
            </p>
            <p className={`text-sm font-semibold tabular-nums ${TEXT[tone]}`}>
              {str(item.change)}
            </p>
            <Sparkline values={spark} tone={tone} />
          </div>
        );
      })}
    </div>
  );
}

// ───────────── 종목 등락 막대 ─────────────

export function MarketBreadth({ attrs }: { attrs: Attrs }) {
  const up = num(attrs.up) ?? 0;
  const flat = num(attrs.flat) ?? 0;
  const down = num(attrs.down) ?? 0;
  const total = up + flat + down;
  if (total === 0) return null;
  const parts = [
    { key: "up", label: "오름", value: up, color: CHART_COLORS.market.up, icon: "▲" },
    { key: "flat", label: "보합", value: flat, color: CHART_COLORS.market.flat, icon: "–" },
    { key: "down", label: "내림", value: down, color: CHART_COLORS.market.down, icon: "▼" },
  ];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-800">{str(attrs.label) || "종목 등락"}</p>
        <p className="text-xs text-slate-400 tabular-nums">총 {total.toLocaleString()}개</p>
      </div>
      {/* 칸 사이 2px 틈 */}
      <div className="mt-3 flex h-3.5 gap-0.5 overflow-hidden rounded-full">
        {parts
          .filter((part) => part.value > 0)
          .map((part) => (
            <span
              key={part.key}
              title={`${part.label} ${part.value.toLocaleString()}개`}
              style={{ width: `${(part.value / total) * 100}%`, backgroundColor: part.color }}
            />
          ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 tabular-nums">
        {parts.map((part) => (
          <span key={part.key} className="flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: part.color }}
              aria-hidden="true"
            />
            {part.label} <b className="text-slate-900">{part.value.toLocaleString()}</b>
            <span className="text-slate-400">({Math.round((part.value / total) * 100)}%)</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ───────────── 히트맵 타일 ─────────────

// 등락률 크기 → 옅음~진함 4단계. 진한 두 단계는 흰 글자.
function heat(rate: number | null) {
  const tone = toneOf(rate);
  if (tone === "flat" || rate === null)
    return { background: CHART_COLORS.market.heat.flat, dark: false };
  const size = Math.abs(rate);
  const step = size < 0.5 ? 0 : size < 1.5 ? 1 : size < 3 ? 2 : 3;
  return { background: CHART_COLORS.market.heat[tone][step], dark: step >= 2 };
}

export function MarketHeatmap({ attrs }: { attrs: Attrs }) {
  const items = list(attrs.items);
  if (items.length === 0) return null;
  return (
    <div>
      {str(attrs.title) && (
        <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-800">
          🔥 {str(attrs.title)}
          <span className="text-[11px] font-normal text-slate-400">진할수록 크게 움직임</span>
        </p>
      )}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item, index) => {
          const rate = num(item.rate);
          const { background, dark } = heat(rate);
          return (
            <div
              key={index}
              title={`${str(item.label)} ${rate === null ? "" : rateText(rate)} · ${str(item.sub)}`}
              className={`flex min-h-20 flex-col justify-between rounded-lg p-2.5 transition hover:scale-[1.03] hover:shadow-md ${dark ? "text-white" : "text-slate-900"}`}
              style={{ backgroundColor: background }}
            >
              <p className="truncate text-sm font-bold">{str(item.label)}</p>
              <div>
                <p className="text-lg font-extrabold tabular-nums">
                  {rate === null ? "-" : rateText(rate)}
                </p>
                <p className={`truncate text-[10px] ${dark ? "text-white/80" : "text-slate-500"}`}>
                  {str(item.sub)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────────── 순위 카드 ─────────────

const RANK_TOP: Record<string, string> = {
  up: "border-t-red-500",
  down: "border-t-blue-500",
  info: "border-t-amber-500",
};

export function MarketRanks({ attrs }: { attrs: Attrs }) {
  const groups = list(attrs.groups);
  if (groups.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((group, index) => (
        <div
          key={index}
          className={`overflow-hidden rounded-xl border border-t-4 border-slate-200 bg-white shadow-sm ${RANK_TOP[str(group.tone)] ?? "border-t-slate-400"}`}
        >
          <p className="px-4 pt-3 pb-2 text-sm font-bold text-slate-800">{str(group.title)}</p>
          <ol className="divide-y divide-slate-100">
            {list(group.items).map((item, rank) => (
              <li key={rank} className="flex items-center gap-3 px-4 py-2">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${rank < 3 ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}
                >
                  {rank + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900">
                    {str(item.name)}
                  </span>
                  <span className="block truncate text-[11px] text-slate-400">
                    {str(item.sub)}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-xs text-slate-600 tabular-nums">
                    {str(item.value)}
                  </span>
                  <RatePill rate={num(item.rate)} className="mt-0.5" />
                </span>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
