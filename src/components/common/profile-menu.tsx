"use client";

import {
  ArrowLeftRight,
  Check,
  ChevronRight,
  Copy,
  KeyRound,
  LogOut,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useChatNotification } from "@/components/chat/chat-notification-provider";
import { CompanyMoveDialog } from "@/components/common/company-move-dialog";
import { RecoveryCodeDialog } from "@/components/common/recovery-code-dialog";
import { MyStatusPicker } from "@/components/common/my-status-picker";
import { ProfileImageEditor } from "@/components/common/profile-image-editor";
import { authApi, type InviteCodeResponse } from "@/lib/api/auth-api";
import type { MemberStatusType } from "@/lib/status-options";

// 상단바 프로필 아이콘 아래 열리는 내 프로필 패널. 알림 패널과 같은 폭·위치, 꾸밈 없이 정보와 메뉴만.
// 대화상자(복구 코드·회사 옮기기·초대 코드)는 패널 왼쪽에 붙어 열리고, 닫으면 패널이 그대로 남음.
type ProfileMenuProps = {
  open: boolean;
  onLogout: () => void;
  onToast?: (message: string) => void;
  // 세션 남은 시간 "HH:MM:SS". 없으면 줄 자체를 숨김.
  sessionRemainingText: string | null;
  // 내 상태 설정을 알게 되면 상단바 아바타 배지도 맞추도록 알림.
  onStatusChange: (statusType: MemberStatusType | null) => void;
};

type MenuRow = { label: string; description: string; icon: LucideIcon; onClick: () => void };

