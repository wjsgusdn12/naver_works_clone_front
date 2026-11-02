"use client";

import { Search, X } from "lucide-react";
import { useState } from "react";

// 목록 머리줄의 글 검색칸. Enter로 검색, X로 검색 해제. 주소의 검색어가 바뀌면 key로 새로 만들어 값을 맞춤.
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
      className="flex h-9 w-64 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 transition focus-within:border-blue-500"
    >
      <Search size={15} className="shrink-0 text-slate-400" aria-hidden="true" />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={100}
        placeholder="제목·내용·글쓴이 검색"
        aria-label="글 검색"
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
      />
      {(value || keyword) && (
        <button
          type="button"
          aria-label="검색어 지우기"
          onClick={() => {
            setValue("");
            if (keyword) onSearch("");
          }}
          className="shrink-0 cursor-pointer rounded text-slate-400 transition hover:text-slate-700"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </form>
  );
}
