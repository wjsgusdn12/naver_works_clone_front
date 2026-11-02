"use client";

import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

// 게시판 오른쪽 화면(홈·목록·글 보기·글쓰기) 공통 머리줄. 스크롤해도 위에 붙어 있음.
// onBack이 있으면 제목 앞에 뒤로 버튼, actions는 오른쪽 끝(글쓰기 버튼 등).
export function BoardContentHeader({
  title,
  onBack,
  actions,
}: {
  title: ReactNode;
  onBack?: () => void;
  actions?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6">
      <div className="flex min-w-0 items-center gap-1.5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="뒤로"
            className="-ml-2 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
        )}
        <h1 className="truncate text-xl font-bold text-slate-950">{title}</h1>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
