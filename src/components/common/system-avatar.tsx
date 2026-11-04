"use client";

import { Bot, ShieldCheck } from "lucide-react";

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

// 시스템 이름 오른쪽에 붙는 작은 로봇 그림(자동으로 올라간 글 표시). 글자 크기에 맞춰 size를 넘김.
export function SystemMark({ size = 14 }: { size?: number }) {
  return <Bot size={size} className="shrink-0 text-violet-600" aria-label="자동으로 올라간 글" />;
}
