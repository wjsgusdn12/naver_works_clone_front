"use client";

import { useState } from "react";
import { ShieldCheck, X } from "lucide-react";

// 홈 상단바 바로 아래 한 줄 안내(관리자 모드 ON일 때만). 화면 폭 전체, 오른쪽 끝 X로 닫음.
// 닫아도 기억하지 않아 홈에 들어올 때마다 다시 보임(관리자 모드 소개용).
export function AdminModeBanner({ visible }: { visible: boolean }) {
  const [closed, setClosed] = useState(false);
  if (!visible || closed) return null;
  return (
    <div
      role="status"
      className="flex shrink-0 items-center gap-3 border-b border-amber-200 bg-gradient-to-r from-amber-50 via-rose-50 to-violet-50 px-4 py-2.5 text-sm text-slate-700"
    >
      <ShieldCheck size={18} className="shrink-0 text-rose-500" aria-hidden="true" />
      <p className="min-w-0 flex-1 truncate">
        <b className="text-rose-600">관리자 모드가 켜져 있습니다.</b> API 상태 대시보드, 모든
        회사·부서 게시판 관리, 다른 사람 글·댓글 정리, 문의 답변, 초대 코드 발급을 쓸 수 있습니다.
        상단바의 방패 아이콘에서 끌 수 있습니다.
      </p>
      <button
        type="button"
        onClick={() => setClosed(true)}
        aria-label="관리자 모드 안내 닫기"
        className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-white/70 hover:text-slate-700"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
