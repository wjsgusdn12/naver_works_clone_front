"use client";

import type { ReactNode } from "react";

// 접힌 사이드바의 아이콘 + 작은 이름 버튼(주소록·게시판). active면 지금 보고 있는 메뉴.
export function SidebarIcon({
  label,
  icon,
  onClick,
  active = false,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      className={`group flex w-full cursor-pointer flex-col items-center gap-1 rounded-md py-2 text-xs transition hover:bg-blue-50 hover:text-blue-600 ${active ? "bg-blue-50 text-blue-600" : "text-slate-600"}`}
      onClick={onClick}
    >
      {icon}
      <span className="text-[10px]">{label}</span>
    </button>
  );
}
