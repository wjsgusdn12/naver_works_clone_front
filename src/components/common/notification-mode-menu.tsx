"use client";

import { useChatNotification } from "@/components/chat/chat-notification-provider";
import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MODES = [
  ["ALL", "모든 메시지"],
  ["MENTION", "내가 멘션된 메시지만"],
  ["NONE", "받지 않기"],
] as const;

// 메시지 알림 수신 범위(전체·멘션만·끔) 설정 버튼 + 드롭다운. 상단바 알림 패널·홈 알림 영역 공통.
// 종 오른쪽 위 점: 파랑(전체)·주황(멘션만)·회색(끔). 바깥 클릭·Esc로 닫힘.
export function NotificationModeMenu() {
  const { notificationEnabled, notificationMode, setNotificationMode } = useChatNotification();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="알림 설정"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition hover:bg-slate-100 ${notificationEnabled ? "text-slate-700" : "text-slate-400"}`}
      >
        <Bell size={18} aria-hidden="true" />
        <span
          className={`absolute right-1 top-1 h-1.5 w-1.5 rounded-full ${notificationMode === "ALL" ? "bg-blue-500" : notificationMode === "MENTION" ? "bg-amber-500" : "bg-slate-300"}`}
        />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-10 w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold text-slate-400">
            메시지 알림 받기
          </p>
          {MODES.map(([mode, modeLabel]) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setNotificationMode(mode);
                setOpen(false);
              }}
              className={`w-full cursor-pointer rounded-md px-3 py-2 text-left text-xs transition hover:bg-slate-50 ${notificationMode === mode ? "bg-blue-50 font-semibold text-blue-600" : "text-slate-700"}`}
            >
              {modeLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
