"use client";

import { LegendSwatch, LineChart, Sparkline, type LineSeries } from "@/components/home/line-chart";
import { CHART_COLORS } from "@/lib/chart-colors";
import { LoadingState, Spinner } from "@/components/common/loading";
import { Tabs } from "@/components/common/tabs";
import { Tooltip } from "@/components/common/tooltip";
import {
  adminApi,
  type ApiDashboard,
  type ApiDashboardEndpoint,
  type ApiDashboardRanking,
  type ApiDashboardSummary,
  type ApiDashboardTrendPoint,
} from "@/lib/api/admin-api";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Gauge,
  Info,
  RotateCw,
  Server,
  Table2,
  Timer,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// 이 주기마다 숫자를 새로 받음.
const REFRESH_MS = 30_000;
// 그래프 색은 공통 색(CHART_COLORS)에서. 둘째 계열(오류·p95)은 점선으로도 구분.
const REQUEST_COLOR = CHART_COLORS.primary;
const ERROR_COLOR = CHART_COLORS.secondary;
const AVG_COLOR = CHART_COLORS.primary;
const P95_COLOR = CHART_COLORS.secondary;
// 응답 시간 분포: 빠를수록 진한 파랑, 느릴수록 진한 빨강. 느린 두 계열은 점선으로 모양도 구분.
const SPEED_GROUPS: {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
  bins: number[];
}[] = [
  { key: "fast", label: "빠름 ≤200ms", color: CHART_COLORS.speed.fast, bins: [0, 1, 2] },
  { key: "normal", label: "보통 ≤1초", color: CHART_COLORS.speed.normal, bins: [3, 4, 5] },
  {
    key: "slow",
    label: "느림 ≤5초",
    color: CHART_COLORS.speed.slow,
    dashed: true,
    bins: [6, 7],
  },
  {
    key: "verySlow",
    label: "매우 느림 >5초",
    color: CHART_COLORS.speed.verySlow,
    dashed: true,
    bins: [8],
  },
];

type Range = "HOUR" | "DAY" | "WEEK" | "MONTH";
// 기간별 탭 글자, 이름, 비교 대상 이름, 점 하나의 길이(분). 모두 지금부터 거꾸로 밀려가는 창(맨 오른쪽 점이 지금).
const RANGES: Record<
  Range,
  { tab: string; name: string; previousName: string; stepMinutes: number }
> = {
  HOUR: {
    tab: "최근 60분 · 1분 단위",
    name: "최근 60분",
    previousName: "직전 60분",
    stepMinutes: 1,
  },
  DAY: {
    tab: "최근 24시간 · 5분 단위",
    name: "최근 24시간",
    previousName: "직전 24시간",
    stepMinutes: 5,
  },
  WEEK: {
    tab: "최근 7일 · 1시간 단위",
    name: "최근 7일",
    previousName: "직전 7일",
    stepMinutes: 60,
  },
  MONTH: {
    tab: "최근 30일 · 1시간 단위",
    name: "최근 30일",
    previousName: "직전 30일",
    stepMinutes: 60,
  },
};
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
// "10/27(화)"
const monthDay = (value: string) => {
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()}(${WEEKDAYS[date.getDay()]})`;
};
// 구간의 마지막 분(시작 + 간격 - 1분). 14:00부터 5분이면 14:04, 1시간이면 14:59.
const lastMinute = (start: string, stepMinutes: number) =>
  new Date(new Date(start).getTime() + (stepMinutes - 1) * 60_000).toISOString();
const hourOnly = (value: string) => `${String(new Date(value).getHours()).padStart(2, "0")}시`;
const shortDay = (value: string) => {
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const formatNumber = (value: number) => value.toLocaleString("ko-KR");
const formatMs = (value: number) => `${formatNumber(Math.round(value))}ms`;
// p95는 응답 시간 구간 안에서 비례 계산한 추정값이라 "약"을 붙임.
const formatP95 = (value: number) => (value < 0 ? "5초 초과" : `약 ${formatNumber(value)}ms`);
const formatUptime = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}일 ${hours}시간`;
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  return `${minutes}분`;
};
const clock = (value: string) =>
  new Date(value).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

// 순위 옆 작은 추이선 한 칸의 길이
const RANKING_STEP: Record<Range, string> = {
  HOUR: "1분",
  DAY: "5분",
  WEEK: "24시간",
  MONTH: "1시간",
};

