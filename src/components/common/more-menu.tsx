"use client";

import { MoreVertical, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type MoreMenuItem = {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  // 삭제처럼 되돌리기 어려운 동작은 빨간 글씨, 위에 구분선
  danger?: boolean;
  disabled?: boolean;
};

const MENU_WIDTH = 144;
const ITEM_HEIGHT = 36;

// ⋮ 버튼 + 누르면 버튼 아래(오른쪽 맞춤)에 뜨는 작은 메뉴. 채팅 메시지 메뉴와 같은 모양.
// 바깥 클릭·Esc·스크롤로 닫힘. 항목이 없으면 버튼도 그리지 않음.
export function MoreMenu({
  items,
  label = "더 보기",
  size = 17,
}: {
  items: MoreMenuItem[];
  label?: string;
  size?: number;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!position) return;
    const closeOutside = (event: PointerEvent) => {
      if (
        !menuRef.current?.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      )
        setPosition(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPosition(null);
      buttonRef.current?.focus({ preventScroll: true });
    };
    const close = (event: Event) => {
      if (!menuRef.current?.contains(event.target as Node)) setPosition(null);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [position]);

  if (items.length === 0) return null;

  const toggle = () => {
    if (position) {
      setPosition(null);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const height = items.length * ITEM_HEIGHT + 16;
    const below = rect.bottom + 4;
    setPosition({
      left: Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)),
      // 아래 공간이 모자라면 버튼 위로
      top: below + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 4) : below,
    });
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={Boolean(position)}
        aria-haspopup="menu"
        onClick={toggle}
        className={`flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition hover:bg-slate-100 hover:text-slate-900 active:scale-95 ${position ? "bg-slate-100 text-slate-900" : "text-slate-400"}`}
      >
        <MoreVertical size={size} aria-hidden="true" />
      </button>
      {position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={label}
            style={{ ...position, width: MENU_WIDTH }}
            className="message-action-menu fixed z-[110] rounded-md border border-slate-200 bg-white p-1 text-sm text-slate-700 shadow-lg"
          >
            {items.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.label}>
                  {item.danger && index > 0 && <div className="my-1 border-t border-slate-100" />}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={() => {
                      setPosition(null);
                      item.onClick();
                    }}
                    className={`flex w-full cursor-pointer items-center gap-2 rounded px-3 py-2 text-left transition hover:bg-slate-100 focus-visible:bg-slate-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${item.danger ? "text-red-600" : ""}`}
                  >
                    <Icon size={15} aria-hidden="true" />
                    {item.label}
                  </button>
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
