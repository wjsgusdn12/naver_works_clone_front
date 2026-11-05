"use client";

import { Spinner } from "@/components/common/loading";
import { useEffect, useRef, type ReactNode } from "react";

// 밑줄만 있는 입력칸 공통 선: 평소 옅은 회색, 입력 중이면 포인트 파랑
export const UNDERLINE_FIELD = "border-b border-slate-200 transition focus-within:border-blue-500";

// 밑줄형 입력(댓글·답글·댓글 수정). 한 줄로 시작해 글이 길어지면 아래로 늘어남.
// 입력칸 아래 줄 왼쪽부터 [등록] [취소] [tools(첨부 버튼 등)], 오른쪽 끝에 글자 수.
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
  canSubmit,
  submitLabel = "등록",
  attachments,
  tools,
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
  // 등록 가능 여부(없으면 글이 있을 때만). 첨부만 있어도 등록하려면 넘김.
  canSubmit?: boolean;
  submitLabel?: string;
  // 입력칸과 버튼 줄 사이(첨부 목록 등)
  attachments?: ReactNode;
  // 버튼 줄의 [등록]·[취소] 뒤(첨부 버튼 등)
  tools?: ReactNode;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const submittable = (canSubmit ?? value.trim().length > 0) && !sending;

  // 내용에 맞춰 높이 조절(최대 약 8줄, 넘치면 안에서 스크롤)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [value]);

  return (
    <form
      className={`pb-1.5 ${UNDERLINE_FIELD} ${className}`}
      onSubmit={(event) => {
        event.preventDefault();
        if (submittable) onSubmit();
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
        className="block w-full resize-none bg-transparent py-1.5 text-sm leading-5 text-slate-800 outline-none placeholder:text-slate-300"
      />
      {attachments}
      <div className="mt-1 flex items-center gap-1">
        <button
          type="submit"
          disabled={!submittable}
          className="-ml-2 flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
        >
          {sending && <Spinner size={12} />}
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-8 shrink-0 cursor-pointer rounded-md px-2 text-sm text-slate-400 transition hover:text-slate-800"
          >
            취소
          </button>
        )}
        {tools}
        {showCount && value.length > 0 && (
          <span className="ml-auto shrink-0 text-xs text-slate-300">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    </form>
  );
}