// 전체 구간 글자: 14:00 ~ 14:59 / 10/29(목) 14:05 ~ 10/30(금) 14:04 / 10/24(금) 15시 ~ 10/31(금) 14시
const periodOf = (points: ApiDashboardTrendPoint[], range: Range) => {
  const first = points[0]?.startAt;
  const last = points.at(-1)?.startAt;
  if (!first || !last) return "";
  const end = clock(lastMinute(last, RANGES[range].stepMinutes));
  if (range === "HOUR") return `${clock(first)} ~ ${end}`;
  if (range === "DAY") return `${monthDay(first)} ${clock(first)} ~ ${monthDay(last)} ${end}`;
  return `${monthDay(first)} ${hourOnly(first)} ~ ${monthDay(last)} ${hourOnly(last)}`;
};
// 아래쪽 글자(빈 글자는 표시 안 함): 최근 60분은 10분 단위 시각(17:10·17:20…), 최근 24시간은 3시간마다(정각),
// 최근 7일은 날마다(그날 정오 위치), 최근 30일은 창 안의 자정을 5개마다(월말→1일로 넘어가도 간격이 같음)
const labelOf = (point: ApiDashboardTrendPoint, index: number, range: Range) => {
  const date = new Date(point.startAt);
  if (range === "HOUR") return date.getMinutes() % 10 === 0 ? clock(point.startAt) : "";
  if (range === "DAY")
    return date.getMinutes() === 0 && date.getHours() % 3 === 0 ? hourOnly(point.startAt) : "";
  if (range === "WEEK") return date.getHours() === 12 ? monthDay(point.startAt) : "";
  // 1시간 점이라 n번째 자정은 index / 24의 몫이 n
  return date.getHours() === 0 && Math.floor(index / 24) % 5 === 0 ? shortDay(point.startAt) : "";
};
// 마우스를 올렸을 때 제목: 14:05(1분) / 14:05 ~ 14:09 / 10/27(화) 13:00 ~ 13:59
// 세밀한 기록이 없어 큰 단위 합계를 나눠 채운 칸은 추정값임을 함께 표시.
const ESTIMATE_NOTE: Record<Range, string> = {
  HOUR: " (5분 합계를 나눈 추정값)",
  DAY: " (1시간 합계를 나눈 추정값)",
  WEEK: "",
  MONTH: "",
};
const titleOf = (point: ApiDashboardTrendPoint, range: Range) => {
  const step = RANGES[range].stepMinutes;
  const span =
    step === 1
      ? clock(point.startAt)
      : `${clock(point.startAt)} ~ ${clock(lastMinute(point.startAt, step))}`;
  const note = point.estimated ? ESTIMATE_NOTE[range] : "";
  return range === "WEEK" || range === "MONTH"
    ? `${monthDay(point.startAt)} ${span}${note}`
    : `${span}${note}`;
};

