"use client";

import { GroupAvatar } from "@/components/chat/group-avatar";
import { MessageDialogShell } from "@/components/chat/message-change-dialog";
import { MessageMemberAvatar } from "@/components/chat/message-member-avatar";
import { useChatNotification } from "@/components/chat/chat-notification-provider";
import { ItemActionMenu } from "@/components/common/item-action-menu";
import { LoadingState, Spinner } from "@/components/common/loading";
import { MeBadge } from "@/components/common/me-badge";
import type { AddressBookMember } from "@/lib/api/address-book-api";
import { chatApi, type ChatMemberProfile, type ChatRoom } from "@/lib/api/chat-api";
import { ChevronDown, Crown, MoreVertical, UserMinus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function GroupRoomDetail({
  room,
  accessToken,
  currentMemberId,
  members,
  membersLoaded = true,
  onClose,
  onAction,
  onReloadMessages,
  onProfileClick,
  showToast,
}: {
  room: ChatRoom;
  accessToken: string;
  currentMemberId: number;
  members: AddressBookMember[];
  // 회사 구성원 목록을 받아 왔는지. 받기 전에는 초대 목록 자리에 로딩 표시.
  membersLoaded?: boolean;
  onClose: () => void;
  onAction: (
    action: "leave" | "invite" | "remove" | "owner" | "rename",
    targetId?: number,
    name?: string,
  ) => Promise<void>;
  onReloadMessages: () => Promise<void>;
  onProfileClick: (membershipId: number) => void;
  showToast: (message: string) => void;
}) {
  // 본인 아바타 배지에 쓰는 내 상태 설정.
  const { myStatusType } = useChatNotification();
  const [name, setName] = useState(room.name ?? "");
  const [inviteId, setInviteId] = useState<number | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [participants, setParticipants] = useState<ChatMemberProfile[]>([]);
  // 참여자 조회 결과. 받기 전에는 로딩 표시, 실패하면 안내 문구(로딩이 끝없이 돌지 않게).
  const [participantsState, setParticipantsState] = useState<"loading" | "loaded" | "failed">(
    "loading",
  );
  const inviteRef = useRef<HTMLDivElement>(null);
  // 멤버 ⋮ 메뉴(방장 위임·내보내기)와 그 확인 모달
  const [memberMenu, setMemberMenu] = useState<{
    member: ChatMemberProfile;
    position: { left: number; top: number };
  } | null>(null);
  const [memberConfirm, setMemberConfirm] = useState<{
    action: "owner" | "remove";
    member: ChatMemberProfile;
  } | null>(null);
  const closeMemberMenu = useCallback(() => setMemberMenu(null), []);
  const owner = room.ownerMembershipId === currentMemberId;
  // 전체 회사 구성원 중 현재 방에 없는 사람만 초대 후보로 제공. 참여자를 받기 전에는 후보를 보이지 않음.
  const inviteCandidates =
    participantsState === "loaded"
      ? members.filter(
          (member) =>
            !participants.some((participant) => participant.membershipId === member.membershipId),
        )
      : [];
  const isInviteListLoading = !membersLoaded || participantsState === "loading";
  const selectedInvite =
    inviteCandidates.find((member) => member.membershipId === inviteId) ?? null;

  const refreshParticipants = useCallback(async () => {
    const detail = await chatApi.detail(accessToken, room.id);
    setParticipants(detail.members);
    setParticipantsState("loaded");
  }, [accessToken, room.id]);

  useEffect(() => {
    void Promise.resolve()
      .then(refreshParticipants)
      .catch((error: Error) => {
        setParticipantsState((current) => (current === "loading" ? "failed" : current));
        showToast(error.message);
      });
  }, [refreshParticipants, showToast]);

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (inviteRef.current && !inviteRef.current.contains(event.target as Node))
        setInviteOpen(false);
    };
    // ⋮ 메뉴·확인 모달이 열려 있으면 Esc는 그것만 닫고 패널은 그대로 둠
    const closeByEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || memberMenu || memberConfirm) return;
      if (inviteOpen) setInviteOpen(false);
      else onClose();
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeByEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeByEscape);
    };
  }, [inviteOpen, onClose, memberMenu, memberConfirm]);

  const run = async (
    action: "leave" | "invite" | "remove" | "owner" | "rename",
    targetId?: number,
  ) => {
    try {
      if (action === "rename" && !name.trim()) {
        showToast("그룹명을 입력해 주세요.");
        return;
      }
      if (action === "invite" && !inviteId) {
        showToast("초대할 구성원을 선택해 주세요.");
        return;
      }
      await onAction(action, targetId ?? inviteId ?? undefined, name);
      if (action === "invite") {
        await Promise.all([refreshParticipants(), onReloadMessages()]);
        setInviteId(null);
        setInviteOpen(false);
        showToast("구성원을 초대했습니다.");
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "요청을 처리하지 못했습니다.");
    }
  };

  return (
    <aside className="h-full w-[min(420px,40vw)] shrink-0 animate-in slide-in-from-right overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GroupAvatar name={room.name ?? "그룹"} size="lg" />
          <div>
            <b className="block">{room.name}</b>
            <p className="mt-1 text-sm text-slate-500">
              멤버{" "}
              <span className="font-bold text-blue-600">
                {participants.length || room.memberCount}
              </span>
            </p>
          </div>
        </div>
        <button
          aria-label="그룹 메시지 상세 닫기"
          onClick={onClose}
          className="cursor-pointer rounded p-1 text-slate-500 transition hover:bg-slate-100"
        >
          <X />
        </button>
      </div>
      {owner && (
        <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4">
          <label className="text-sm font-medium">
            그룹명
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500"
            />
          </label>
          <button
            onClick={() => void run("rename")}
            className="h-9 cursor-pointer rounded-lg border border-blue-200 px-3 text-sm text-blue-700 transition hover:bg-blue-50"
          >
            변경
          </button>
          <div ref={inviteRef} className="relative">
            <p className="mb-1 text-sm font-medium">구성원 초대</p>
            <button
              type="button"
              aria-expanded={inviteOpen}
              onClick={() => setInviteOpen((open) => !open)}
              className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm transition hover:border-blue-300 focus:border-blue-500"
            >
              {selectedInvite ? (
                <>
                  <MessageMemberAvatar
                    name={selectedInvite.displayName}
                    presenceStatus={selectedInvite.presenceStatus}
                    statusType={selectedInvite.statusType}
                  />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate">{selectedInvite.displayName}</b>
                    <small className="block truncate text-slate-500">
                      {[
                        selectedInvite.companyName,
                        selectedInvite.jobGradeName,
                        selectedInvite.departmentName,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </span>
                </>
              ) : (
                <span className="flex-1 text-slate-500">구성원을 선택하세요</span>
              )}
              <ChevronDown
                className={`shrink-0 transition-transform ${inviteOpen ? "rotate-180" : ""}`}
                size={18}
              />
            </button>
            {inviteOpen && (
              <div className="absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
                {inviteCandidates.map((candidate) => (
                  <button
                    key={candidate.membershipId}
                    type="button"
                    onClick={() => {
                      setInviteId(candidate.membershipId);
                      setInviteOpen(false);
                    }}
                    className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left transition hover:bg-blue-50 ${inviteId === candidate.membershipId ? "bg-blue-50" : ""}`}
                  >
                    <MessageMemberAvatar
                      name={candidate.displayName}
                      presenceStatus={candidate.presenceStatus}
                      statusType={candidate.statusType}
                    />
                    <span className="min-w-0">
                      <b className="block truncate text-sm">{candidate.displayName}</b>
                      <small className="block truncate text-slate-500">
                        {[candidate.companyName, candidate.jobGradeName, candidate.departmentName]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    </span>
                  </button>
                ))}
                {isInviteListLoading ? (
                  <LoadingState message="구성원을 불러오는 중입니다." className="py-4" />
                ) : (
                  inviteCandidates.length === 0 && (
                    <p className="px-3 py-4 text-center text-sm text-slate-500">
                      초대할 구성원이 없습니다.
                    </p>
                  )
                )}
              </div>
            )}
          </div>
          <button
            disabled={!inviteId}
            onClick={() => void run("invite")}
            className="h-9 cursor-pointer rounded-lg bg-blue-600 px-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            초대
          </button>
        </div>
      )}
      <section className="mt-4 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-bold">
          멤버 <span className="text-blue-600">{participants.length || room.memberCount}</span>
        </h3>
        <div className="mt-2 max-h-[calc(100vh-25rem)] overflow-y-auto overflow-x-hidden">
          {participants.map((participant) => {
            const isRoomOwner = participant.membershipId === room.ownerMembershipId;
            const isMe = participant.membershipId === currentMemberId;
            const profile = members.find(
              (member) => member.membershipId === participant.membershipId,
            );
            const presenceStatus = isMe ? "ONLINE" : (profile?.presenceStatus ?? "OFFLINE");
            return (
              <div
                key={participant.membershipId}
                className="group mx-1 my-1 flex items-center gap-3 rounded-xl px-3 py-3 transition-colors duration-200 hover:bg-blue-50/80"
              >
                {/* 구성원 정보 영역은 클릭하면 공통 사용자 프로필 모달을 연다. */}
                <button
                  type="button"
                  onClick={() => onProfileClick(participant.membershipId)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md text-left outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-label={`${participant.displayName} 사용자 프로필 보기`}
                >
                  <MessageMemberAvatar
                    name={participant.displayName}
                    presenceStatus={presenceStatus}
                    statusType={isMe ? myStatusType : profile?.statusType}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-1.5">
                      {isMe && <MeBadge />}
                      <b className="truncate text-sm">{participant.displayName}</b>
                    </span>
                    <small className="block truncate text-slate-500">
                      {[
                        participant.jobGradeName,
                        participant.departmentName,
                        participant.companyName,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </span>
                </button>
                {isRoomOwner && (
                  <em className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] not-italic text-blue-600">
                    방장
                  </em>
                )}
                {owner && !isMe && (
                  <button
                    type="button"
                    data-item-menu
                    aria-label={`${participant.displayName} 메뉴`}
                    aria-haspopup="menu"
                    aria-expanded={memberMenu?.member.membershipId === participant.membershipId}
                    onClick={(event) => {
                      if (memberMenu?.member.membershipId === participant.membershipId) {
                        setMemberMenu(null);
                        return;
                      }
                      const rect = event.currentTarget.getBoundingClientRect();
                      setMemberMenu({
                        member: participant,
                        // 메뉴 폭(144px)만큼 왼쪽으로 붙여 패널 밖으로 나가지 않게
                        position: { left: rect.right - 144, top: rect.bottom + 4 },
                      });
                    }}
                    className={`flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded text-slate-600 transition hover:bg-slate-200 ${memberMenu?.member.membershipId === participant.membershipId ? "bg-slate-200" : ""}`}
                  >
                    <MoreVertical size={17} aria-hidden="true" />
                  </button>
                )}
              </div>
            );
          })}
          {participantsState === "loading" && (
            <LoadingState message="참여자를 불러오는 중입니다." className="py-6" />
          )}
          {participantsState === "failed" && (
            <p className="py-6 text-center text-sm text-slate-500">참여자를 불러오지 못했습니다.</p>
          )}
        </div>
      </section>
      <button
        onClick={() => void run("leave")}
        className="mt-4 cursor-pointer rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 transition hover:bg-red-50 active:scale-[.98]"
      >
        채팅방 나가기
      </button>
      {memberMenu && (
        <ItemActionMenu
          position={memberMenu.position}
          onClose={closeMemberMenu}
          items={[
            {
              key: "owner",
              label: "방장 위임",
              icon: Crown,
              onSelect: () => setMemberConfirm({ action: "owner", member: memberMenu.member }),
            },
            {
              key: "remove",
              label: "내보내기",
              icon: UserMinus,
              onSelect: () => setMemberConfirm({ action: "remove", member: memberMenu.member }),
            },
          ]}
        />
      )}
      {memberConfirm && (
        <MemberActionDialog
          action={memberConfirm.action}
          name={memberConfirm.member.displayName}
          onClose={() => setMemberConfirm(null)}
          onConfirm={() => run(memberConfirm.action, memberConfirm.member.membershipId)}
        />
      )}
    </aside>
  );
}

// 방장 위임·내보내기 확인 모달. 확인을 누르면 요청이 끝날 때까지 버튼에 로딩 표시.
function MemberActionDialog({
  action,
  name,
  onClose,
  onConfirm,
}: {
  action: "owner" | "remove";
  name: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const owner = action === "owner";
  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      onClose();
    }
  };
  return (
    <MessageDialogShell
      title={owner ? "방장 위임" : "내보내기"}
      onClose={onClose}
      widthClassName="max-w-md"
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${owner ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-500"}`}
        >
          {owner ? <Crown size={22} /> : <UserMinus size={22} />}
        </div>
        <div className="min-w-0 pt-0.5">
          <p className="text-base font-semibold text-slate-800">
            {owner ? `${name}님에게 방장을 위임할까요?` : `${name}님을 내보낼까요?`}
          </p>
          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            {owner
              ? "위임하면 그룹명 변경·초대·내보내기는 새 방장만 할 수 있습니다."
              : "내보낸 구성원은 이 메시지방의 대화를 더 볼 수 없고, 다시 초대할 수 있습니다."}
          </p>
        </div>
      </div>
      <div className="mt-7 flex justify-end gap-2">
        <button
          data-dialog-initial-focus
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-md border border-slate-200 px-5 py-2.5 text-sm font-medium transition hover:bg-slate-50 active:scale-95"
        >
          취소
        </button>
        <button
          type="button"
          onClick={() => void confirm()}
          disabled={busy}
          className={`flex cursor-pointer items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold text-white transition active:scale-95 disabled:cursor-wait disabled:opacity-60 ${owner ? "bg-blue-600 hover:bg-blue-700" : "bg-red-500 hover:bg-red-600"}`}
        >
          {busy && <Spinner size={14} />}
          {owner ? "위임" : "내보내기"}
        </button>
      </div>
    </MessageDialogShell>
  );
}
