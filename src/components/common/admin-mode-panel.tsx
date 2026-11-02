"use client";

import { useState } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { authApi } from "@/lib/api/auth-api";
import { useAuth } from "@/components/auth/auth-provider";
import { Spinner } from "@/components/common/loading";

// 관리자 모드를 켜면 쓸 수 있는 기능(안내문).
const ADMIN_FEATURES = [
  "홈 화면의 API 상태 대시보드(요청 수·오류율·응답 시간)",
  "모든 회사·부서 게시판 보기와 게시판 이름 바꾸기",
  "다른 사람의 글·댓글 정리와 휴지통 복구",
  "문의하기 답변과 새 문의 알림 받기",
  "회사 초대 코드 발급",
];

type AdminModePanelProps = {
  onToast?: (message: string) => void;
};

// 상단바 관리자 아이콘을 누르면 아래로 펼쳐지는 패널. 안내문과 켜기·끄기 버튼.
// 체험용 프로젝트라 모든 사용자가 관리자 모드로 시작하고, 여기서 직접 끌 수 있음.
export function AdminModePanel({ onToast }: AdminModePanelProps) {
  const { member, accessToken, applySession } = useAuth();
  const [saving, setSaving] = useState(false);
  const isAdmin = member?.role === "ADMIN";

  const toggle = async () => {
    if (!accessToken || saving) return;
    setSaving(true);
    try {
      await authApi.changeAdminMode(accessToken, !isAdmin);
      // 권한은 토큰에 담기므로 토큰을 새로 받아야 바뀐 권한으로 API를 부를 수 있음.
      applySession(await authApi.refresh());
      onToast?.(isAdmin ? "관리자 모드를 껐습니다." : "관리자 모드를 켰습니다.");
    } catch {
      onToast?.("관리자 모드를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      role="dialog"
      aria-label="관리자 모드"
      className="fixed right-3 top-[60px] z-[60] flex w-[340px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-xl"
    >
      <div className="flex items-center justify-between px-5 pb-2 pt-4">
        <strong className="flex items-center gap-2 text-base">
          {isAdmin ? (
            <ShieldCheck size={18} className="text-red-500" aria-hidden="true" />
          ) : (
            <ShieldOff size={18} className="text-slate-400" aria-hidden="true" />
          )}
          관리자 모드
        </strong>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${isAdmin ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"}`}
        >
          {isAdmin ? "ON" : "OFF"}
        </span>
      </div>
      <div className="px-5 pb-4 text-sm leading-6 text-slate-600">
        <p>
          체험용 프로젝트라 <b className="text-slate-900">모든 사용자가 관리자 모드로 시작</b>
          합니다. 관리자 모드에서는 아래 기능을 쓸 수 있습니다.
        </p>
        <ul className="mt-2 space-y-1">
          {ADMIN_FEATURES.map((feature) => (
            <li key={feature} className="flex gap-2">
              <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
              {feature}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          일반 사용자 화면을 보고 싶으면 관리자 모드를 끄세요. 언제든 다시 켤 수 있고, 바꾸면 바로
          적용됩니다.
        </p>
      </div>
      <div className="border-t border-slate-100 px-5 py-3">
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={saving}
          className={`flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-semibold transition active:scale-[0.98] disabled:cursor-default disabled:opacity-60 ${isAdmin ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" : "bg-blue-600 text-white hover:bg-blue-700"}`}
        >
          {saving && <Spinner size={14} />}
          {saving ? "전환 중..." : isAdmin ? "관리자 모드 끄기" : "관리자 모드 켜기"}
        </button>
      </div>
    </section>
  );
}
