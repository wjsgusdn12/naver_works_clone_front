"use client";

import { ShieldCheck } from "lucide-react";

// 시스템(서버가 자동으로 올린 글·알림)의 아바타. 사람 아바타(UserAvatar md, 40px)와 같은 크기,
// 알림 패널의 "시스템 알림" 아이콘과 같은 색·모양. 접속 상태 점은 없음.
export function SystemAvatar() {
  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600"
    >
      <ShieldCheck size={18} />
    </span>
  );
}
