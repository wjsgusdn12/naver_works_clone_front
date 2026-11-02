"use client";

import { Search, X } from "lucide-react";
import { useState } from "react";

// 상단바(화면 제목 오른쪽)의 글 검색칸. 주소록 검색칸과 같은 모양.
// Enter로 검색, X로 검색 해제. 주소의 검색어가 바뀌면 key로 새로 만들어 값을 맞춤.
export function BoardPostSearch({
  keyword,
  onSearch,
}: {
  keyword: string;
  onSearch: (keyword: string) => void;
}) {
  const [value, setValue] = useState(keyword);
  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(value.trim());
      }}
      className="flex h-10 w-full max-w-[420px] items-center gap-2 rounded-full bg-slate-100 px-4 text-slate-500 transition-shadow duration-200 focus-within:ring-2 focus-within:ring-blue-500"
    >
      <Search size={16} className="shrink-0" aria-hidden="true" />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
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
    </form>
  );
}
