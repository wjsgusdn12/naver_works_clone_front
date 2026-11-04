"use client";

import { ChoiceGroup, type ChoiceOption } from "@/components/common/choice-group";
import { CustomCheckbox } from "@/components/common/custom-checkbox";
import { CustomSelect, type SelectOption } from "@/components/common/custom-select";
import type { BoardItem } from "@/lib/api/board-api";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";

// 게시글 검색 필터. 주소(URL)에 짧은 이름으로 남겨 새로고침·뒤로 가기에도 유지.
// field: 제목·내용 중 찾을 칸, period: 등록 기간(지금부터 거꾸로), boardId: 이 게시판에서만, fileOnly: 첨부 있는 글만.
export type SearchField = "ALL" | "TITLE" | "CONTENT";
export type SearchPeriod = "ALL" | "1D" | "1W" | "1M" | "6M" | "1Y";
export type BoardSearchFilter = {
  field: SearchField;
  period: SearchPeriod;
  boardId: number | null;
  fileOnly: boolean;
};

export const EMPTY_SEARCH_FILTER: BoardSearchFilter = {
  field: "ALL",
  period: "ALL",
  boardId: null,
  fileOnly: false,
};

const FIELD_OPTIONS: SelectOption[] = [
  { value: "ALL", label: "제목 + 내용" },
  { value: "TITLE", label: "제목만" },
  { value: "CONTENT", label: "내용만" },
];
const PERIOD_OPTIONS: SelectOption[] = [
  { value: "ALL", label: "전체 기간" },
  { value: "1D", label: "최근 1일" },
  { value: "1W", label: "최근 1주" },
  { value: "1M", label: "최근 1개월" },
  { value: "6M", label: "최근 6개월" },
  { value: "1Y", label: "최근 1년" },
];

const isField = (value: string | null): value is SearchField =>
  FIELD_OPTIONS.some((option) => option.value === value);
const isPeriod = (value: string | null): value is SearchPeriod =>
  PERIOD_OPTIONS.some((option) => option.value === value);

// 주소 이름: sf(검색 위치)·sp(기간)·sb(게시판)·sfile(첨부)
export const searchFilterOf = (params: URLSearchParams): BoardSearchFilter => {
  const board = Number(params.get("sb"));
  return {
    field: isField(params.get("sf")) ? (params.get("sf") as SearchField) : "ALL",
    period: isPeriod(params.get("sp")) ? (params.get("sp") as SearchPeriod) : "ALL",
    boardId: Number.isInteger(board) && board > 0 ? board : null,
    fileOnly: params.get("sfile") === "1",
  };
};

// 기본값과 다른 것만 주소에 붙임
export const writeSearchFilter = (query: URLSearchParams, filter: BoardSearchFilter) => {
  if (filter.field !== "ALL") query.set("sf", filter.field);
  if (filter.period !== "ALL") query.set("sp", filter.period);
  if (filter.boardId) query.set("sb", String(filter.boardId));
  if (filter.fileOnly) query.set("sfile", "1");
};

// 비교·effect 의존값용 한 줄 글자. searchFilterFromKey로 되돌림.
export const searchFilterKey = (filter: BoardSearchFilter) =>
  `${filter.field}|${filter.period}|${filter.boardId ?? ""}|${filter.fileOnly}`;

export const searchFilterFromKey = (key: string): BoardSearchFilter => {
  const [field, period, board, fileOnly] = key.split("|");
  return {
    field: isField(field) ? field : "ALL",
    period: isPeriod(period) ? period : "ALL",
    boardId: board ? Number(board) : null,
    fileOnly: fileOnly === "true",
  };
};

// 켜 둔 필터 수(아이콘 옆 숫자)
export const activeFilterCount = (filter: BoardSearchFilter) =>
  (filter.field !== "ALL" ? 1 : 0) +
  (filter.period !== "ALL" ? 1 : 0) +
  (filter.boardId ? 1 : 0) +
  (filter.fileOnly ? 1 : 0);

// 기간 → 서버에 보낼 시작 시각(지금 기준). 전체 기간이면 없음.
export const periodFrom = (period: SearchPeriod, now = new Date()): string | undefined => {
  if (period === "ALL") return undefined;
  const from = new Date(now);
  if (period === "1D") from.setDate(from.getDate() - 1);
  else if (period === "1W") from.setDate(from.getDate() - 7);
  else if (period === "1M") from.setMonth(from.getMonth() - 1);
  else if (period === "6M") from.setMonth(from.getMonth() - 6);
  else from.setFullYear(from.getFullYear() - 1);
  return from.toISOString();
};

const COMMON_BOARD_LABEL: Partial<Record<BoardItem["type"], string>> = {
  NOTICE: "공지사항",
  FREE: "자유게시판",
  INQUIRY: "문의하기",
};

// 게시판 고르기 목록: 공통 게시판(공지·자유·문의)은 종류마다 하나만, 나머지는 회사별 머리글 아래에.
const boardOptions = (boards: BoardItem[]): SelectOption[] => {
  const options: SelectOption[] = [{ value: "", label: "모든 게시판" }];
  const commonSeen = new Set<string>();
  for (const board of boards) {
    const common = COMMON_BOARD_LABEL[board.type];
    if (!common || commonSeen.has(board.type)) continue;
    commonSeen.add(board.type);
    options.push({ value: String(board.id), label: common, group: "전체게시판" });
  }
  for (const board of boards) {
    if (COMMON_BOARD_LABEL[board.type]) continue;
    options.push({
      value: String(board.id),
      label: board.name,
      group: board.companyName,
      selectedLabel: `${board.companyName} · ${board.name}`,
    });
  }
  return options;
};

