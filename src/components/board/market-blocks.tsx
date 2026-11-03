"use client";

import { CHART_COLORS } from "@/lib/chart-colors";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

// 매일 증시 보고 게시글의 블록. 서버(BoardContent·MarketBlocks)가 정해 둔 속성만 남겨 보내고,
// 여기서는 그 값을 글자·숫자로만 그림(HTML 문자열을 넣지 않음).
// 디자인: 경제지 지면처럼 글자 위계와 얇은 선으로만 구분하고, 색은 숫자의 오름(빨강)·내림(파랑)에만 씀.
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

// 블록 위의 작은 제목(대문자 간격 넓힘)
function Label({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-medium tracking-[0.12em] text-slate-400 uppercase">{children}</p>
  );
}

function Rate({ rate, className = "" }: { rate: number | null; className?: string }) {
  if (rate === null) return <span className={`text-slate-300 ${className}`}>-</span>;
  return <span className={`tabular-nums ${TEXT[toneOf(rate)]} ${className}`}>{rateText(rate)}</span>;
}

// ───────────── 맨 위 머리 ─────────────

export function MarketHero({ attrs }: { attrs: Attrs }) {
  return (
    <header className="border-b border-slate-900 pb-4">
      <Label>{str(attrs.title) || "Daily Market Report"}</Label>
      <p className="mt-1.5 text-[28px] leading-tight font-semibold tracking-tight text-slate-950">
        {str(attrs.date)}
      </p>
    </header>
  );
}

// ───────────── 시장 머리 ─────────────

export function MarketBanner({ attrs }: { attrs: Attrs }) {
  const moodValue = str(attrs.mood);
  const mood: Tone | null =
    moodValue === "up" || moodValue === "down" || moodValue === "flat" ? moodValue : null;
  const arrow = mood === "up" ? "▲" : mood === "down" ? "▼" : "–";
  return (
    <div className="mt-10 flex items-end justify-between gap-3 border-b border-slate-200 pb-2">
      <div className="min-w-0">
        <Label>{str(attrs.market) === "us" ? "United States" : "Korea"}</Label>
        <h3 className="mt-0.5 text-xl font-semibold tracking-tight text-slate-950">
          {str(attrs.title)}
          <span className="ml-2 text-sm font-normal text-slate-400">{str(attrs.date)}</span>
        </h3>
      </div>
      {mood && str(attrs.moodLabel) && (
        <span className={`shrink-0 text-sm font-medium ${TEXT[mood]}`}>
          {arrow} {str(attrs.moodLabel)}
        </span>
      )}
    </div>
  );
}

// ───────────── 요약 문단·안내 ─────────────

export function Callout({ attrs, children }: { attrs?: Attrs; children: ReactNode }) {
  // muted: 맨 아래 안내처럼 작게, 나머지: 시장 요약 첫 문단(조금 크게)
  return str(attrs?.tone) === "muted" ? (
    <div className="mt-6 border-t border-slate-200 pt-3 text-xs leading-6 text-slate-400 [&>p]:min-h-0">
      {children}
    </div>
  ) : (
    <div className="text-[16px] leading-8 text-slate-800 [&>p]:min-h-0">{children}</div>
  );
}

// ───────────── 지수 칸 + 추이 선 ─────────────

