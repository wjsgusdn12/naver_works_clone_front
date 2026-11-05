"use client";

import { MessageBubble } from "@/components/chat/message-bubble";
import type { AddressBookMember } from "@/lib/api/address-book-api";
import type { ChatAttachment, ChatMessage, ChatRoom } from "@/lib/api/chat-api";
import { dateKey, formatChatDate, minuteKey } from "@/lib/chat-format";
import { sameBundle } from "@/lib/chat-page-helpers";
import type { MemberStatusType } from "@/lib/status-options";
import { Fragment, memo, useMemo } from "react";

// 메시지 목록만 따로 memo로 묶어, 입력칸 타이핑·상대 입력 표시·접속 상태 같은 다른 state가 바뀔 때
// 말풍선 50개를 매번 다시 계산하지 않게 함. messages 배열이나 강조 ID가 바뀔 때만 다시 그려짐.
export const MessageList = memo(function MessageList({
  messages,
  highlightedMessageId,
  myMembershipId,
  roomType,
  contactMemberById,
  onOpenReadMembers,
  onProfileClick,
  onCopy,
  onReply,
  onEdit,
  onDelete,
  onOpenOriginal,
  onToggleReaction,
  onOpenReactionMembers,
  onForward,
  onToggleNotice,
  onOpenImage,
  onOpenFile,
  onDownload,
  noticeMessageIds,
  myDisplayName,
  myStatusType,
}: {
  messages: ChatMessage[];
  highlightedMessageId: number | null;
  myMembershipId: number | null;
  roomType: ChatRoom["type"] | null;
  contactMemberById: Map<number, AddressBookMember>;
  onOpenReadMembers: (message: ChatMessage) => Promise<void>;
  onProfileClick: (membershipId: number) => void;
  onCopy: (message: ChatMessage) => void;
  onReply: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage) => void;
  onOpenOriginal: (messageId: number) => void;
  onToggleReaction: (message: ChatMessage, emoji: string) => void;
  onOpenReactionMembers: (message: ChatMessage) => void;
  onForward: (message: ChatMessage) => void;
  onToggleNotice: (message: ChatMessage) => void;
  onOpenImage: (message: ChatMessage) => void;
  onOpenFile: (message: ChatMessage) => void;
  onDownload: (attachment: ChatAttachment) => Promise<void>;
  // 현재 방 공지 메시지 ID 목록. 포함된 말풍선의 메뉴가 "공지 내리기"로 바뀜.
  noticeMessageIds: Set<number>;
  // 답장 인용이 내 메시지일 때 아바타 배지에 쓰는 내 이름·상태.
  myDisplayName: string | null;
  myStatusType: MemberStatusType | null;
}) {
  // 답장 인용에는 작성자 이름만 있어 이름으로 주소록 프로필을 찾음.
  const contactByName = useMemo(
    () =>
      new Map(
        Array.from(contactMemberById.values()).map((contact) => [contact.displayName, contact]),
      ),
    [contactMemberById],
  );
  // 묶어 보낸 사진: 묶음의 마지막 메시지 자리에 사진 전부를 한 말풍선으로(시간·읽음도 마지막 기준).
  // 앞쪽 사진들은 자리표(빈 칸)만 남겨 원문 이동·날짜 표시가 그 메시지 번호를 찾을 수 있게 함.
  const bundleByLastId = useMemo(() => {
    const result = new Map<number, ChatMessage[]>();
    let current: ChatMessage[] = [];
    messages.forEach((message, index) => {
      current = sameBundle(messages[index - 1], message) ? [...current, message] : [message];
      if (!sameBundle(message, messages[index + 1]) && current.length > 1)
        result.set(message.id, current);
    });
    return result;
  }, [messages]);
  return (
    <>
      {messages.map((message, index) => {
        const label = formatChatDate(message.createdAt);
        const showDate =
          index === 0 || dateKey(messages[index - 1].createdAt) !== dateKey(message.createdAt);
        if (sameBundle(message, messages[index + 1]))
          return (
            <Fragment key={message.id}>
              {showDate && (
                <p className="my-5 text-center">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
                    {label}
                  </span>
                </p>
              )}
              <div
                data-message-id={message.id}
                data-message-date={dateKey(message.createdAt)}
                data-message-label={label}
              />
            </Fragment>
          );
        const bundle = bundleByLastId.get(message.id);
        const sender = contactMemberById.get(message.senderMembershipId);
        const replySenderName = message.reply?.senderName;
        const isMyReply = replySenderName !== undefined && replySenderName === myDisplayName;
        const replyContact =
          replySenderName === undefined || isMyReply
            ? undefined
            : contactByName.get(replySenderName);
        // 묶음이면 그 첫 사진 앞의 메시지와 비교(앞쪽 사진들은 자리표라 이름·꼬리를 숨기면 안 됨)
        const previousMessage = messages[index - (bundle?.length ?? 1)];
        const nextMessage = messages[index + 1];
        const isGroupedWithPrevious =
          message.type === "TEXT" &&
          previousMessage?.type === "TEXT" &&
          previousMessage.senderMembershipId === message.senderMembershipId &&
          minuteKey(previousMessage.createdAt) === minuteKey(message.createdAt);
        const isGroupedWithNext =
          message.type === "TEXT" &&
          nextMessage?.type === "TEXT" &&
          nextMessage.senderMembershipId === message.senderMembershipId &&
          minuteKey(nextMessage.createdAt) === minuteKey(message.createdAt);
        return (
          <Fragment key={message.id}>
            {showDate && (
              <p className="my-5 text-center">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
                  {label}
                </span>
              </p>
            )}
            <div
              data-message-id={message.id}
              className="group/message relative w-full"
              data-message-date={dateKey(message.createdAt)}
              data-message-label={label}
            >
              {message.type === "SYSTEM" ? (
                <p className="my-5 text-center text-xs text-slate-400">{message.content}</p>
              ) : (
                <MessageBubble
                  message={message}
                  bundle={bundle && !message.deletedAt ? bundle : undefined}
                  isOriginalHighlighted={highlightedMessageId === message.id}
                  isMine={message.senderMembershipId === myMembershipId}
                  isDirect={roomType === "DIRECT"}
                  isGroup={roomType === "GROUP"}
                  senderProfile={sender}
                  replyPresenceStatus={isMyReply ? "ONLINE" : replyContact?.presenceStatus}
                  replyStatusType={isMyReply ? myStatusType : replyContact?.statusType}
                  showSender={!isGroupedWithPrevious}
                  showMeta={!isGroupedWithNext}
                  showTail={!isGroupedWithPrevious}
                  onOpenReadMembers={onOpenReadMembers}
                  onProfileClick={onProfileClick}
                  onCopy={onCopy}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onOpenOriginal={onOpenOriginal}
                  onToggleReaction={onToggleReaction}
                  onOpenReactionMembers={onOpenReactionMembers}
                  onForward={onForward}
                  onToggleNotice={onToggleNotice}
                  onOpenImage={onOpenImage}
                  onOpenFile={onOpenFile}
                  onDownload={onDownload}
                  isNotice={noticeMessageIds.has(message.id)}
                />
              )}
            </div>
          </Fragment>
        );
      })}
    </>
  );
});