// 홈 화면의 관리자 전용 "API 상태". 서버 여러 대의 요청을 합친 숫자(배포)나 이 서버 숫자(로컬)를 30초마다 갱신.
// 고른 기간 탭 것만 받아 오고(30초마다 갱신), 한 번 받은 탭은 기억해 두었다가 다시 고르면 바로 보여 줌.
export function ApiDashboardSection({ accessToken }: { accessToken: string }) {
  const [range, setRange] = useState<Range>("HOUR");
  const [dataByRange, setDataByRange] = useState<Partial<Record<Range, ApiDashboard>>>({});
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // 아직 받지 않은 탭이면 null → 안쪽 카드마다 같은 높이 그대로 로딩 표시.
  const data = dataByRange[range] ?? null;

  const load = useCallback(async () => {
    const target = range;
    setRefreshing(true);
    try {
      const result = await adminApi.apiDashboard(accessToken, target);
      setDataByRange((current) => ({ ...current, [target]: result }));
      setError(null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "[조회 실패] API 대시보드를 불러오지 못함",
      );
    } finally {
      setRefreshing(false);
    }
  }, [accessToken, range]);

  useEffect(() => {
    void Promise.resolve().then(load);
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Activity size={18} className="text-blue-600" aria-hidden="true" />
            API 상태
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
              관리자 전용
            </span>
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            모든 API 요청을 모아 최근 60분·24시간·7일·30일 흐름을 보여 줍니다. 숫자 카드와 그래프는
            고른 기간을 따라갑니다.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {data && <ModeBadge mode={data.mode} />}
          {data && <DatabaseBadge status={data.database} />}
          {data && <span>{clock(data.generatedAt)} 기준</span>}
          <Tooltip label="지금 새로 불러오기 (30초마다 자동)">
            <button
              type="button"
              aria-label="API 상태 새로고침"
              onClick={() => void load()}
              disabled={refreshing}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-blue-600 disabled:cursor-default"
            >
              {refreshing ? (
                <Spinner size={15} className="text-blue-500" />
              ) : (
                <RotateCw size={15} aria-hidden="true" />
              )}
            </button>
          </Tooltip>
        </div>
      </div>

      {/* 기간 탭: 숫자 카드·그래프·순위가 모두 이 기간을 따라감. */}
      <div className="mt-5 flex flex-wrap items-end justify-between gap-2">
        <Tabs
          items={(Object.keys(RANGES) as Range[]).map((value) => ({
            key: value,
            label: RANGES[value].tab,
          }))}
          value={range}
          onChange={setRange}
          ariaLabel="기간"
        />
        <span className="pb-2.5 text-xs font-medium text-slate-500">
          {data ? periodOf(data.trend, range) : ""}
        </span>
      </div>
      <ApiDashboardBody data={data} range={range} error={error} />
    </section>
  );
}

// 숫자 카드·그래프·순위·서버 목록. data가 null이면(이 탭을 아직 받기 전) 카드마다 같은 높이로 로딩 표시,
// 받지 못했으면 그 자리에 실패 안내.
function ApiDashboardBody({
  data,
  range,
  error,
}: {
  data: ApiDashboard | null;
  range: Range;
  error: string | null;
}) {
  // 카드 안 로딩 자리에 보여 줄 안내(받기 전: 로딩, 실패: 안내 문구)
  const waiting: CardWaiting = data ? null : error ? { error } : "loading";
  return (
    <>
      {data && error && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          [갱신 실패] {error} · 마지막으로 받은 숫자를 보여 주는 중
        </p>
      )}
      <KpiRow
        summary={data?.summary ?? null}
        previous={data?.previousSummary ?? null}
        rangeName={RANGES[range].name}
        previousName={RANGES[range].previousName}
        waiting={waiting}
      />
      <TrendSection
        points={data?.trend ?? null}
        range={range}
        generatedAt={data?.generatedAt ?? ""}
        waiting={waiting}
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <EndpointList
          title={`많이 호출된 API · ${RANGES[range].name}`}
          description={`${RANGES[range].name} 호출 수 · 오른쪽 점선은 ${RANKING_STEP[range]} 단위 흐름`}
          ranking={data?.ranking ?? null}
          items={data?.ranking.top ?? []}
          metric="requests"
          generatedAt={data?.generatedAt ?? ""}
          waiting={waiting}
        />
        <EndpointList
          title={`느린 API · ${RANGES[range].name}`}
          description={`${RANGES[range].name} 평균 응답 시간(5회 이상 호출) · 점선은 ${RANKING_STEP[range]} 단위 평균`}
          ranking={data?.ranking ?? null}
          items={data?.ranking.slow ?? []}
          metric="avgMs"
          generatedAt={data?.generatedAt ?? ""}
          waiting={waiting}
        />
      </div>
      <ServerList servers={data?.servers ?? null} mode={data?.mode ?? "LOCAL"} waiting={waiting} />
    </>
  );
}

// 카드 안 기다림 상태: null(데이터 있음), "loading"(받는 중), { error }(받지 못함)
type CardWaiting = null | "loading" | { error: string };

// 카드 안 정해진 높이 자리에 로딩 또는 실패 안내를 보여 줌(카드 크기는 그대로라 화면이 들썩이지 않음).
function CardWaitingState({ waiting, className }: { waiting: CardWaiting; className: string }) {
  if (!waiting) return null;
  return waiting === "loading" ? (
    <LoadingState message="불러오는 중입니다..." className={className} />
  ) : (
    <p className={`flex items-center justify-center text-xs text-slate-500 ${className}`}>
      {waiting.error}
    </p>
  );
}