function Sparkline({ values, tone }: { values: number[]; tone: Tone }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const line = values
    .map(
      (value, index) =>
        `${((index / (values.length - 1)) * 100).toFixed(2)},${(22 - ((value - min) / span) * 20).toFixed(2)}`,
    )
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 24"
      preserveAspectRatio="none"
      className="mt-3 h-6 w-full"
      role="img"
      aria-label={`최근 ${values.length}거래일 추이`}
    >
      <title>{`최근 ${values.length}거래일 추이`}</title>
      <polyline
        points={line}
        fill="none"
        stroke={tone === "flat" ? CHART_COLORS.market.flat : CHART_COLORS.market[tone]}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function MarketStats({ attrs }: { attrs: Attrs }) {
  const items = list(attrs.items);
  if (items.length === 0) return null;
  return (
    // 칸 사이 1px 선(바탕색 틈)으로만 나눔
    <div
      className={`grid grid-cols-2 gap-px border-y border-slate-200 bg-slate-200 ${items.length > 2 ? "lg:grid-cols-4" : ""}`}
    >
      {items.map((item, index) => {
        const rate = num(item.rate);
        const tone = toneOf(rate);
        const spark = (Array.isArray(item.spark) ? item.spark : []).filter(
          (value): value is number => typeof value === "number" && Number.isFinite(value),
        );
        return (
          <div key={index} className="bg-white px-4 py-3">
            <p className="truncate text-sm text-slate-600">{str(item.label)}</p>
            <p className="mt-1 text-[22px] leading-tight font-semibold tracking-tight text-slate-950 tabular-nums">
              {str(item.value)}
            </p>
            <p className="mt-0.5 flex items-baseline gap-2 text-xs tabular-nums">
              <span className={TEXT[tone]}>{str(item.change)}</span>
              <Rate rate={rate} />
            </p>
            <Sparkline values={spark} tone={tone} />
            <p className="mt-1 truncate text-[11px] text-slate-400">{str(item.sub)}</p>
          </div>
        );
      })}
    </div>
  );
}

// ───────────── 종목 등락 ─────────────

export function MarketBreadth({ attrs }: { attrs: Attrs }) {
  const up = num(attrs.up) ?? 0;
  const flat = num(attrs.flat) ?? 0;
  const down = num(attrs.down) ?? 0;
  const total = up + flat + down;
  if (total === 0) return null;
  const parts = [
    { key: "up", label: "오름", value: up, color: CHART_COLORS.market.up, text: TEXT.up },
    { key: "flat", label: "보합", value: flat, color: CHART_COLORS.grid, text: TEXT.flat },
    { key: "down", label: "내림", value: down, color: CHART_COLORS.market.down, text: TEXT.down },
  ];
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <Label>{str(attrs.label) || "종목 등락"}</Label>
        <span className="text-[11px] text-slate-400 tabular-nums">{total.toLocaleString()}개</span>
      </div>
      <div className="mt-2 flex h-1.5 gap-px">
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
      <p className="mt-2 flex flex-wrap gap-x-4 text-xs text-slate-500 tabular-nums">
        {parts.map((part) => (
          <span key={part.key}>
            {part.label} <span className={`font-medium ${part.text}`}>{part.value.toLocaleString()}</span>
            <span className="text-slate-400"> · {Math.round((part.value / total) * 100)}%</span>
          </span>
        ))}
      </p>
    </div>
  );
}

// ───────────── 종목 등락률 목록(가운데 기준 막대) ─────────────

