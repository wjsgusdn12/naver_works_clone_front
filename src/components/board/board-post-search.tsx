"use client";

import { HighlightText } from "@/components/address-book/highlight-text";
import { ToggleSwitch } from "@/components/address-book/toggle-switch";
import { SearchFilterButton } from "@/components/board/board-search-filter";
import {
  loadSearchHistory,
  pushKeyword,
  saveSearchHistory,
  type BoardSearchHistory,
} from "@/lib/board-search-history";
import { Clock3, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// 상단바(화면 제목 오른쪽)의 글 검색칸. 주소록 검색칸과 같은 모양·동작.
// 누르면 최근 검색어(이 브라우저, 사용자별)가 펼쳐지고, 입력하면 그 글자가 든 최근 검색어만.
// Enter로 검색, X로 검색 해제, 오른쪽 필터 버튼은 상세 검색을 검색칸 바로 밑에 펼침.
// 주소의 검색어가 바뀌면 key로 새로 만들어 값을 맞춤.
export function BoardPostSearch({
  keyword,
  membershipId,
  filterCount,
  filterOpen,
  onSearch,
  onOpenFilter,
}: {
  keyword: string;
  membershipId: number;
  // 켜 둔 검색 필터 수(필터 버튼 색·숫자)
  filterCount: number;
  // 상세 검색 창이 열려 있음(필터 버튼·검색칸 테두리를 포인트 색으로)
  filterOpen: boolean;
  onSearch: (keyword: string) => void;
  // 검색칸 위치를 넘겨 상세 검색을 그 밑에 펼치게 함
  onOpenFilter: (anchor: DOMRect) => void;
}) {
  const [value, setValue] = useState(keyword);
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<BoardSearchHistory>(() =>
    typeof window === "undefined"
      ? { enabled: true, keywords: [] }
      : loadSearchHistory(membershipId),
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // 바깥을 누르면 접음
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const updateHistory = (next: BoardSearchHistory) => {
    setHistory(next);
    saveSearchHistory(membershipId, next);
  };

  const search = (next: string) => {
    const trimmed = next.trim();
    setValue(trimmed);
    setOpen(false);
    if (trimmed) updateHistory(pushKeyword(history, trimmed));
    onSearch(trimmed);
  };

  const typed = value.trim().toLowerCase();
  const shown = typed
    ? history.keywords.filter((item) => item.toLowerCase().includes(typed))
    : history.keywords;
  const removeKeyword = (target: string) =>
    updateHistory({ ...history, keywords: history.keywords.filter((item) => item !== target) });

  return (
    <div ref={containerRef} className="relative w-full max-w-[420px]">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          search(value);
        }}
        className={`flex h-10 w-full items-center gap-2 rounded-full bg-slate-100 pl-4 pr-1.5 text-slate-500 transition-shadow duration-200 ${open || filterOpen ? "ring-2 ring-blue-500" : "focus-within:ring-2 focus-within:ring-blue-500"}`}
      >
        <Search size={16} className="shrink-0" aria-hidden="true" />
        <input
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
          maxLength={100}
          placeholder="제목·내용·글쓴이 검색"
          aria-label="글 검색"
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        {(value || keyword) && (
          <button
            type="button"
            aria-label="검색어 지우기"
            onClick={() => {
              setValue("");
              if (keyword) onSearch("");
            }}
            className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-400 text-white transition hover:scale-110 hover:bg-slate-500 active:scale-90"
          >
            <X size={12} aria-hidden="true" />
          </button>
        )}
        <span className="h-4 w-px shrink-0 bg-slate-300" aria-hidden="true" />
        <SearchFilterButton
          count={filterCount}
          open={filterOpen}
          onClick={() => {
            setOpen(false);
            const anchor = containerRef.current?.getBoundingClientRect();
            if (anchor) onOpenFilter(anchor);
          }}
        />
      </form>
      {open && (typed === "" || shown.length > 0) && (
        <div className="absolute left-0 right-0 top-11 z-[80] overflow-hidden rounded-md bg-white text-sm text-slate-600 shadow-lg ring-1 ring-slate-200">
          <div className="max-h-[300px] overflow-y-auto">
            {history.enabled && shown.length > 0 ? (
              shown.map((item) => (
                <div
                  key={item}
                  className="group flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <Clock3 size={16} className="shrink-0 text-slate-500" aria-hidden="true" />
                  <button
                    type="button"
                    className="min-w-0 flex-1 cursor-pointer truncate text-left font-medium text-slate-800"
                    onClick={() => search(item)}
                  >
                    {typed ? <HighlightText value={item} keyword={value.trim()} /> : item}
                  </button>
                  <button
                    type="button"
                    aria-label={`${item} 최근 검색어 삭제`}
                    className="invisible flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 focus:visible group-hover:visible"
                    onClick={() => removeKeyword(item)}
                  >
                    <X size={13} aria-hidden="true" />
                  </button>
                </div>
              ))
            ) : (
              <p className="px-4 py-5">
                {history.enabled ? "최근 검색어가 없습니다." : "검색어 저장 기능이 꺼져있습니다."}
              </p>
            )}
          </div>
          {typed === "" && (
            <div className="flex h-9 items-center justify-between border-t border-slate-100 px-3 text-xs">
              {history.enabled && history.keywords.length > 0 ? (
                <button
                  type="button"
                  className="cursor-pointer transition hover:text-blue-600"
                  onClick={() => updateHistory({ ...history, keywords: [] })}
                >
                  전체 삭제
                </button>
              ) : (
                <span />
              )}
              <span className="flex items-center gap-2">
                검색어 저장
                <ToggleSwitch
                  label="검색어 저장"
                  enabled={history.enabled}
                  onToggle={() => updateHistory({ ...history, enabled: !history.enabled })}
                />
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
