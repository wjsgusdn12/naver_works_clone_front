"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

// 프로젝트 공통 드롭다운(모든 선택 칸은 이것만 씀). 브라우저 기본 select 대신 버튼 + 목록으로 그림.
// 목록은 화면 맨 위층(body)에 띄워, 스크롤 상자·작은 창 안에 있어도 잘리지 않음.
// 아래 공간이 모자라면 위로 펼침.
// 값이 ""인 항목은 "선택 안 함"처럼 비우는 용도로 씀.
// group: 같은 값이 이어지는 항목 위에 머리글 한 줄(목록에서는 이름만 들여 씀).
// selectedLabel: 고른 뒤 버튼에 보일 글자(없으면 label). 머리글 없이도 뜻이 통하게 할 때 씀.
export type SelectOption = { value: string; label: string; group?: string; selectedLabel?: string };

type CustomSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  // 접근성 라벨. 보이는 라벨이 따로 있으면 그 글자를 넘김.
  label: string;
  className?: string;
  // 목록 도구 줄처럼 좁은 곳에 쓰는 작은 크기(높이 32px)
  compact?: boolean;
  // ghost: 테두리 없이 글자 + 작은 화살표만(보기 설정처럼 가벼운 선택). 목록은 글자 길이에 맞춰 오른쪽 정렬.
  variant?: "default" | "ghost";
};

// 띄운 목록 표시. 바깥 클릭·Esc·스크롤로 닫히는 다른 창은 이 목록을 "자기 안"으로 봐야 함(목록은 body에 떠 있어서).
const LIST_ATTR = "data-select-list";
export const isInSelectList = (target: EventTarget | null) =>
  target instanceof Element && target.closest(`[${LIST_ATTR}]`) !== null;
export const isSelectListOpen = () => document.querySelector(`[${LIST_ATTR}]`) !== null;

// 목록 최대 높이와 버튼과의 간격(px)
const LIST_MAX_HEIGHT = 280;
const GAP = 6;

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "선택",
  disabled = false,
  label,
  className = "",
  compact = false,
  variant = "default",
}: CustomSelectProps) {
  const ghost = variant === "ghost";
  const [open, setOpen] = useState(false);
  // 키보드로 훑는 항목 위치.
  const [highlight, setHighlight] = useState(0);
  // 목록 위치(화면 기준). 열 때와 스크롤·크기 변경 때 다시 잼.
  const [position, setPosition] = useState<CSSProperties | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value) ?? null;

  const place = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom - GAP - 8;
    const above = rect.top - GAP - 8;
    // 아래가 모자라고 위가 더 넓으면 위로
    const up = below < Math.min(LIST_MAX_HEIGHT, 160) && above > below;
    const maxHeight = Math.min(LIST_MAX_HEIGHT, up ? above : below);
    setPosition({
      position: "fixed",
      maxHeight,
      ...(up ? { bottom: window.innerHeight - rect.top + GAP } : { top: rect.bottom + GAP }),
      ...(ghost
        ? { right: window.innerWidth - rect.right, minWidth: rect.width }
        : { left: rect.left, width: rect.width }),
    });
  }, [ghost]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  // 바깥 클릭·Esc로 닫기, 스크롤·크기 변경 때 위치 다시 잼.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !listRef.current?.contains(target)) setOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        // 드롭다운만 닫고, 이 드롭다운을 담은 창까지 닫히지 않게 함
        event.stopPropagation();
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    // 목록 자신의 스크롤은 위치와 무관
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && listRef.current?.contains(event.target)) return;
      place();
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  // 키보드로 훑는 항목이 목록 밖이면 보이게 스크롤
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${highlight}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, highlight]);

  const openList = () => {
    if (disabled) return;
    setHighlight(
      Math.max(
        0,
        options.findIndex((option) => option.value === value),
      ),
    );
    setOpen(true);
  };

  const choose = (option: SelectOption) => {
    onChange(option.value);
    setOpen(false);
  };

  const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openList();
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((index) => (index + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((index) => (index - 1 + options.length) % options.length);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (options[highlight]) choose(options[highlight]);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${ghost ? "inline-block" : ""} ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onButtonKeyDown}
        className={
          ghost
            ? `flex h-8 cursor-pointer items-center gap-1 rounded-md px-2 text-left text-sm outline-none transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 disabled:cursor-not-allowed ${open ? "bg-slate-100 text-slate-900" : "text-slate-600"}`
            : `group flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border bg-white text-left text-sm outline-none transition-colors disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${compact ? "h-8 px-2.5" : "h-12 px-3.5"} ${open ? "border-slate-400" : "border-slate-200 hover:border-slate-300 focus-visible:border-slate-400"}`
        }
      >
        <span className={`truncate ${ghost ? "" : selected ? "text-slate-900" : "text-slate-400"}`}>
          {selected ? (selected.selectedLabel ?? selected.label) : placeholder}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={2.25}
          aria-hidden="true"
          className={`shrink-0 transition-transform duration-150 ${open ? "rotate-180 text-slate-700" : "text-slate-400"}`}
        />
      </button>
      {open &&
        position &&
        createPortal(
          <ul
            ref={listRef}
            data-select-list=""
            id={listId}
            role="listbox"
            aria-label={label}
            style={position}
            className="z-[200] w-max overflow-y-auto rounded-xl border border-slate-200/80 bg-white p-1 text-sm shadow-[0_10px_30px_-10px_rgba(15,23,42,0.25)] animate-pop-in"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const header =
                option.group && option.group !== options[index - 1]?.group ? option.group : null;
              return (
                <Fragment key={option.value || "__empty"}>
                  {header && (
                    <li
                      role="presentation"
                      className={`px-2.5 pb-1 pt-2 text-[11px] font-medium text-slate-400 ${index > 0 ? "mt-1 border-t border-slate-100" : ""}`}
                    >
                      {header}
                    </li>
                  )}
                  <li
                    role="option"
                    data-index={index}
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlight(index)}
                    // 누르는 순간 버튼의 포커스가 빠지지 않게
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(option)}
                    className={`flex h-8 cursor-pointer items-center justify-between gap-3 rounded-md pr-2 ${option.group ? "pl-4" : "pl-2.5"} ${index === highlight ? "bg-slate-100" : ""} ${isSelected ? "font-medium text-blue-600" : option.value === "" ? "text-slate-500" : "text-slate-700"}`}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && (
                      <Check size={14} strokeWidth={2.5} aria-hidden="true" className="shrink-0" />
                    )}
                  </li>
                </Fragment>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}