// 검색칸 오른쪽의 필터 버튼. 켜 둔 필터가 있으면 포인트 색 + 개수, 상세 검색 창이 열려 있어도 아이콘 선을 포인트 색으로(바탕은 투명).
export function SearchFilterButton({
  count,
  open,
  onClick,
}: {
  count: number;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={count ? `검색 필터 ${count}개 적용 중` : "검색 필터"}
      className={`relative flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full transition active:scale-90 ${open || count ? "text-blue-600 hover:bg-slate-200" : "text-slate-500 hover:bg-slate-200 hover:text-slate-800"}`}
    >
      <SlidersHorizontal size={16} aria-hidden="true" />
      {count > 0 && (
        <span
          className={`absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[9px] font-bold leading-none bg-blue-600 text-white`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// 검색 필터 창. 검색칸(anchor) 바로 밑에 왼쪽 선을 맞춰 펼침(화면이 좁으면 오른쪽 끝에 걸리지 않게 밀어 넣음).
// 검색어도 함께 고칠 수 있고, "검색"을 누르면 필터와 검색어를 한꺼번에 적용. 바깥을 누르거나 Esc면 닫힘.
export function BoardSearchFilterDialog({
  keyword,
  filter,
  boards,
  anchor,
  onApply,
  onClose,
}: {
  keyword: string;
  filter: BoardSearchFilter;
  boards: BoardItem[];
  // 검색칸 위치(화면 기준)
  anchor: DOMRect;
  onApply: (keyword: string, filter: BoardSearchFilter) => void;
  onClose: () => void;
}) {
  const [draftKeyword, setDraftKeyword] = useState(keyword);
  const [draft, setDraft] = useState(filter);
  const [error, setError] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const change = (next: Partial<BoardSearchFilter>) =>
    setDraft((current) => ({ ...current, ...next }));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="상세 검색"
      className="fixed inset-0 z-[100]"
      onClick={onClose}
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = draftKeyword.trim();
          if (!trimmed) {
            setError(true);
            return;
          }
          onApply(trimmed, draft);
        }}
        onClick={(event) => event.stopPropagation()}
        style={{
          top: anchor.bottom + 8,
          left: `min(${anchor.left}px, calc(100vw - ${CARD_WIDTH}px - 16px))`,
        }}
        className="fixed w-[min(600px,calc(100vw-32px))] rounded-xl border border-slate-200 bg-white shadow-xl animate-pop-in"
      >
        {/* 검색어: 테두리 없는 한 줄 + 아래 구분선 */}
        <div
          className={`flex h-12 items-center gap-2.5 border-b px-4 ${error ? "border-red-300" : "border-slate-100"}`}
        >
          <Search size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
          <input
            value={draftKeyword}
            autoFocus
            maxLength={100}
            onChange={(event) => {
              setDraftKeyword(event.target.value);
              setError(false);
            }}
            placeholder={error ? "검색어를 입력해 주세요" : "검색어"}
            aria-label="검색어"
            aria-invalid={error}
            className={`min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none ${error ? "placeholder:text-red-400" : "placeholder:text-slate-400"}`}
          />
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        {/* 조건: 왼쪽 짧은 이름 + 오른쪽 가로 선택지 */}
        <div className="space-y-1 px-4 py-3">
          <FilterRow label="위치">
            <ChoiceGroup
              label="검색 위치"
              options={FIELD_CHIPS}
              value={draft.field}
              onChange={(value) => change({ field: value })}
            />
            <span className="ml-auto shrink-0 text-[11px] text-slate-400">게시글 탭에만 적용</span>
          </FilterRow>
          <FilterRow label="기간">
            <ChoiceGroup
              label="기간"
              options={PERIOD_CHIPS}
              value={draft.period}
              onChange={(value) => change({ period: value })}
            />
          </FilterRow>
          <FilterRow label="게시판">
            <CustomSelect
              label="게시판"
              compact
              className="w-56"
              value={draft.boardId ? String(draft.boardId) : ""}
              onChange={(value) => change({ boardId: value ? Number(value) : null })}
              options={boardOptions(boards)}
            />
            <div className="ml-auto shrink-0 text-sm">
              <CustomCheckbox
                label="첨부파일 있는 글만"
                text="첨부 있는 글만"
                checked={draft.fileOnly}
                onChange={() => change({ fileOnly: !draft.fileOnly })}
              />
            </div>
          </FilterRow>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
          <button
            type="button"
            onClick={() => setDraft(EMPTY_SEARCH_FILTER)}
            disabled={activeFilterCount(draft) === 0}
            className="cursor-pointer text-xs text-slate-500 transition hover:text-blue-600 disabled:cursor-default disabled:text-slate-300"
          >
            초기화
          </button>
          <button
            type="submit"
            className="h-8 cursor-pointer rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-95"
          >
            검색
          </button>
        </div>
      </form>
    </div>
  );
}

// 펼친 창 폭(오른쪽 끝을 넘지 않게 왼쪽 위치를 계산할 때 씀)
const CARD_WIDTH = 600;

// 가로로 늘어놓는 짧은 선택지 이름
const FIELD_CHIPS: ChoiceOption<SearchField>[] = [
  { value: "ALL", label: "제목+내용" },
  { value: "TITLE", label: "제목" },
  { value: "CONTENT", label: "내용" },
];
const PERIOD_CHIPS: ChoiceOption<SearchPeriod>[] = [
  { value: "ALL", label: "전체" },
  { value: "1D", label: "1일" },
  { value: "1W", label: "1주" },
  { value: "1M", label: "1개월" },
  { value: "6M", label: "6개월" },
  { value: "1Y", label: "1년" },
];

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-10 items-center gap-3">
      <span className="w-12 shrink-0 text-xs text-slate-400">{label}</span>
      {children}
    </div>
  );
}
