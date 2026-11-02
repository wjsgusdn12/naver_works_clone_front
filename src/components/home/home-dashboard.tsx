"use client";

import { PostBadges, PostMeta } from "@/components/board/board-post-list";
import { FavoriteButton } from "@/components/common/favorite-button";
import { useAuth } from "@/components/auth/auth-provider";
import { ApiDashboardSection } from "@/components/home/api-dashboard";
import { GroupAvatar } from "@/components/chat/group-avatar";
import { SentMark } from "@/components/chat/sent-mark";
import { useChatNotification } from "@/components/chat/chat-notification-provider";
import { LoadingInline, Spinner } from "@/components/common/loading";
import { MeBadge } from "@/components/common/me-badge";
import { MyStatusPicker } from "@/components/common/my-status-picker";
import { NotificationModeMenu } from "@/components/common/notification-mode-menu";
import { UserAvatar } from "@/components/common/user-avatar";
import { addressBookApi, type AddressBookMember } from "@/lib/api/address-book-api";
import { boardApi, type BoardHome, type BoardPostSummary } from "@/lib/api/board-api";
import { chatApi, type ChatRoom } from "@/lib/api/chat-api";
import { withLiveStatus } from "@/lib/live-status";
import type { NotificationItem } from "@/lib/api/notification-api";
import {
  BookUser,
  ChevronRight,
  ClipboardList,
  MessageCircleMore,
  NotebookPen,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

// 홈은 로그인한 사용자의 실제 데이터만 보여 줌. 목업 데이터 없음.
type HomeDashboardProps = {
  accessToken: string;
  displayName: string;
  membershipId: number;
  showToast: (message: string) => void;
};

// 최근 대화에 담을 최대 개수(카드 높이를 넘으면 스크롤).
const RECENT_ROOM_LIMIT = 30;
// 주소록 카드는 전체 구성원을 보여 주되, 서버 한 페이지 최대치(100명)까지만 받음.
const MEMBER_LIMIT = 100;
// 카드 목록 영역: 넓은 화면에서는 카드 남는 높이를 꽉 채우고 그 안에서 스크롤(카드 높이는 격자 행 높이로 고정).
// 좁은 화면(한 줄씩 쌓임)에서는 최대 높이만 둠.
const LIST_FILL = "max-h-[360px] overflow-y-auto xl:absolute xl:inset-0 xl:max-h-none";

// 상대 시각. 오늘이면 시각, 올해면 월·일, 그 외는 연·월·일.
const formatRelative = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMinutes < 1) return "방금 전";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  if (date.getFullYear() === now.getFullYear())
    return date.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
};

