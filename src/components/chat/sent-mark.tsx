import { Forward } from "lucide-react";

// 대화 미리보기 앞 "내가 보낸 메시지" 화살표. 메시지 방 목록·홈 최근 대화 공통.
export function SentMark({ size = 15, className = "" }: { size?: number; className?: string }) {
  return (
    <Forward
      aria-label="내가 보낸 메시지"
      className={`shrink-0 text-slate-600 ${className}`}
      size={size}
      strokeWidth={3}
    />
  );
}
