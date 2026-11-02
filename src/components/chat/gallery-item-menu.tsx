"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

export type GalleryMenuItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
};

// 사진·파일·링크 모아보기 한 줄의 ⋮ 메뉴. 화면 맨 위(body)에 띄워 패널 스크롤에 잘리지 않음.
// 바깥을 누르거나 Esc·스크롤하면 닫힘. data-gallery-menu가 붙은 곳(⋮ 버튼 포함)은 바깥으로 치지 않음.
export function GalleryItemMenu({
  position,
  items,
  onClose,
}: {
  position: { left: number; top: number };
  items: GalleryMenuItem[];
  onClose: () => void;
}) {
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!(event.target as Element).closest?.("[data-gallery-menu]")) onClose();
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
      data-gallery-menu
      role="menu"
      className="fixed z-[200] w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-in fade-in zoom-in-95"
      style={position}
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            item.onSelect();
          }}
          className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
        >
          <item.icon size={15} aria-hidden="true" />
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