function ModeBadge({ mode }: { mode: ApiDashboard["mode"] }) {
  return (
    <Tooltip
      multiline
      label={
        mode === "SHARED"
          ? "모든 서버의 요청을 DB에 함께 모아 합친 숫자입니다. 서버·Redis를 재시작해도 기록이 남습니다."
          : "요청 집계는 DB에 모아 재시작해도 남습니다. Redis 없이 실행 중이라(로컬 개발) 아래 서버 목록에는 이 서버만 보입니다."
      }
    >
      <span
        className={`rounded-full px-2 py-1 font-medium ${mode === "SHARED" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
      >
        {mode === "SHARED" ? "서버 통합 집계" : "DB 보관 집계"}
      </span>
    </Tooltip>
  );
}

function DatabaseBadge({ status }: { status: ApiDashboard["database"] }) {
  const up = status === "UP";
  return (
    <span
      className={`flex items-center gap-1 rounded-full px-2 py-1 font-medium ${up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
    >
      <Database size={12} aria-hidden="true" />
      DB {up ? "정상" : "연결 안 됨"}
    </span>
  );
}

// 직전 기간 대비 증감. 색은 주식 표기처럼 방향으로만: 상승 빨강 · 하락 파랑 · 변화 없음 회색.
type DeltaDirection = "up" | "down" | "flat";
type Delta = { direction: DeltaDirection; text: string; detail: string };

const directionOf = (change: number): DeltaDirection =>
  change > 0 ? "up" : change < 0 ? "down" : "flat";

// 변화율(%). 직전 값이 0이면 비율을 낼 수 없어 null(화면에 "직전 기록 없음").
const percentDelta = (current: number, previous: number, detail: string): Delta | null => {
  if (previous <= 0 || current < 0) return null;
  const change = Math.round(((current - previous) / previous) * 100);
  return { direction: directionOf(change), text: `${Math.abs(change)}%`, detail };
};

// 비율 숫자(오류율 %)의 차이는 %p(퍼센트포인트)로. 0.4% → 0.5%면 0.1%p 상승.
const pointDelta = (current: number, previous: number, detail: string): Delta => {
  const change = Math.round((current - previous) * 10) / 10;
  return { direction: directionOf(change), text: `${Math.abs(change)}%p`, detail };
};

const DELTA_STYLE: Record<DeltaDirection, { badge: string; word: string }> = {
  up: { badge: "bg-red-50 text-red-600 ring-red-100", word: "상승" },
  down: { badge: "bg-blue-50 text-blue-600 ring-blue-100", word: "하락" },
  flat: { badge: "bg-slate-100 text-slate-500 ring-slate-200", word: "변화 없음" },
};

// 등락 화살표: 모서리가 둥근 작은 삼각형(위·아래), 변화 없음은 짧은 가로줄.
// 나타날 때 오르면 위로·내리면 아래로 한 번 튐(globals.css delta-arrow-*).
function DeltaArrow({ direction }: { direction: DeltaDirection }) {
  if (direction === "flat") {
    return (
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <path d="M2.5 5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      aria-hidden="true"
      className={direction === "up" ? "delta-arrow-up" : "delta-arrow-down"}
    >
      <path
        d={direction === "up" ? "M5 2.4 8 7.4H2Z" : "M5 7.6 8 2.6H2Z"}
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 숫자 옆 등락 배지. 색만으로 구분하지 않도록 화살표와 설명(마우스를 올리면 직전 값)을 함께 둠.
// 값이 바뀌면 key가 바뀌어 다시 나타나는 애니메이션이 재생됨(같은 값으로 갱신되면 그대로).
function DeltaBadge({ delta, previousName }: { delta: Delta | null; previousName: string }) {
  if (!delta) {
    return <span className="text-xs text-slate-400">{previousName} 기록 없음</span>;
  }
  const style = DELTA_STYLE[delta.direction];
  const label = `${previousName} 대비 ${delta.text} ${style.word} · ${previousName} ${delta.detail}`;
  return (
    <Tooltip label={label} multiline>
      <span
        key={`${delta.direction}-${delta.text}`}
        className={`delta-badge inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] leading-none font-semibold tabular-nums ring-1 ring-inset ${style.badge}`}
      >
        <DeltaArrow direction={delta.direction} />
        <span aria-hidden="true">{delta.text}</span>
        <span className="sr-only">{label}</span>
      </span>
    </Tooltip>
  );
}

// 큰 숫자 4개: 요청 수 · 서버 오류율 · 평균 응답 · p95 응답. 모두 고른 기간(탭)의 값.
// 숫자 옆에는 직전 같은 길이 기간과 비교한 증감(▲▼).
function KpiRow({
  summary: loaded,
  previous,
  rangeName,
  previousName,
  waiting,
}: {
  summary: ApiDashboardSummary | null;
  previous: ApiDashboardSummary | null;
  rangeName: string;
  previousName: string;
  waiting: CardWaiting;
}) {
  // 받기 전에는 0으로 틀만 만들고, 숫자 자리에 스피너(카드 크기는 그대로)
  const summary = loaded ?? {
    requests: 0,
    clientErrors: 0,
    serverErrors: 0,
    errorRate: 0,
    avgMs: 0,
    p95Ms: 0,
  };
  // 직전 기간에 요청이 없으면 비교할 수 없음. 응답 시간은 이번 기간에도 요청이 있어야 비교.
  const comparable = previous !== null && previous.requests > 0;
  const timed = comparable && summary.requests > 0;
  const tiles: {
    label: string;
    icon: LucideIcon;
    value: string;
    sub: string;
    help: string;
    warn?: boolean;
    delta: Delta | null;
  }[] = [
    {
      label: "요청 수",
      icon: Activity,
      value: `${formatNumber(summary.requests)}건`,
      sub: `오류 ${formatNumber(summary.clientErrors + summary.serverErrors)}건 포함`,
      help: "API가 처리한 요청 개수",
      delta: comparable
        ? percentDelta(summary.requests, previous.requests, `${formatNumber(previous.requests)}건`)
        : null,
    },
    {
      label: "서버 오류율",
      icon: summary.serverErrors > 0 ? AlertTriangle : CheckCircle2,
      value: `${summary.errorRate}%`,
      sub: `5xx ${formatNumber(summary.serverErrors)}건 · 4xx ${formatNumber(summary.clientErrors)}건`,
      help: "서버 잘못(5xx)으로 실패한 비율. 4xx는 잘못된 요청·권한 없음처럼 요청 쪽 문제",
      warn: summary.serverErrors > 0,
      delta: comparable
        ? pointDelta(summary.errorRate, previous.errorRate, `${previous.errorRate}%`)
        : null,
    },
    {
      label: "평균 응답",
      icon: Timer,
      value: formatMs(summary.avgMs),
      sub: `요청 ${formatNumber(summary.requests)}건 기준`,
      help: "요청 하나를 처리하는 데 걸린 평균 시간",
      delta: timed ? percentDelta(summary.avgMs, previous.avgMs, formatMs(previous.avgMs)) : null,
    },
    {
      label: "p95 응답",
      icon: Gauge,
      value: formatP95(summary.p95Ms),
      sub: "100건 중 95건이 이 안에 끝남",
      help: "100건 중 95건이 이 시간 안에 끝났다는 뜻. 평균에 묻히는 느린 요청을 잡아내는 숫자. 응답 시간 구간 안에서 비례 계산한 추정값",
      // 5초 초과(-1)는 정확한 값이 아니라 비교하지 않음
      delta:
        timed && summary.p95Ms >= 0 && previous.p95Ms >= 0
          ? percentDelta(summary.p95Ms, previous.p95Ms, formatP95(previous.p95Ms))
          : null,
    },
  ];
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-xl border border-slate-200 px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <tile.icon
              size={14}
              className={tile.warn ? "text-red-500" : "text-slate-400"}
              aria-hidden="true"
            />
            {tile.label} · {rangeName}
            <Tooltip label={tile.help} multiline className="ml-auto">
              <Info size={13} className="text-slate-300" aria-label={tile.help} />
            </Tooltip>
          </p>
          {loaded ? (
            <>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900">
                  {tile.value}
                </span>
                <DeltaBadge delta={tile.delta} previousName={previousName} />
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{tile.sub}</p>
            </>
          ) : (
            <div className="mt-1 flex h-12 items-center">
              {waiting === "loading" ? (
                <Spinner size={18} className="text-blue-500" />
              ) : (
                <span className="text-xs text-slate-400">-</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// 추이 영역: 고른 기간의 그래프 2개 + 표로 보기.
// 아직 오지 않은 시간은 0이 아니라 빈칸이라 선이 "지금"에서 끊김.
// 요청 수와 응답 시간은 단위가 달라(건 vs ms) 한 그래프에 섞지 않고 나눠 그림.
function TrendSection({
  points: loaded,
  range,
  generatedAt,
  waiting,
}: {
  points: ApiDashboardTrendPoint[] | null;
  range: Range;
  // 이 시각보다 뒤에 시작하는 점은 아직 오지 않은 시간
  generatedAt: string;
  waiting: CardWaiting;
}) {
  const [showTable, setShowTable] = useState(false);
  const points = loaded ?? [];
  const config = RANGES[range];
  const labels = points.map((point, index) => labelOf(point, index, range));
  const titles = points.map((point) => titleOf(point, range));
  const now = new Date(generatedAt).getTime();
  const isFuture = (point: ApiDashboardTrendPoint) => new Date(point.startAt).getTime() > now;
  // 큰 단위 기록(1시간·5분 합계) 묶음에 포함돼 따로 값이 없는 칸
  const isMerged = (point: ApiDashboardTrendPoint) => point.spanMinutes === 0;
  // 표에는 이미 지난 칸만(묶음에 포함된 칸은 빼고 합계 줄 하나로).
  const tableIndexes = points
    .map((_, index) => index)
    .filter((index) => !isFuture(points[index]) && !isMerged(points[index]));
  const hasData = points.some((point) => point.requests > 0);
  // 아직 오지 않은 시간·묶음에 포함된 칸은 빈칸.
  // 값 없는 칸(묶음에 포함)은 건너뛰고 앞뒤 점을 바로 이어 선이 끊기지 않게 함.
  const countValue = (point: ApiDashboardTrendPoint, value: number) =>
    isFuture(point) || isMerged(point) ? null : value;
  // 요청이 없던 구간의 응답 시간은 0이 아니라 "기록 없음". 응답 시간 선은 그 칸을 건너뛰고 앞뒤 점을 바로 이음.
  const responseValue = (point: ApiDashboardTrendPoint, value: number) =>
    isFuture(point) || isMerged(point) || point.requests === 0 ? null : value < 0 ? 5000 : value;
  const requestSeries: LineSeries[] = [
    {
      key: "requests",
      label: "요청",
      color: REQUEST_COLOR,
      connectGaps: true,
      values: points.map((point) => countValue(point, point.requests)),
    },
    {
      key: "errors",
      label: "오류(4xx·5xx)",
      color: ERROR_COLOR,
      dashed: true,
      connectGaps: true,
      values: points.map((point) => countValue(point, point.errors)),
    },
  ];
  const responseSeries: LineSeries[] = [
    {
      key: "avg",
      label: "평균",
      color: AVG_COLOR,
      connectGaps: true,
      values: points.map((point) => responseValue(point, point.avgMs)),
    },
    {
      key: "p95",
      label: "p95",
      color: P95_COLOR,
      dashed: true,
      connectGaps: true,
      values: points.map((point) => responseValue(point, point.p95Ms)),
    },
  ];

  // 빠르기 묶음별 요청 수(응답 시간 구간 9칸을 4묶음으로 더함)
  const speedSeries: LineSeries[] = SPEED_GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    color: group.color,
    dashed: group.dashed,
    connectGaps: true,
    values: points.map((point) =>
      countValue(
        point,
        group.bins.reduce((sum, bin) => sum + (point.latency[bin] ?? 0), 0),
      ),
    ),
  }));

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">{config.name} 추이</h3>
        <button
          type="button"
          aria-pressed={showTable}
          disabled={!loaded}
          onClick={() => setShowTable((value) => !value)}
          className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${showTable ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-100"}`}
        >
          <Table2 size={14} aria-hidden="true" />
          {showTable ? "그래프로 보기" : "표로 보기"}
        </button>
      </div>

      {loaded && showTable ? (
        <TrendTable
          points={tableIndexes.map((index) => points[index])}
          titles={tableIndexes.map((index) => titles[index])}
        />
      ) : (
        <div className="mt-4 grid gap-6 xl:grid-cols-2">
          <ChartCard
            title="요청 · 오류"
            unit="건"
            series={requestSeries}
            waiting={waiting}
            empty={!!loaded && !hasData}
          >
            <LineChart
              labels={labels}
              tooltipTitles={titles}
              series={requestSeries}
              formatValue={(value) => `${formatNumber(Math.round(value))}`}
              labelEvery={1}
              ariaLabel={`${config.name} 요청과 오류 추이`}
            />
          </ChartCard>
          <ChartCard
            title="응답 시간"
            unit="ms"
            series={responseSeries}
            waiting={waiting}
            empty={!!loaded && !hasData}
          >
            <LineChart
              labels={labels}
              tooltipTitles={titles}
              series={responseSeries}
              formatValue={formatMs}
              labelEvery={1}
              ariaLabel={`${config.name} 평균·p95 응답 시간 추이`}
            />
          </ChartCard>
          {/* 응답 시간 분포: 평균·p95로는 안 보이는 "가끔 느린 요청"을 빠르기 묶음별 요청 수로 */}
          <ChartCard
            title="응답 시간 분포"
            unit="건"
            series={speedSeries}
            className="xl:col-span-2"
            waiting={waiting}
            empty={!!loaded && !hasData}
          >
            <LineChart
              labels={labels}
              tooltipTitles={titles}
              series={speedSeries}
              formatValue={(value) => `${formatNumber(Math.round(value))}`}
              labelEvery={1}
              ariaLabel={`${config.name} 빠르기별 요청 수 추이`}
            />
          </ChartCard>
        </div>
      )}
    </div>
  );
}

// 그래프 카드. 그래프 자리는 높이 고정(200px)이라 받는 중·기록 없음일 때도 카드 크기가 그대로.
function ChartCard({
  title,
  unit,
  series,
  className = "",
  waiting,
  empty,
  children,
}: {
  title: string;
  unit: string;
  series: LineSeries[];
  className?: string;
  waiting: CardWaiting;
  // 이 기간에 기록된 요청이 없음
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 p-4 ${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">
          {title} <span className="text-xs font-normal text-slate-400">({unit})</span>
        </h3>
        {/* 범례: 색과 함께 선 모양(실선·점선)과 이름으로 구분. */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {series.map((item) => (
            <span key={item.key} className="flex items-center gap-1.5">
              <LegendSwatch color={item.color} dashed={item.dashed} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
      {waiting ? (
        <CardWaitingState waiting={waiting} className="h-[200px]" />
      ) : empty ? (
        <p className="flex h-[200px] items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-500">
          이 기간에 기록된 요청이 없습니다.
        </p>
      ) : (
        children
      )}
    </div>
  );
}

// 그래프와 같은 숫자를 표로(색을 구분하기 어렵거나 정확한 값을 볼 때).
function TrendTable({ points, titles }: { points: ApiDashboardTrendPoint[]; titles: string[] }) {
  return (
    <div className="mt-4 max-h-80 overflow-auto rounded-xl border border-slate-200">
      <table className="w-full text-right text-xs tabular-nums">
        <thead className="sticky top-0 bg-slate-50 text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left font-medium">시간</th>
            <th className="px-3 py-2 font-medium">요청</th>
            <th className="px-3 py-2 font-medium">오류</th>
            <th className="px-3 py-2 font-medium">평균 응답</th>
            <th className="px-3 py-2 font-medium">p95 응답</th>
          </tr>
        </thead>
        <tbody>
          {points
            .map((point, index) => ({ point, title: titles[index] }))
            .reverse()
            .map(({ point, title }) => (
              <tr key={point.startAt} className="border-t border-slate-100 text-slate-700">
                <td className="px-3 py-1.5 text-left">{title}</td>
                <td className="px-3 py-1.5">{formatNumber(point.requests)}</td>
                <td className="px-3 py-1.5">{formatNumber(point.errors)}</td>
                <td className="px-3 py-1.5">
                  {point.requests === 0 ? "-" : formatMs(point.avgMs)}
                </td>
                <td className="px-3 py-1.5">
                  {point.requests === 0 ? "-" : formatP95(point.p95Ms)}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

// "GET /api/v1/chatRoom" → 방식 딱지 + 주소
function EndpointName({ endpoint }: { endpoint: string }) {
  const [method, ...rest] = endpoint.split(" ");
  const path = rest.join(" ");
  if (!path) return <span className="truncate text-xs text-slate-600">{endpoint}</span>;
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span
        className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${method === "GET" ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700"}`}
      >
        {method}
      </span>
      <span className="truncate font-mono text-xs text-slate-700" title={path}>
        {path}
      </span>
    </span>
  );
}

// API 순위(고른 기간 기준). 막대 대신 오른쪽에 점선 추이선을 붙여 "언제 많이/느리게 불렸는지"를 함께 보여 줌.
function EndpointList({
  title,
  description,
  ranking,
  items,
  metric,
  generatedAt,
  waiting,
}: {
  title: string;
  description: string;
  // 작은 추이선 칸의 시작 시각(bins)을 쓰기 위해 순위 전체를 받음(받기 전에는 null).
  ranking: ApiDashboardRanking | null;
  items: ApiDashboardEndpoint[];
  metric: "requests" | "avgMs";
  // 이 시각보다 뒤에 시작하는 칸은 아직 오지 않아 추이선을 비움.
  generatedAt: string;
  waiting: CardWaiting;
}) {
  const now = new Date(generatedAt).getTime();
  const future = (ranking?.bins ?? []).map((bin) => new Date(bin).getTime() > now);
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500">{description}</p>
      {/* 목록 자리는 5줄 높이만큼 잡아 두어, 받는 중·기록 없음일 때도 크기가 그대로. */}
      <div className="min-h-[264px]">
        {waiting ? (
          <CardWaitingState waiting={waiting} className="h-[264px]" />
        ) : items.length === 0 ? (
          <p className="mt-2 flex h-[256px] items-center justify-center rounded-lg bg-slate-50 text-xs text-slate-500">
            아직 기록이 없습니다.
          </p>
        ) : (
          <ol className="mt-2 divide-y divide-slate-100">
            {items.map((item, index) => {
              const trend = (metric === "requests" ? item.trendRequests : item.trendAvgMs).map(
                (value, bin) =>
                  future[bin] || (metric === "avgMs" && item.trendRequests[bin] === 0)
                    ? null
                    : value,
              );
              return (
                <li key={item.endpoint} className="flex items-center gap-3 py-2">
                  <span className="w-4 shrink-0 text-center text-xs font-semibold text-slate-400">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <EndpointName endpoint={item.endpoint} />
                  </span>
                  <Sparkline
                    values={trend}
                    color={metric === "requests" ? REQUEST_COLOR : P95_COLOR}
                    label={`${item.endpoint} ${title} ${metric === "requests" ? "호출 수" : "평균 응답 시간"} 추이`}
                  />
                  <span className="w-20 shrink-0 text-right text-xs tabular-nums">
                    <span className="font-semibold text-slate-800">
                      {metric === "requests"
                        ? `${formatNumber(item.requests)}회`
                        : formatMs(item.avgMs)}
                    </span>
                    {item.errors > 0 && (
                      <span className="block text-red-600">오류 {formatNumber(item.errors)}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

// 지금 살아 있는 서버 목록. 10초마다 보고하고, 30초 끊기면 목록에서 빠짐.
function ServerList({
  servers: loaded,
  mode,
  waiting,
}: {
  servers: ApiDashboard["servers"] | null;
  mode: ApiDashboard["mode"];
  waiting: CardWaiting;
}) {
  const servers = loaded ?? [];
  return (
    <div className="mt-6">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
        <Server size={15} className="text-slate-400" aria-hidden="true" />
        가동 중인 서버 {loaded ? `${servers.length}대` : ""}
      </h3>
      <p className="text-xs text-slate-500">
        {mode === "SHARED"
          ? "각 서버가 10초마다 상태를 보고합니다. 30초 동안 보고가 없으면 꺼진 것으로 보고 목록에서 뺍니다."
          : "로컬 개발 중에는 지금 이 서버 한 대만 보입니다."}
      </p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="py-2 font-medium">서버</th>
              <th className="py-2 font-medium">가동 시간</th>
              <th className="py-2 font-medium">메모리 사용</th>
              <th className="py-2 text-right font-medium">실시간 연결</th>
            </tr>
          </thead>
          <tbody>
            {waiting ? (
              <tr>
                <td colSpan={4}>
                  <CardWaitingState waiting={waiting} className="h-14" />
                </td>
              </tr>
            ) : servers.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-center text-xs text-slate-500">
                  <XCircle size={14} className="mr-1 inline text-red-500" aria-hidden="true" />
                  보고 중인 서버가 없습니다.
                </td>
              </tr>
            ) : (
              servers.map((server) => {
                const percent =
                  server.heapMaxMb > 0
                    ? Math.round((server.heapUsedMb / server.heapMaxMb) * 100)
                    : 0;
                return (
                  <tr key={server.instanceId} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-500" aria-hidden="true" />
                        <span className="font-mono text-xs text-slate-800">
                          {server.instanceId}
                        </span>
                        {server.current && (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                            지금 응답한 서버
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 text-xs text-slate-600">
                      {formatUptime(server.uptimeSeconds)}
                    </td>
                    <td className="py-2.5 text-xs tabular-nums text-slate-600">
                      {formatNumber(server.heapUsedMb)} / {formatNumber(server.heapMaxMb)}MB
                      <span
                        className={`ml-1.5 font-semibold ${percent > 85 ? "text-red-600" : "text-slate-800"}`}
                      >
                        {percent}%
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-xs tabular-nums text-slate-600">
                      {formatNumber(server.realtimeConnections)}개
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