export function HomeDashboard({
  accessToken,
  displayName,
  membershipId,
  showToast,
}: HomeDashboardProps) {
  const router = useRouter();
  const { member } = useAuth();
  const {
    presenceByMembershipId,
    memberStatusByMembershipId,
    myStatusType,
    notifications,
    notificationCount,
    notificationsLoaded,
    markNotificationRead,
    acknowledgeNotifications,
  } = useChatNotification();
  const [rooms, setRooms] = useState<ChatRoom[] | null>(null);
  // 주소록 카드(전체 구성원). 즐겨찾기는 별 버튼으로 켜고 끔.
  const [members, setMembers] = useState<AddressBookMember[] | null>(null);
  // 게시판 홈 요약(공지사항·최신글). 실패하면 빈 값으로 두고 안내만 띄움.
  const [board, setBoard] = useState<BoardHome | null>(null);

  // 채팅방 목록과 주소록 구성원을 한 번씩 조회. 실패해도 빈 목록으로 두고 안내만 띄움.
  useEffect(() => {
    let cancelled = false;
    chatApi
      .rooms(accessToken)
      .then((result) => {
        if (!cancelled) setRooms(result);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setRooms([]);
        showToast(error instanceof Error ? error.message : "대화 목록을 불러오지 못했습니다.");
      });
    addressBookApi
      .member(
        accessToken,
        new URLSearchParams({
          page: "0",
          size: String(MEMBER_LIMIT),
          sort: "name",
          direction: "asc",
          // 회사 구분 없이 모든 회사 구성원
          allCompany: "true",
        }),
      )
      .then((result) => {
        if (!cancelled) setMembers(result.content);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setMembers([]);
        showToast(error instanceof Error ? error.message : "주소록을 불러오지 못했습니다.");
      });
    boardApi
      .home(accessToken)
      .then((result) => {
        if (!cancelled) setBoard(result);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setBoard({
          latest: [],
          inquiries: [],
          notices: [],
          free: [],
          noticeBoardId: null,
          freeBoardId: null,
          inquiryBoardId: null,
        });
        showToast(error instanceof Error ? error.message : "게시판을 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, showToast]);

  const today = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());

  const unreadTotal = (rooms ?? []).reduce((sum, room) => sum + room.unreadCount, 0);
  // 주소록 카드 목록과 같은 기준(처음 받은 상태 위에 실시간 상태를 덮음)으로 셈. 로그인한 나도 포함.
  const onlineCount = (members ?? []).filter(
    (item) =>
      withLiveStatus(item, presenceByMembershipId, memberStatusByMembershipId).presenceStatus ===
      "ONLINE",
  ).length;
  const visibleMembers = members ?? [];
  const recentRooms = [...(rooms ?? [])]
    .filter((room) => room.lastMessageAt !== null)
    .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""))
    .slice(0, RECENT_ROOM_LIMIT);

  // 나와의 채팅은 내 이름을 쓰고 옆에 "나" 딱지를 붙임.
  const roomName = (room: ChatRoom) =>
    room.type === "SELF"
      ? displayName
      : room.type === "DIRECT"
        ? (room.directDisplayName ?? "사용자")
        : (room.name ?? "그룹 메시지");

  const openDirect = async (target: AddressBookMember) => {
    try {
      const room = await chatApi.createDirect(accessToken, target.membershipId);
      router.push(`/message?roomId=${room.id}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "메시지방을 열지 못했습니다.");
    }
  };

  // 별 버튼: 응답을 기다리지 않고 바로 바꾸고, 실패하면 되돌림(주소록 화면과 같은 방식).
  const toggleFavorite = async (target: AddressBookMember) => {
    const setFavorite = (favorite: boolean) =>
      setMembers(
        (current) =>
          current &&
          current.map((item) =>
            item.membershipId === target.membershipId ? { ...item, favorite } : item,
          ),
      );
    setFavorite(!target.favorite);
    try {
      if (target.favorite) await addressBookApi.deleteFavorite(accessToken, target.membershipId);
      else await addressBookApi.createFavorite(accessToken, target.membershipId);
    } catch (error) {
      setFavorite(target.favorite);
      showToast(error instanceof Error ? error.message : "즐겨찾기를 변경하지 못했습니다.");
    }
  };

  const openSelf = async () => {
    try {
      const room = await chatApi.createSelf(accessToken);
      router.push(`/message?roomId=${room.id}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "메모방을 열지 못했습니다.");
    }
  };

  // 알림을 누르면 읽음 처리(상단바 종 숫자·읽지 않은 알림 수도 같이 줄어듦) 후 연결된 화면으로.
  const openNotification = (item: NotificationItem) => {
    if (!item.read) markNotificationRead(item.id);
    if (item.linkPath) router.push(item.linkPath);
    else showToast("연결된 화면이 없는 알림입니다.");
  };

  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        {/* 3열 × 2행(행 높이 360px 고정): 인사말·알림(왼쪽 두 줄) | 주소록 위 / 최근 대화 아래 | 최신 게시글(오른쪽 두 줄).
            같은 행 카드는 높이가 자동으로 같아져 위·아래선이 맞음. 좁은 화면에서는 한 줄씩 쌓임. */}
        <section className="grid gap-5 xl:grid-cols-3 xl:grid-rows-[360px_360px]">
          {/* 인사말 카드(두 줄 높이): 내 프로필·날짜·인사말·상태, 알림 목록, 바로가기 4개 */}
          <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-start-1 xl:row-span-2 xl:row-start-1">
            <div className="flex items-center gap-4">
              <UserAvatar
                size="lg"
                name={displayName}
                membershipId={membershipId}
                presenceStatus={presenceByMembershipId[membershipId] ?? "ONLINE"}
                statusType={myStatusType}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-500">{today}</p>
                <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-900">
                  {displayName}님, 안녕하세요.
                </h1>
                {/* 내 상태(프로필 패널과 같은 설정) */}
                <MyStatusPicker
                  accessToken={accessToken}
                  membershipId={membershipId}
                  onToast={showToast}
                  className="mt-2 w-full max-w-[260px]"
                />
              </div>
            </div>

            {/* 알림: 제목 옆 읽지 않은 알림 수, 오른쪽에 모두 읽음(상단바 패널과 같은 동작)·알림 설정 */}
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <div>
                <p className="flex items-center gap-2 text-base font-bold text-slate-900">
                  알림
                  <CountChip
                    label="읽지 않음"
                    value={notificationsLoaded ? notificationCount : null}
                    suffix="건"
                  />
                </p>
                <p className="mt-0.5 text-xs text-slate-500">최근 30일 알림입니다.</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={acknowledgeNotifications}
                  disabled={notificationCount === 0}
                  className="shrink-0 cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50 disabled:cursor-default disabled:text-slate-300 disabled:hover:bg-transparent"
                >
                  모두 읽음
                </button>
                <NotificationModeMenu />
              </div>
            </div>
            {/* 넓은 화면에서는 카드 남는 높이를 채우고 그 안에서 스크롤 */}
            <div className="relative mt-2 min-h-0 flex-1">
              {!notificationsLoaded ? (
                <LoadingInline message="알림을 불러오는 중입니다." className="py-8 text-sm" />
              ) : notifications.length === 0 ? (
                <Empty message="새 알림이 없습니다." />
              ) : (
                <ul className="max-h-[320px] divide-y divide-slate-100 overflow-y-auto xl:absolute xl:inset-0 xl:max-h-none">
                  {notifications.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="flex w-full cursor-pointer items-start gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-slate-50"
                        onClick={() => openNotification(item)}
                      >
                        <span
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read ? "bg-slate-200" : "bg-blue-500"}`}
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block truncate text-sm ${item.read ? "text-slate-600" : "font-semibold text-slate-900"}`}
                          >
                            {item.title}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-slate-500">
                            {item.body}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-slate-400">
                          {formatRelative(item.createdAt)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 바로가기는 카드 아래쪽에 붙임 */}
            <div className="mt-2 grid grid-cols-4 gap-1 border-t border-slate-100 pt-2">
              <QuickButton icon={MessageCircleMore} onClick={() => router.push("/message")}>
                메시지
              </QuickButton>
              <QuickButton icon={BookUser} onClick={() => router.push("/addressBook")}>
                주소록
              </QuickButton>
              <QuickButton icon={ClipboardList} onClick={() => router.push("/board")}>
                게시판
              </QuickButton>
              <QuickButton icon={NotebookPen} onClick={() => void openSelf()}>
                내 메모
              </QuickButton>
            </div>
          </article>

          <Card
            fill
            className="xl:col-start-2 xl:row-start-1"
            title="주소록"
            badge={<CountChip label="온라인" value={onlineCount} suffix="명" />}
            description="전체 구성원입니다. 별을 눌러 즐겨찾기를 켜고 끕니다."
            onTitleClick={() => router.push("/addressBook")}
            footer={
              <>
                <GhostLink onClick={() => router.push("/addressBook")}>전체보기</GhostLink>
                <BlueButton onClick={() => router.push("/message?create=group")}>
                  새 대화
                </BlueButton>
              </>
            }
          >
            {members === null ? (
              <LoadingInline message="주소록을 불러오는 중입니다." className="py-8 text-sm" />
            ) : visibleMembers.length === 0 ? (
              <Empty message="구성원이 없습니다." />
            ) : (
              <ul className={`${LIST_FILL} divide-y divide-slate-100`}>
                {visibleMembers.map((item) => {
                  const target = withLiveStatus(
                    item,
                    presenceByMembershipId,
                    memberStatusByMembershipId,
                  );
                  return (
                    <li key={target.membershipId} className="flex items-center gap-3 px-2 py-2">
                      <UserAvatar
                        size="md"
                        name={target.displayName}
                        membershipId={target.membershipId}
                        presenceStatus={target.presenceStatus}
                        statusType={target.statusType}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          {target.membershipId === membershipId && <MeBadge />}
                          <b className="truncate text-sm text-slate-900">{target.displayName}</b>
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {/* 직급 · 부서 · 회사(다른 회사 구성원도 구분되게) */}
                          {[
                            target.jobGradeName ?? target.jobTitle,
                            target.departmentName,
                            target.companyName,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <FavoriteButton
                        active={target.favorite}
                        onClick={() => void toggleFavorite(item)}
                        label={`${target.displayName} 즐겨찾기 ${target.favorite ? "끄기" : "켜기"}`}
                      />
                      <button
                        type="button"
                        aria-label={`${target.displayName}에게 메시지 보내기`}
                        className="cursor-pointer rounded-md p-1.5 text-blue-600 transition hover:bg-blue-50"
                        onClick={() => void openDirect(target)}
                      >
                        <MessageCircleMore size={17} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card
            fill
            className="xl:col-start-2 xl:row-start-2"
            title="최근 대화"
            badge={
              <CountChip
                label="읽지 않음"
                value={rooms === null ? null : unreadTotal}
                suffix="건"
              />
            }
            description="마지막 메시지가 최근인 순서입니다."
            onTitleClick={() => router.push("/message")}
            footer={
              <>
                <GhostLink onClick={() => router.push("/message")}>전체보기</GhostLink>
                <BlueButton onClick={() => void openSelf()}>내 메모</BlueButton>
              </>
            }
          >
            {rooms === null ? (
              <LoadingInline message="대화 목록을 불러오는 중입니다." className="py-10 text-sm" />
            ) : recentRooms.length === 0 ? (
              <Empty
                message="아직 대화가 없습니다."
                actionLabel="주소록에서 시작하기"
                onAction={() => router.push("/addressBook")}
              />
            ) : (
              <ul className={`${LIST_FILL} divide-y divide-slate-100`}>
                {recentRooms.map((room) => (
                  <li key={room.id}>
                    <button
                      type="button"
                      className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-slate-50"
                      onClick={() => router.push(`/message?roomId=${room.id}`)}
                    >
                      {room.type === "GROUP" ? (
                        <GroupAvatar name={room.name ?? "그룹"} />
                      ) : (
                        <UserAvatar
                          size="md"
                          name={
                            room.type === "SELF"
                              ? displayName
                              : (room.directDisplayName ?? "사용자")
                          }
                          membershipId={
                            room.type === "SELF" ? membershipId : room.directMembershipId
                          }
                          presenceStatus={
                            room.type === "SELF"
                              ? "ONLINE"
                              : room.directMembershipId !== null
                                ? (presenceByMembershipId[room.directMembershipId] ?? "OFFLINE")
                                : "OFFLINE"
                          }
                          statusType={
                            room.type === "SELF"
                              ? myStatusType
                              : room.directMembershipId !== null
                                ? memberStatusByMembershipId[room.directMembershipId]?.statusType
                                : null
                          }
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          {room.type === "SELF" && <MeBadge />}
                          <b className="truncate text-sm text-slate-900">{roomName(room)}</b>
                          {room.type === "GROUP" && (
                            <span className="shrink-0 text-xs font-bold text-blue-600">
                              {room.memberCount}
                            </span>
                          )}
                        </span>
                        {/* 내가 보낸 메시지면 앞에 보낸 화살표(메시지 방 목록과 같은 표시) */}
                        <span className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-slate-500">
                          {room.lastSenderMembershipId === membershipId && <SentMark size={12} />}
                          <span className="truncate">{room.lastMessage ?? ""}</span>
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-xs text-slate-400">
                          {formatRelative(room.lastMessageAt)}
                        </span>
                        {room.unreadCount > 0 && (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white">
                            {room.unreadCount > 999 ? "999+" : room.unreadCount}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            fill
            className="xl:col-start-3 xl:row-span-2 xl:row-start-1"
            title="최신 게시글"
            badge={
              // 카드에 불러온 최신 글(최대 10개) 중 안 읽은 글 수
              <CountChip
                label="읽지 않음"
                value={board ? board.latest.filter((post) => !post.read).length : null}
                suffix="건"
              />
            }
            description="볼 수 있는 모든 게시판의 새 글입니다(공지사항 포함)."
            onTitleClick={() => router.push("/board?menu=latest")}
            footer={
              <>
                <GhostLink onClick={() => router.push("/board?menu=latest")}>전체보기</GhostLink>
                <BlueButton onClick={() => router.push("/board?write=1")}>글쓰기</BlueButton>
              </>
            }
          >
            <BoardPostList
              posts={board ? board.latest : null}
              emptyText="아직 올라온 글이 없습니다."
              showBoard
              onOpen={(post) => router.push(`/board?postId=${post.id}`)}
            />
          </Card>
        </section>

        {/* 관리자에게만 보이는 API 상태. 서버도 ROLE_ADMIN을 다시 검사함(화면 숨김은 편의일 뿐). */}
        {member?.role === "ADMIN" && <ApiDashboardSection accessToken={accessToken} />}
      </div>
    </main>
  );
}

// 홈 게시판 카드의 글 목록. 안 읽은 글은 굵게, showBoard면 게시판 이름도.
function BoardPostList({
  posts,
  emptyText,
  showBoard = false,
  onOpen,
}: {
  posts: BoardPostSummary[] | null;
  emptyText: string;
  showBoard?: boolean;
  onOpen: (post: BoardPostSummary) => void;
}) {
  if (posts === null)
    return <LoadingInline message="게시판을 불러오는 중입니다." className="py-8 text-sm" />;
  if (posts.length === 0) return <Empty message={emptyText} />;
  return (
    // 한 글을 두 줄로: 위는 딱지·제목, 아래는 (게시판 ·) 작성자 · 날짜 · 조회수 · 댓글 수
    <ul className={`${LIST_FILL} divide-y divide-slate-100`}>
      {posts.map((post) => (
        <li key={post.id}>
          <button
            type="button"
            className="flex w-full cursor-pointer flex-col gap-1 rounded-lg px-2 py-2 text-left transition hover:bg-slate-50"
            onClick={() => onOpen(post)}
          >
            <span className="flex w-full min-w-0 items-center gap-1.5">
              <PostBadges post={post} />
              <span
                className={`min-w-0 flex-1 truncate text-sm ${post.read ? "text-slate-600" : "font-bold text-slate-950"}`}
              >
                {post.title}
              </span>
            </span>
            <PostMeta
              post={post}
              prefix={showBoard ? post.boardName : undefined}
              dateText={formatRelative(post.createdAt)}
            />
          </button>
        </li>
      ))}
    </ul>
  );
}

// 인사말 카드의 바로가기: 테두리 없이 아이콘 위·이름 아래(전체 서비스 패널과 같은 모양).
function QuickButton({
  icon: Icon,
  onClick,
  children,
}: {
  icon: typeof MessageCircleMore;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex cursor-pointer flex-col items-center gap-1.5 whitespace-nowrap rounded-lg py-2 text-xs font-medium text-slate-700 transition hover:bg-blue-50/60 hover:text-blue-700 active:scale-95"
    >
      {/* 파란 아이콘 타일: 평소엔 옅은 파랑, 올리면 진한 파랑에 흰 아이콘 */}
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
        <Icon size={18} strokeWidth={2} aria-hidden="true" />
      </span>
      {children}
    </button>
  );
}

// 카드 제목 옆 숫자 칩(예: "온라인 3명"). value가 null이면 불러오는 중.
function CountChip({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | null;
  suffix: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
      {label}
      {value === null ? <Spinner size={10} /> : <b className="font-bold">{value}</b>}
      {suffix}
    </span>
  );
}

// 카드 맨 아래 버튼(줄을 반씩 나눠 채움). 투명 버튼은 해당 화면 전체보기 링크, 파란 버튼은 바로 하는 동작.
function GhostLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-10 flex-1 cursor-pointer items-center justify-center gap-0.5 whitespace-nowrap rounded-lg border border-slate-200 bg-transparent px-3 text-[15px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 active:scale-95"
    >
      {children}
      <ChevronRight
        size={16}
        aria-hidden="true"
        className="text-slate-400 transition group-hover:translate-x-0.5"
      />
    </button>
  );
}

function BlueButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 flex-1 cursor-pointer whitespace-nowrap rounded-lg bg-blue-600 px-3 text-[15px] font-semibold text-white transition hover:bg-blue-700 active:scale-95"
    >
      {children}
    </button>
  );
}

// fill: 넓은 화면에서 카드 높이를 옆 열에 맞추고, 내용은 그 안에서 스크롤(내용 길이가 카드 높이를 키우지 않음).
// 이때 내용은 absolute inset-0으로 본문 칸을 꽉 채워야 함.
function Card({
  title,
  description,
  onTitleClick,
  badge,
  footer,
  className = "",
  fill = false,
  children,
}: {
  title: string;
  description: string;
  // 있으면 제목이 "제목 >" 링크가 됨(마우스를 올리면 파란색, 누르면 해당 화면).
  onTitleClick?: () => void;
  // 제목 바로 옆 작은 칩(예: "온라인 3명")
  badge?: ReactNode;
  // 카드 맨 아래 버튼 줄(투명 버튼 · 파란 버튼)
  footer?: ReactNode;
  className?: string;
  fill?: boolean;
  children: ReactNode;
}) {
  return (
    <article
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${fill ? "flex flex-col" : ""} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {onTitleClick ? (
              <button
                type="button"
                onClick={onTitleClick}
                className="group flex cursor-pointer items-center text-base font-bold text-slate-900 transition hover:text-blue-600"
              >
                {title}
                {/* 화살표는 처음부터 굵은 파란색(링크라는 표시). 아이콘 안쪽 여백만큼 당겨 제목에 붙임 */}
                <ChevronRight
                  size={18}
                  strokeWidth={3}
                  aria-hidden="true"
                  className="-ml-0.5 text-blue-600 transition group-hover:translate-x-0.5"
                />
              </button>
            ) : (
              <p className="text-base font-bold text-slate-900">{title}</p>
            )}
            {badge}
          </div>
          <p className="mt-0.5 truncate text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className={fill ? "relative mt-2 min-h-0 flex-1" : "mt-2"}>{children}</div>
      {footer && (
        <div className="mt-2 flex shrink-0 gap-2 border-t border-slate-100 pt-2">{footer}</div>
      )}
    </article>
  );
}

function Empty({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-sm text-slate-500">
      {message}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="cursor-pointer rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// 이름 앞 세 글자 아바타. 우하단 점으로 접속 상태를 표시.
