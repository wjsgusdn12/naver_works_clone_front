"use client";

import { Check, type LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

export type ActionMenuItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  // 지금 고른 항목(종류 고르기 메뉴 등)이면 파란 글씨 + 체크
  active?: boolean;
};

// 목록 한 줄의 ⋮ 메뉴(모아보기 사진·파일·링크, 그룹 멤버 등 공용). 화면 맨 위(body)에 띄워 스크롤에 잘리지 않음.
// 바깥을 누르거나 Esc·스크롤하면 닫힘. data-item-menu가 붙은 곳(⋮ 버튼 포함)은 바깥으로 치지 않음.
export function ItemActionMenu({
  position,
  items,
  onClose,
}: {
  position: { left: number; top: number };
  items: ActionMenuItem[];
  onClose: () => void;
}) {
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!(event.target as Element).closest?.("[data-item-menu]")) onClose();
    };
    const closeByEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeByEscape);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeByEscape);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  return createPortal(
    <div
      data-item-menu
      role="menu"
      className="fixed z-[200] w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-in fade-in zoom-in-95"
      style={position}
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role={item.active === undefined ? "menuitem" : "menuitemradio"}
          aria-checked={item.active}
          onClick={() => {
            onClose();
            item.onSelect();
          }}
          className={`flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-slate-50 ${item.active ? "font-semibold text-blue-600" : "text-slate-700"}`}
        >
          <item.icon size={15} aria-hidden="true" />
          <span className="flex-1">{item.label}</span>
          {item.active && <Check size={15} aria-hidden="true" />}
        </button>
      ))}
    </div>,
    document.body,
  );
}
