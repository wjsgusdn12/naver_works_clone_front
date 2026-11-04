"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useChatNotification } from "@/components/chat/chat-notification-provider";
import { isInSelectList, isSelectListOpen } from "@/components/common/custom-select";
import { LoadingInline } from "@/components/common/loading";
import { StatusSetting } from "@/components/common/status-setting";
import { addressBookApi, type MemberStatus } from "@/lib/api/address-book-api";
import {
  formatMemberStatus,
  memberStatusOption,
  type MemberStatusType,
} from "@/lib/status-options";

// 내 상태(바쁨·자리 비움 등) 보기·바꾸기. 줄을 누르면 바로 아래에 상태 목록 창이 뜸.
// 프로필 패널·홈 인사말 카드 공통. 창은 화면 기준(fixed)으로 띄워 스크롤 영역에 잘리지 않고,
// 바깥 클릭·Esc·스크롤하면 닫힘(Esc는 바깥 패널까지 닫지 않게 여기서 멈춤).
export function MyStatusPicker({
  accessToken,
  membershipId,
  onToast,
  onStatusChange,
  className = "",
}: {
  accessToken: string;
  membershipId: number;
  onToast?: (message: string) => void;
  // 내 상태를 알게 되면 알림(상단바 아바타 배지 맞추기 등)
  onStatusChange?: (statusType: MemberStatusType | null) => void;
  className?: string;
}) {
  const { memberStatusByMembershipId } = useChatNotification();
  const [savedStatus, setSavedStatus] = useState<MemberStatus | null>(null);
  const [saving, setSaving] = useState(false);
  // 창을 띄울 화면 위치. null이면 닫힘.
  const [anchor, setAnchor] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 내 상태는 서버에서 한 번 읽고, 이후 WebSocket 이벤트(다른 탭에서 바꾼 경우 등)로 갱신.
  const liveStatus = memberStatusByMembershipId[membershipId];
  useEffect(() => {
    let cancelled = false;
    addressBookApi
      .myStatus(accessToken)
      .then((result) => {
        if (!cancelled) setSavedStatus(result);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [accessToken, membershipId]);
  // 실시간 이벤트가 있으면 그것이 최신. 없으면 서버에서 읽은 값.
  const myStatus = liveStatus ?? savedStatus;
  const statusType = myStatus?.statusType ?? null;
  const statusUntil = myStatus?.statusUntil ?? null;
  useEffect(() => {
    onStatusChange?.(statusType);
  }, [onStatusChange, statusType]);

  useEffect(() => {
    if (!anchor) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current?.contains(target) ||
        buttonRef.current?.contains(target) ||
        isInSelectList(target)
      )
        return;
      setAnchor(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      // 안쪽 드롭다운이 열려 있으면 Esc는 그 목록만 닫음
      if (event.key !== "Escape" || isSelectListOpen()) return;
      event.stopImmediatePropagation();
      setAnchor(null);
    };
    // 창 밖이 스크롤되면 떠 있는 위치가 어긋나므로 닫음(창 안 스크롤은 유지).
    const onScroll = (event: Event) => {
      if (!dropdownRef.current?.contains(event.target as Node) && !isInSelectList(event.target))
        setAnchor(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    // 상단바의 Esc 처리보다 먼저 받도록 캡처 단계에서 등록.
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [anchor]);

  const toggle = () => {
    if (anchor) {
      setAnchor(null);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setAnchor({ top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 280) });
  };

  const save = async (nextType: MemberStatusType | null, until: Date | null) => {
    setSaving(true);
    try {
      const next = await addressBookApi.updateStatus(
        accessToken,
        nextType,
        until ? until.toISOString() : undefined,
      );
      setSavedStatus(next);
      setAnchor(null);
      const text = formatMemberStatus(next.statusType, next.statusUntil);
      onToast?.(text ? `상태를 '${text}'(으)로 설정했습니다.` : "상태 설정을 해제했습니다.");
    } catch (error) {
      onToast?.(error instanceof Error ? error.message : "상태를 바꾸지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const currentOption = memberStatusOption(statusType);
  const CurrentIcon = currentOption?.icon;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={anchor !== null}
        disabled={myStatus === null || myStatus === undefined}
        onClick={toggle}
        // 공통 드롭다운(CustomSelect)과 같은 버튼 모양
        className={`flex h-9 min-w-0 cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 text-left text-sm outline-none transition-colors disabled:cursor-default disabled:bg-slate-50 ${anchor ? "border-slate-400" : "border-slate-200 hover:border-slate-300 focus-visible:border-slate-400"} ${className}`}
      >
        {currentOption && CurrentIcon ? (
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${currentOption.className}`}
          >
            <CurrentIcon size={12} strokeWidth={3} aria-hidden="true" />
          </span>
        ) : (
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
        )}
        <span className="min-w-0 flex-1 truncate text-slate-900">
          {myStatus === null || myStatus === undefined ? (
            <LoadingInline message="상태를 불러오는 중" size={12} />
          ) : (
            (formatMemberStatus(statusType, statusUntil) ?? "설정 안 함")
          )}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={2.25}
          aria-hidden="true"
          className={`shrink-0 transition-transform duration-150 ${anchor ? "rotate-180 text-slate-700" : "text-slate-400"}`}
        />
      </button>
      {anchor && (
        <div
          ref={dropdownRef}
          role="dialog"
          aria-label="상태 설정"
          style={{
            top: anchor.top,
            left: anchor.left,
            width: anchor.width,
            maxHeight: `calc(100vh - ${anchor.top + 16}px)`,
          }}
          // 공통 드롭다운 목록과 같은 카드(둥근 모서리·옅은 테두리·부드러운 그림자)
          className="fixed z-[70] animate-pop-in overflow-y-auto rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.25)]"
        >
          <StatusSetting
            // 저장 후 바뀐 값으로 목록을 새로 그림.
            key={`${statusType}-${statusUntil}`}
            statusType={statusType}
            statusUntil={statusUntil}
            saving={saving}
            onSave={(nextType, until) => void save(nextType, until)}
          />
        </div>
      )}
    </>
  );
}
