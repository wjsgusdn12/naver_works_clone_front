"use client";

import { MessageMemberAvatar } from "@/components/chat/message-member-avatar";
import { LoadingState } from "@/components/common/loading";
import { Tabs } from "@/components/common/tabs";
import { useMemberBadge } from "@/hooks/use-member-badge";
import type { AddressBookMember } from "@/lib/api/address-book-api";
import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

// 읽음 현황 한 사람. 직급·부서·회사는 있는 것만 보여 줌.
export type ReadStatusPerson = {
  membershipId: number;
  name: string;
  jobGrade?: string | null;
  departmentName?: string | null;
  companyName?: string | null;
};

const EMPTY_PROFILES: AddressBookMember[] = [];

// 읽음 현황 모달(메시지 읽은 멤버·게시글 필독 읽음 현황 공통).
// 높이 고정, 읽음/안 읽음 탭, 줄마다 아바타(실시간 접속·상태) · 이름 · 직급/부서 회사 · 오른쪽 읽음 표시.
// read가 null이면 불러오는 중, failed면 실패 안내. onPersonClick이 있으면 줄을 눌러 프로필을 엶.
export function ReadStatusModal({
  read,
  unread,
  failed = false,
  initialTab = "read",
  profiles = EMPTY_PROFILES,
  onPersonClick,
  onClose,
}: {
  read: ReadStatusPerson[] | null;
  unread: ReadStatusPerson[] | null;
  failed?: boolean;
  initialTab?: "read" | "unread";
  // 주소록 정보(비활성 계정 표시 등). 없으면 실시간 접속 상태만으로 그림.
  profiles?: AddressBookMember[];
  onPersonClick?: (membershipId: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"read" | "unread">(initialTab);
  const profileById = useMemo(
    () => new Map(profiles.map((member) => [member.membershipId, member])),
    [profiles],
  );
  // 본인·실시간 상태까지 반영한 아바타 배지
  const badgeOf = useMemberBadge(profileById);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (event.target === ref.current) onClose();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", key);
    };
  }, [onClose]);

  const loading = !failed && (read === null || unread === null);
  const people = (tab === "read" ? read : unread) ?? [];
  const isRead = tab === "read";
  return (
    <div ref={ref} className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* 인원수와 관계없이 모달 높이를 고정하고, 목록 영역만 스크롤 */}
      <section
        role="dialog"
        aria-modal="true"
        aria-label="읽음 현황"
        className="message-action-menu flex h-[min(680px,calc(100vh-2rem))] w-full max-w-md flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            읽음 현황
            {read && <span className="ml-1.5 text-blue-600">{read.length}</span>}
          </h2>
          <button
            type="button"
            aria-label="읽음 현황 닫기"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 active:scale-90"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <Tabs
          className="mt-5"
          items={[
            { key: "read" as const, label: "읽음", count: read?.length },
            { key: "unread" as const, label: "안 읽음", count: unread?.length },
          ]}
          value={tab}
          onChange={setTab}
          ariaLabel="읽음 여부"
        />
        <div role="tabpanel" className="mt-2 min-h-0 flex-1 overflow-y-auto p-1">
          {failed ? (
            <p className="flex h-full items-center justify-center text-sm text-slate-500">
              읽음 현황을 불러오지 못했습니다.
            </p>
          ) : loading ? (
            <LoadingState message="읽음 현황을 불러오는 중입니다..." className="h-full" />
          ) : people.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-slate-500">
              {isRead ? "아직 읽은 사람이 없습니다." : "모두 읽었습니다."}
            </p>
          ) : (
            people.map((person) => {
              const badge = badgeOf(person.membershipId);
              const row = (
                <>
                  <MessageMemberAvatar
                    name={person.name}
                    membershipId={person.membershipId}
                    presenceStatus={badge.presenceStatus}
                    statusType={badge.statusType}
                  />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-sm text-slate-900">{person.name}</b>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {person.jobGrade && <span className="text-blue-600">{person.jobGrade}</span>}
                      {person.jobGrade && person.departmentName && "/"}
                      {person.departmentName}
                      {person.companyName && <span className="ml-2">{person.companyName}</span>}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-xs ${isRead ? "text-blue-600" : "text-slate-400"}`}
                  >
                    {isRead ? "읽음" : "안 읽음"}
                  </span>
                </>
              );
              const rowClass = "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left";
              return onPersonClick ? (
                <button
                  type="button"
                  key={person.membershipId}
                  className={`${rowClass} cursor-pointer transition hover:bg-slate-50 active:bg-slate-100`}
                  onClick={() => onPersonClick(person.membershipId)}
                >
                  {row}
                </button>
              ) : (
                <div key={person.membershipId} className={rowClass}>
                  {row}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
