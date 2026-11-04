"use client";

import type { ReactNode } from "react";

// 프로젝트 공통 "여러 개 중 하나 고르기"(가로 선택지). 옅은 회색 판 위에서 고른 칸만 흰색으로 살짝 떠오름.
// 진한 파랑 알약·파란 테두리 대신 무채색 + 그림자 한 겹으로 가볍게. 칸이 많으면 줄을 바꿈.
// 드롭다운은 CustomSelect, 세로 목록에서 하나 고르기는 RadioControl을 씀.
export type ChoiceOption<T extends string> = { value: T; label: ReactNode; ariaLabel?: string };

export function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
  className = "",
}: {
  // 접근성 라벨
  label: string;
  options: ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-lg bg-slate-100/80 p-0.5 ${className}`}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.ariaLabel}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`flex h-7 cursor-pointer items-center gap-1 whitespace-nowrap rounded-md px-2.5 text-[13px] transition-[color,background-color,box-shadow] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-default ${selected ? "bg-white font-medium text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08),0_0_0_1px_rgba(15,23,42,0.04)]" : "text-slate-500 hover:text-slate-900"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
