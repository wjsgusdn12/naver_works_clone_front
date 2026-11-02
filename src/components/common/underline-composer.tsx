"use client";

import { Spinner } from "@/components/common/loading";
import { useEffect, useRef } from "react";

// 밑줄만 있는 입력칸 공통 선: 평소 옅은 회색, 입력 중이면 포인트 파랑
export const UNDERLINE_FIELD = "border-b border-slate-200 transition focus-within:border-blue-500";

// 밑줄형 한 줄 입력 + 오른쪽 등록 버튼(댓글·답글). 한 줄로 시작해 글이 길어지면 아래로 늘어남.
export function UnderlineComposer({
  value,
  onChange,
  onSubmit,
  placeholder,
  label,
  sending = false,
  maxLength = 1000,
  showCount = false,
  autoFocus = false,
  onCancel,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  label: string;
  sending?: boolean;
  maxLength?: number;
  // 입력 중일 때 글자 수(n/최대) 표시
  showCount?: boolean;
  autoFocus?: boolean;
  // 있으면 취소 버튼을 보여 주고 Esc 로도 닫음
  onCancel?: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // 내용에 맞춰 높이 조절(최대 약 8줄, 넘치면 안에서 스크롤)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [value]);

  return (
    <form
      className={`flex items-end gap-2 pb-1.5 ${UNDERLINE_FIELD} ${className}`}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && onCancel) onCancel();
        }}
        maxLength={maxLength}
        rows={1}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={label}
        className="block min-w-0 flex-1 resize-none bg-transparent py-1.5 text-sm leading-5 text-slate-800 outline-none placeholder:text-slate-300"
      />
      {showCount && value.length > 0 && (
        <span className="flex h-8 shrink-0 items-center text-xs text-slate-300">
          {value.length}/{maxLength}
        </span>
      )}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="h-8 shrink-0 cursor-pointer rounded-md px-2 text-sm text-slate-400 transition hover:text-slate-800"
        >
          취소
        </button>
      )}
      <button
        type="submit"
        disabled={!value.trim() || sending}
        className="flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-md px-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
      >
        {sending && <Spinner size={12} />}
        등록
      </button>
    </form>
  );
}
