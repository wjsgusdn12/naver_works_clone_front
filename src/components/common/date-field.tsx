"use client";

import { DateTimePicker } from "@/components/common/date-time-picker";
import { isInSelectList } from "@/components/common/custom-select";
import { CalendarDays } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// 프로젝트 공통 날짜 칸(날짜만). 공통 드롭다운(CustomSelect)과 같은 모양의 버튼을 누르면 아래에 달력이 펼쳐짐.
// 값은 "YYYY-MM-DD"(시간대 영향 없이 날짜만). 비어 있으면 placeholder.
const pad = (value: number) => String(value).padStart(2, "0");
export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const fromDateKey = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};
const display = (key: string) => key.replaceAll("-", ". ") + ".";

export function DateField({
  label,
  value,
  onChange,
  min,
  max,
  placeholder = "날짜 선택",
  className = "",
}: {
  // 접근성 라벨
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  min: Date;
  max: Date;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // 바깥 클릭·Esc로 닫기(달력 안 드롭다운 목록은 안쪽으로 봄)
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node) && !isInSelectList(event.target))
        setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // 달력만 닫고 이 칸을 담은 창은 그대로
      event.stopPropagation();
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex h-8 w-full cursor-pointer items-center gap-2 rounded-lg border bg-white px-2.5 text-left text-sm outline-none transition-colors ${open ? "border-slate-400" : "border-slate-200 hover:border-slate-300 focus-visible:border-slate-400"}`}
      >
        <CalendarDays size={14} aria-hidden="true" className="shrink-0 text-slate-400" />
        <span className={`truncate tabular-nums ${value ? "text-slate-900" : "text-slate-400"}`}>
          {value ? display(value) : placeholder}
        </span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={label}
          className="absolute left-0 top-full z-[120] mt-1.5 w-72 animate-pop-in rounded-xl border border-slate-200/80 bg-white p-3 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.25)]"
        >
          <DateTimePicker
            dateOnly
            // 비어 있으면 고를 수 있는 마지막 날(보통 오늘)이 있는 달부터
            value={value ? fromDateKey(value) : max}
            min={min}
            max={max}
            onChange={(date) => {
              onChange(toDateKey(date));
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