export function MarketHeatmap({ attrs }: { attrs: Attrs }) {
  const items = list(attrs.items);
  if (items.length === 0) return null;
  const largest = Math.max(1, ...items.map((item) => Math.abs(num(item.rate) ?? 0)));
  return (
    <div>
      {str(attrs.title) && <Label>{str(attrs.title)}</Label>}
      <ul className="mt-1 divide-y divide-slate-100 border-y border-slate-200">
        {items.map((item, index) => {
          const rate = num(item.rate);
          const tone = toneOf(rate);
          const width = rate === null ? 0 : (Math.abs(rate) / largest) * 50;
          return (
            <li
              key={index}
              className="grid grid-cols-[minmax(0,1fr)_4.5rem_5rem] items-center gap-3 py-2 text-sm sm:grid-cols-[minmax(0,1fr)_4.5rem_8rem]"
            >
              <span className="min-w-0 truncate">
                <span className="font-medium text-slate-900">{str(item.label)}</span>
                <span className="ml-2 text-xs text-slate-400">{str(item.sub)}</span>
              </span>
              <Rate rate={rate} className="text-right" />
              {/* 가운데 세로선 기준으로 오름은 오른쪽, 내림은 왼쪽으로 뻗음 */}
              <span className="relative h-1.5 bg-slate-100" aria-hidden="true">
                <span className="absolute inset-y-[-3px] left-1/2 w-px bg-slate-300" />
                {tone !== "flat" && (
                  <span
                    className="absolute inset-y-0"
                    style={{
                      width: `${width}%`,
                      backgroundColor: CHART_COLORS.market[tone],
                      ...(tone === "up" ? { left: "50%" } : { right: "50%" }),
                    }}
                  />
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ───────────── 순위 ─────────────

export function MarketRanks({ attrs }: { attrs: Attrs }) {
  const groups = list(attrs.groups);
  if (groups.length === 0) return null;
  return (
    <div
      className={`grid grid-cols-1 gap-x-8 gap-y-6 ${groups.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}
    >
      {groups.map((group, index) => (
        <div key={index} className="min-w-0">
          <div className="border-b border-slate-900 pb-1">
            <Label>{str(group.title)}</Label>
          </div>
          <ol>
            {list(group.items).map((item, rank) => (
              <li
                key={rank}
                className="flex items-baseline gap-3 border-b border-slate-100 py-1.5 text-sm"
              >
                <span className="w-3 shrink-0 text-xs text-slate-300 tabular-nums">{rank + 1}</span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium text-slate-900">{str(item.name)}</span>
                  <span className="ml-1.5 text-[11px] text-slate-400">{str(item.sub)}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-500 tabular-nums">
                  {str(item.value)}
                </span>
                <Rate rate={num(item.rate)} className="w-16 shrink-0 text-right text-sm" />
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

// ───────────── 주요 뉴스(제목을 누르면 요약이 아래로 펼쳐짐) ─────────────

// 원문 링크는 http·https만(서버도 같은 검사를 함)
const safeLink = (value: unknown) =>
  typeof value === "string" && /^https?:\/\//i.test(value) ? value : null;

function NewsItem({ item }: { item: Attrs }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const href = safeLink(item.href);
  const summary = str(item.summary);
  const related = list(item.related).filter((row) => safeLink(row.href) && str(row.title));
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="group flex w-full cursor-pointer items-start gap-3 py-3 text-left"
      >
        <span className="w-7 shrink-0 pt-0.5 text-[11px] text-slate-400">{str(item.category)}</span>
        <span className="min-w-0 flex-1 text-[15px] leading-snug font-medium text-slate-900 group-hover:text-slate-600">
          {str(item.title)}
        </span>
        <span className="hidden shrink-0 pt-0.5 text-xs text-slate-400 tabular-nums sm:block">
          {[str(item.source), str(item.time)].filter(Boolean).join(" · ")}
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`mt-0.5 shrink-0 text-slate-400 transition-transform duration-300 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>
      {/* 높이를 0 → 내용 높이로 미끄러지듯 펼침(grid 행 높이 전환) */}
      <div
        id={panelId}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <div className="pb-4 pl-10">
            <p className="text-xs text-slate-400 sm:hidden">
              {[str(item.source), str(item.time)].filter(Boolean).join(" · ")}
            </p>
            {summary && <p className="text-sm leading-6 text-slate-600">{summary}</p>}
            {related.length > 0 && (
              <div className={summary ? "mt-3" : ""}>
                <p className="text-[11px] text-slate-400">같은 소식, 다른 보도</p>
                <ul className="mt-1 space-y-1">
                  {related.map((row, index) => (
                    <li key={index} className="text-sm leading-6 text-slate-600">
                      <a
                        href={safeLink(row.href) ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        tabIndex={open ? undefined : -1}
                        className="hover:text-slate-900 hover:underline"
                      >
                        {str(row.title)}
                      </a>
                      {str(row.source) && (
                        <span className="ml-1.5 text-xs text-slate-400">{str(row.source)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!summary && related.length === 0 && (
              <p className="text-sm text-slate-400">이 기사는 요약이 제공되지 않습니다.</p>
            )}
            {href && (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                tabIndex={open ? undefined : -1}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 transition hover:decoration-slate-900"
              >
                원문 기사 보기
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

export function MarketNews({ attrs }: { attrs: Attrs }) {
  const items = list(attrs.items);
  if (items.length === 0) return null;
  return (
    <section className="mt-8">
      <div className="flex items-end justify-between gap-3 border-b border-slate-900 pb-2">
        <h3 className="text-xl font-semibold tracking-tight text-slate-950">
          {str(attrs.title) || "주요 뉴스"}
        </h3>
        <span className="text-[11px] text-slate-400">제목을 누르면 요약이 펼쳐집니다</span>
      </div>
      <ul className="divide-y divide-slate-200">
        {items.map((item, index) => (
          <NewsItem key={index} item={item} />
        ))}
      </ul>
    </section>
  );
}