export function ProfileMenu({
  open,
  onLogout,
  onToast,
  sessionRemainingText,
  onStatusChange,
}: ProfileMenuProps) {
  const { member, accessToken, applySession } = useAuth();
  const { memberStatusByMembershipId } = useChatNotification();
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<InviteCodeResponse | null>(null);
  const [isCompanyMoveOpen, setIsCompanyMoveOpen] = useState(false);
  const [copiedLoginId, setCopiedLoginId] = useState(false);

  const membershipId = member?.membershipId;
  // 내 상태(아바타 배지용). 로그인 때 서버에서 읽은 값과 WebSocket 이벤트로 갱신된 값.
  const statusType =
    membershipId === undefined
      ? null
      : (memberStatusByMembershipId[membershipId]?.statusType ?? null);
  useEffect(() => {
    onStatusChange(statusType);
  }, [onStatusChange, statusType]);

  if (!member || !accessToken) return null;

  const toast = (message: string) => onToast?.(message);
  const isAdmin = member.role === "ADMIN";

  // 복구 코드는 해시만 저장돼 다시 볼 수 없으므로 "보기"가 곧 재발급.
  const regenerateRecoveryCode = async () => {
    try {
      setRecoveryCode((await authApi.regenerateRecoveryCode(accessToken)).recoveryCode);
    } catch (error) {
      toast(error instanceof Error ? error.message : "복구 코드를 발급하지 못했습니다.");
    }
  };

  const loadInviteCode = async (regenerate: boolean) => {
    try {
      setInviteCode(await authApi.companyInviteCode(accessToken, regenerate));
    } catch (error) {
      toast(error instanceof Error ? error.message : "초대 코드를 불러오지 못했습니다.");
    }
  };

  const copyLoginId = async () => {
    try {
      await navigator.clipboard.writeText(member.loginId);
      setCopiedLoginId(true);
      window.setTimeout(() => setCopiedLoginId(false), 1500);
    } catch {
      toast("아이디를 복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해 주세요.");
    }
  };

  const rows: MenuRow[] = [
    {
      label: "복구 코드 재발급",
      description: "비밀번호를 잊었을 때 쓰는 코드를 새로 발급",
      icon: KeyRound,
      onClick: () => void regenerateRecoveryCode(),
    },
    {
      label: "회사 옮기기",
      description: "새 회사 만들기 · 초대 코드 참여 · 체험 회사",
      icon: ArrowLeftRight,
      onClick: () => setIsCompanyMoveOpen(true),
    },
    ...(isAdmin
      ? [
          {
            label: "회사 초대 코드",
            description: "구성원을 초대하는 코드 보기 · 재발급",
            icon: Ticket,
            onClick: () => void loadInviteCode(false),
          },
        ]
      : []),
  ];

  return (
    <>
      {open && (
        <section
          role="menu"
          aria-label="내 프로필"
          className="fixed right-3 top-[60px] z-[60] flex max-h-[calc(100vh-76px)] w-[400px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-2xl"
        >
          {/* 상단: 아바타(카메라 버튼으로 사진 변경) + 이름·역할·소속 */}
          <div className="flex items-center gap-4 px-5 pb-4 pt-5">
            <ProfileImageEditor statusType={statusType} onToast={toast} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <strong className="truncate text-base text-slate-900">{member.displayName}</strong>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {isAdmin ? "관리자" : "일반 사용자"}
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm text-slate-500">{member.companyName}</p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {/* 상태 설정. 줄을 누르면 바로 아래에 드롭다운 창이 떠서 목록을 보여 줌. */}
            <div className="mx-5 flex items-center gap-3 border-t border-slate-100 py-3">
              <span className="w-12 shrink-0 text-xs text-slate-400">상태</span>
              <MyStatusPicker
                accessToken={accessToken}
                membershipId={member.membershipId}
                onToast={toast}
                className="flex-1"
              />
            </div>

            {/* 아이디·이메일·세션. 아이디는 한 번에 복사. */}
            <dl className="mx-5 grid gap-1.5 border-y border-slate-100 py-3 text-sm">
              <div className="flex items-center gap-3">
                <dt className="w-12 shrink-0 text-xs text-slate-400">아이디</dt>
                <dd className="flex min-w-0 flex-1 items-center gap-1">
                  <span className="truncate text-slate-800">{member.loginId}</span>
                  <button
                    type="button"
                    aria-label="아이디 복사"
                    onClick={() => void copyLoginId()}
                    className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    {copiedLoginId ? (
                      <Check size={13} aria-hidden="true" className="text-emerald-600" />
                    ) : (
                      <Copy size={13} aria-hidden="true" />
                    )}
                  </button>
                </dd>
              </div>
              <div className="flex items-center gap-3">
                <dt className="w-12 shrink-0 text-xs text-slate-400">이메일</dt>
                <dd className={`truncate ${member.email ? "text-slate-800" : "text-slate-400"}`}>
                  {member.email ?? "미등록"}
                </dd>
              </div>
              {sessionRemainingText && (
                <div className="flex items-center gap-3">
                  <dt className="w-12 shrink-0 text-xs text-slate-400">세션</dt>
                  <dd className="font-mono text-slate-600">{sessionRemainingText}</dd>
                </div>
              )}
            </dl>

            {/* 계정 관리 */}
            <div className="px-2 py-2">
              {rows.map(({ label, description, icon: Icon, onClick }) => (
                <button
                  key={label}
                  type="button"
                  role="menuitem"
                  onClick={onClick}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  <Icon size={18} aria-hidden="true" className="shrink-0 text-slate-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900">{label}</span>
                    <span className="block truncate text-xs text-slate-500">{description}</span>
                  </span>
                  <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-slate-300" />
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 px-2 py-2">
            <button
              type="button"
              role="menuitem"
              onClick={onLogout}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <LogOut size={18} aria-hidden="true" className="shrink-0" />
              로그아웃
            </button>
          </div>
        </section>
      )}

      {isCompanyMoveOpen && (
        <CompanyMoveDialog
          accessToken={accessToken}
          currentCompanyName={member.companyName}
          onMoved={(session) => {
            setIsCompanyMoveOpen(false);
            applySession(session);
            toast(`${session.member.companyName} 소속으로 옮겼습니다.`);
          }}
          onToast={toast}
          onClose={() => setIsCompanyMoveOpen(false)}
          placement="beside-profile"
        />
      )}
      {recoveryCode && (
        <RecoveryCodeDialog
          code={recoveryCode}
          title="새 복구 코드"
          description="비밀번호를 잊었을 때 쓰는 복구 코드입니다. 이전 코드는 더 이상 쓸 수 없습니다."
          confirmLabel="확인"
          onClose={() => setRecoveryCode(null)}
          placement="beside-profile"
        />
      )}
      {inviteCode && (
        <RecoveryCodeDialog
          code={inviteCode.inviteCode}
          title={`${inviteCode.companyName} 초대 코드`}
          description="가입 화면에서 '초대 코드로 참여'를 고르고 이 코드를 입력하면 우리 회사 구성원이 됩니다."
          note="새로 발급하면 이전 코드는 즉시 쓸 수 없게 됩니다."
          confirmLabel="닫기"
          onRegenerate={() => void loadInviteCode(true)}
          onClose={() => setInviteCode(null)}
          placement="beside-profile"
        />
      )}
    </>
  );
}
