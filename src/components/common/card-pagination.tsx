"use client";

import { visiblePages } from "@/components/common/pagination";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

// 카드 안 목록 전용 작은 쪽 번호. 공통 Pagination보다 조금 작고, 지금 쪽은 배경 없이 포인트 파랑 굵은 글자.
// « 맨 앞 · ‹ 이전 · 번호(최대 5개) · › 다음 · » 맨 끝. 쪽 번호는 0부터, 화면에는 1부터.
const arrowClassName =
  "flex h-7 w-7 items-center justify-center rounded text-slate-400 transition enabled:cursor-pointer enabled:hover:text-blue-600 disabled:opacity-30";

export function CardPagination({
  page,
  totalPages,
  onChange,
  label = "페이지",
  className = "",
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  // 스크린 리더용 영역 이름(카드마다 구분)
  label?: string;
  className?: string;
}) {
  const first = page === 0;
  const last = page >= totalPages - 1;
  return (
    <nav
      aria-label={label}
      className={`flex items-center justify-center gap-1 text-sm ${className}`}
    >
      <button
        disabled={first}
        aria-label="첫 페이지"
        className={arrowClassName}
        onClick={() => onChange(0)}
      >
        <ChevronsLeft size={16} aria-hidden="true" />
      </button>
      <button
        disabled={first}
        aria-label="이전 페이지"
        className={arrowClassName}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
      {visiblePages(page, totalPages).map((target) => (
        <button
          // 지금 쪽 번호는 바뀔 때마다 새로 그려져 살짝 튐
          key={target === page ? `current-${target}` : target}
          aria-current={target === page ? "page" : undefined}
          className={`flex h-7 min-w-7 cursor-pointer items-center justify-center px-1 transition ${target === page ? "page-number-pop font-bold text-blue-600" : "text-slate-400 hover:text-slate-800"}`}
          onClick={() => onChange(target)}
        >
          {target + 1}
        </button>
      ))}
      <button
        disabled={last}
        aria-label="다음 페이지"
        className={arrowClassName}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
      <button
        disabled={last}
        aria-label="마지막 페이지"
        className={arrowClassName}
        onClick={() => onChange(totalPages - 1)}
      >
        <ChevronsRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}
