"use client";

import { AnswerBadge, ImportantButton, PostBadges } from "@/components/board/board-post-list";
import { RichContent } from "@/components/board/rich-content";
import { useAuth } from "@/components/auth/auth-provider";
import { useChatNotification } from "@/components/chat/chat-notification-provider";
import { MessageDialogShell } from "@/components/chat/message-change-dialog";
import { MessageMemberAvatar } from "@/components/chat/message-member-avatar";
import { ReactionEmoji } from "@/components/chat/reaction-emoji";
import { ReactionPicker } from "@/components/chat/reaction-picker";
import { Spinner } from "@/components/common/loading";
import { MeBadge } from "@/components/common/me-badge";
import { MoreMenu } from "@/components/common/more-menu";
import { ReadStatusModal } from "@/components/common/read-status-modal";
import { Tooltip } from "@/components/common/tooltip";
import { UnderlineComposer } from "@/components/common/underline-composer";
import {
  boardApi,
  type BoardAttachment,
  type BoardComment,
  type BoardPostDetail,
  type BoardReaders,
} from "@/lib/api/board-api";
import { fileIconOf, formatFileSize, saveBlob } from "@/lib/attachment-files";
import { reactionLabel } from "@/lib/chat-reactions";
import {
  CornerDownRight,
  Download,
  Eye,
  Paperclip,
  Pencil,
  Reply,
  RotateCcw,
  Trash2,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

const dateTime = (value: string) =>
  new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

// 글 보기(미니멀): 머리(딱지·제목·글쓴이 한 줄), 본문, 첨부, 댓글. 수정·삭제·읽음 현황은 글자 버튼.
export function BoardPostDetailView({
  post,
  accessToken,
  myMembershipId,
  onEdit,
  onChanged,
  onDeleted,
  onRestored,
  onToast,
}: {
  post: BoardPostDetail;
  accessToken: string;
  myMembershipId: number;
  onEdit: () => void;
  onChanged: (post: BoardPostDetail) => void;
  onDeleted: () => void;
  onRestored: () => void;
  onToast: (message: string) => void;
}) {
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  // 답글 쓰는 중인 맨 위 댓글과 그 입력 내용
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [reply, setReply] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [readersOpen, setReadersOpen] = useState(false);
  const [reacting, setReacting] = useState(false);
  const files = post.attachments.filter((attachment) => !attachment.inline);

  const download = async (attachment: BoardAttachment) => {
    try {
      saveBlob(await boardApi.attachmentBlob(accessToken, attachment.id, false), attachment.name);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "파일을 내려받지 못했습니다.");
    }
  };

  const submitComment = async () => {
    const text = comment.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      onChanged(await boardApi.addComment(accessToken, post.id, text));
      setComment("");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "댓글을 등록하지 못했습니다.");
    } finally {
      setSending(false);
    }
  };

  const submitReply = async (parentId: number) => {
    const text = reply.trim();
    if (!text || replySending) return;
    setReplySending(true);
    try {
      onChanged(await boardApi.addComment(accessToken, post.id, text, parentId));
      setReply("");
      setReplyTo(null);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "답글을 등록하지 못했습니다.");
    } finally {
      setReplySending(false);
    }
  };

  // 맨 위 댓글과 그 아래 답글(서버가 오래된 순으로 줌)
  const rootComments = post.comments.filter((item) => item.parentId === null);
  const repliesOf = (rootId: number) => post.comments.filter((item) => item.parentId === rootId);
  // 지운 자리는 댓글 수에서 뺌
  const commentCount = post.comments.filter((item) => !item.deleted).length;

  const removeComment = async (commentId: number) => {
    setDeletingCommentId(commentId);
    try {
      onChanged(await boardApi.deleteComment(accessToken, commentId));
    } catch (error) {
      onToast(error instanceof Error ? error.message : "댓글을 삭제하지 못했습니다.");
    } finally {
      setDeletingCommentId(null);
    }
  };

  // 리액션: 같은 이모지를 다시 누르면 취소, 다른 이모지면 바꿈(한 사람 글마다 하나)
  const react = async (emoji: string) => {
    if (reacting) return;
    setReacting(true);
    try {
      onChanged(await boardApi.react(accessToken, post.id, emoji));
    } catch (error) {
      onToast(error instanceof Error ? error.message : "리액션을 남기지 못했습니다.");
    } finally {
      setReacting(false);
    }
  };

  // 중요 표시(개인 깃발). 화면은 먼저 바꾸고 실패하면 되돌림.
  const toggleImportant = async () => {
    const next = !post.important;
    onChanged({ ...post, important: next });
    try {
      const saved = await boardApi.toggleImportant(accessToken, post.id);
      if (saved !== next) onChanged({ ...post, important: saved });
    } catch (error) {
      onChanged({ ...post, important: !next });
      onToast(error instanceof Error ? error.message : "중요 표시를 바꾸지 못했습니다.");
    }
  };

  const restore = async () => {
    setRestoring(true);
    try {
      await boardApi.restore(accessToken, post.id);
      onRestored();
    } catch (error) {
      onToast(error instanceof Error ? error.message : "글을 복구하지 못했습니다.");
    } finally {
      setRestoring(false);
    }
  };

  // 댓글·답글 한 줄: 아바타 · 이름 · 날짜 · ⋮(답글·삭제), 아래 내용과 "답글" 글자 버튼
  const renderComment = (item: BoardComment, rootId: number) =>
    item.deleted ? (
      <p className="py-3 text-sm text-slate-400">삭제된 댓글입니다.</p>
    ) : (
      <div className="flex gap-3 py-3">
        <PersonAvatar membershipId={item.authorMembershipId} name={item.authorName} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            {item.authorMembershipId === myMembershipId && <MeBadge />}
            <span className="text-sm font-medium text-slate-800">{item.authorName}</span>
            {item.authorAdmin && <span className="text-violet-600">관리자</span>}
            <span>{dateTime(item.createdAt)}</span>
            {deletingCommentId === item.id && <Spinner size={12} />}
            <span className="ml-auto">
              <MoreMenu
                label="댓글 메뉴"
                size={15}
                items={[
                  ...(post.canComment
                    ? [{ label: "답글 쓰기", icon: Reply, onClick: () => openReply(rootId) }]
                    : []),
                  ...(item.canDelete
                    ? [
                        {
                          label: "삭제",
                          icon: Trash2,
                          danger: true,
                          disabled: deletingCommentId === item.id,
                          onClick: () => void removeComment(item.id),
                        },
                      ]
                    : []),
                ]}
              />
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
            {item.content}
          </p>
          {post.canComment && (
            <button
              type="button"
              onClick={() => openReply(rootId)}
              className="mt-1 cursor-pointer text-xs text-slate-400 transition hover:text-slate-800"
            >
              답글
            </button>
          )}
        </div>
      </div>
    );

  // 답글 입력 열기(같은 댓글이면 닫기). 다른 댓글로 옮기면 쓰던 내용은 비움.
  const openReply = (rootId: number) => {
    setReply("");
    setReplyTo((current) => (current === rootId ? null : rootId));
  };

  return (
    <article className="w-full">
      {post.deletedAt && (
        // 휴지통 글: 회색 한 줄 안내 + 글자 버튼 복구
        <p className="mb-6 flex items-center gap-3 border-l-2 border-slate-300 pl-3 text-sm text-slate-500">
          휴지통에 있는 글입니다. 옮긴 지 30일이 지나면 휴지통에서도 보이지 않습니다.
          {post.canRestore && (
            <button
              type="button"
              onClick={() => void restore()}
              disabled={restoring}
              className="flex cursor-pointer items-center gap-1 font-medium text-blue-600 transition hover:text-blue-700 disabled:opacity-60"
            >
              {restoring ? <Spinner size={12} /> : <RotateCcw size={13} aria-hidden="true" />}
              복구
            </button>
          )}
        </p>
      )}

      {/* 머리: 딱지 · 제목, 그 아래 한 줄(글쓴이 · 날짜 · 조회수 | 글자 버튼) */}
      <header>
        {(post.mustRead || post.board.type === "INQUIRY") && (
          <div className="mb-2 flex items-center gap-1.5">
            <PostBadges post={post} showImportant={false} />
            {post.board.type === "INQUIRY" && <AnswerBadge answered={!!post.answeredAt} />}
          </div>
        )}
        <h2 className="break-all text-2xl font-semibold leading-snug text-slate-950">
          {post.title}
        </h2>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex min-w-0 items-center gap-2 text-sm text-slate-500">
            <PersonAvatar membershipId={post.authorMembershipId} name={post.authorName} />
            {post.authorMembershipId === myMembershipId && <MeBadge />}
            <span className="font-medium text-slate-800">{post.authorName}</span>
            {post.authorDepartmentName && <span>{post.authorDepartmentName}</span>}
            <span className="text-slate-300">·</span>
            <span>{dateTime(post.createdAt)}</span>
            {post.updatedAt && <span className="text-slate-400">(수정됨)</span>}
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-0.5" title="조회수">
              <Eye size={13} aria-hidden="true" />
              {post.viewCount}
            </span>
          </div>
          {/* 오른쪽 아이콘 버튼(올리면 툴팁): 중요(별)·읽음 현황·수정·삭제 */}
          <div className="flex items-center gap-0.5">
            <ImportantButton important={post.important} onToggle={() => void toggleImportant()} />
            {post.canSeeReaders && (
              <HeaderAction
                label="읽음 현황"
                icon={UsersRound}
                onClick={() => setReadersOpen(true)}
              />
            )}
            {post.canEdit && <HeaderAction label="수정" icon={Pencil} onClick={onEdit} />}
            {post.canDelete && (
              <HeaderAction
                label="삭제"
                icon={Trash2}
                danger
                onClick={() => setConfirmDelete(true)}
              />
            )}
          </div>
        </div>
      </header>

      <div className="py-8">
        <RichContent json={post.content} />
      </div>

      {(post.canReact || post.reactions.length > 0) && (
        // 리액션 줄(미니멀): 테두리·배경 없이 이모지와 숫자만. 내가 누른 건 숫자가 파랗고 이모지 아래 파란 점,
        // 올리면 이모지가 살짝 떠오르고 누른 사람이 보임. 끝에 회색 고르기 아이콘.
        <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2">
          {post.reactions.map((reaction) => (
            <Tooltip
              key={reaction.emoji}
              label={`${reactionLabel(reaction.emoji)} · ${reaction.names.join(", ")}`}
            >
              <button
                type="button"
                disabled={!post.canReact || reacting}
                onClick={() => void react(reaction.emoji)}
                aria-pressed={reaction.mine}
                className="group flex cursor-pointer items-center gap-1.5 disabled:cursor-default"
              >
                <span className="relative flex flex-col items-center">
                  <ReactionEmoji
                    code={reaction.emoji}
                    size={22}
                    className="transition duration-150 group-hover:-translate-y-0.5 group-active:scale-90"
                  />
                  <span
                    aria-hidden="true"
                    className={`absolute -bottom-1.5 h-1 w-1 rounded-full transition ${reaction.mine ? "bg-blue-600" : "bg-transparent"}`}
                  />
                </span>
                <span
                  className={`text-[13px] tabular-nums transition ${reaction.mine ? "font-semibold text-blue-600" : "text-slate-500 group-hover:text-slate-800"}`}
                >
                  {reaction.count}
                </span>
              </button>
            </Tooltip>
          ))}
          {post.reactions.length > 0 && post.canReact && (
            <span aria-hidden="true" className="h-4 w-px bg-slate-200" />
          )}
          {post.canReact && post.reactions.length === 0 && (
            <span className="text-xs text-slate-400">이 글에 첫 반응을 남겨 보세요</span>
          )}
          {post.canReact && (
            <ReactionPicker
              isMine={false}
              alwaysVisible
              reactedEmojis={post.reactions.filter((item) => item.mine).map((item) => item.emoji)}
              onReact={(emoji) => void react(emoji)}
            />
          )}
        </div>
      )}

      {files.length > 0 && (
        // 첨부: 작은 제목 + 줄 목록(박스 없음), 줄을 누르면 내려받기
        <section className="mb-8">
          <p className="mb-1 flex items-center gap-1 text-xs text-slate-400">
            <Paperclip size={12} aria-hidden="true" />
            첨부 {files.length}
          </p>
          <ul className="divide-y divide-slate-100 border-y border-slate-100">
            {files.map((file) => {
              const { Icon, className } = fileIconOf(file.name);
              return (
                <li key={file.id}>
                  <button
                    type="button"
                    onClick={() => void download(file)}
                    className="group flex w-full cursor-pointer items-center gap-2 py-2 text-left"
                  >
                    <Icon size={15} className={className} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700 group-hover:text-slate-950 group-hover:underline">
                      {file.name}
                    </span>
                    <span className="text-xs text-slate-400">{formatFileSize(file.size)}</span>
                    <Download
                      size={14}
                      aria-label={`${file.name} 내려받기`}
                      className="text-slate-300 transition group-hover:text-slate-700"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 댓글: 작은 제목, 줄 사이 옅은 선, 입력은 밑줄 한 줄 + 글자 버튼 */}
      <section className="border-t border-slate-100 pt-6">
        <p className="text-sm font-semibold text-slate-900">
          댓글 <span className="font-normal text-slate-400">{commentCount}</span>
        </p>
        {rootComments.length > 0 && (
          // 맨 위 댓글 사이 옅은 선, 답글은 ↳ 표시와 함께 들여쓰고 그 아래 답글 입력
          <ul className="mt-2 divide-y divide-slate-100">
            {rootComments.map((root) => (
              <li key={root.id}>
                {renderComment(root, root.id)}
                {(repliesOf(root.id).length > 0 || replyTo === root.id) && (
                  <ul className="mb-3 ml-11 border-l border-slate-100 pl-4">
                    {repliesOf(root.id).map((item) => (
                      <li key={item.id} className="relative">
                        <CornerDownRight
                          size={13}
                          aria-hidden="true"
                          className="absolute -left-[22px] top-4 text-slate-300"
                        />
                        {renderComment(item, root.id)}
                      </li>
                    ))}
                    {replyTo === root.id && (
                      <li>
                        <UnderlineComposer
                          className="mt-1"
                          value={reply}
                          onChange={setReply}
                          onSubmit={() => void submitReply(root.id)}
                          onCancel={() => setReplyTo(null)}
                          sending={replySending}
                          autoFocus
                          placeholder="답글을 남겨 주세요."
                          label="답글"
                        />
                      </li>
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
        {!post.allowComment && !post.deletedAt && (
          <p className="mt-3 text-sm text-slate-400">
            글쓴이가 댓글을 받지 않도록 설정한 글입니다.
          </p>
        )}
        {post.canComment && (
          <UnderlineComposer
            className="mt-2"
            value={comment}
            onChange={setComment}
            onSubmit={() => void submitComment()}
            sending={sending}
            showCount
            placeholder={
              post.board.type === "INQUIRY"
                ? "답변이나 추가 문의를 남겨 주세요."
                : "댓글을 남겨 주세요."
            }
            label="댓글"
          />
        )}
      </section>

      {confirmDelete && (
        <DeleteDialog
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => {
            try {
              await boardApi.remove(accessToken, post.id);
              onDeleted();
            } catch (error) {
              onToast(error instanceof Error ? error.message : "글을 삭제하지 못했습니다.");
            }
          }}
        />
      )}
      {readersOpen && (
        <ReadersDialog
          accessToken={accessToken}
          postId={post.id}
          onClose={() => setReadersOpen(false)}
        />
      )}
    </article>
  );
}

function DeleteDialog({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <MessageDialogShell title="글 삭제" onClose={onClose} widthClassName="max-w-md">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
          <Trash2 size={22} />
        </div>
        <div className="min-w-0 pt-0.5">
          <p className="text-base font-semibold text-slate-800">이 글을 휴지통으로 옮길까요?</p>
          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            휴지통에서 30일 안에 복구할 수 있습니다.
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
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void onConfirm().finally(() => {
              setBusy(false);
              onClose();
            });
          }}
          className="flex cursor-pointer items-center gap-2 rounded-md bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 active:scale-95 disabled:cursor-wait disabled:opacity-60"
        >
          {busy && <Spinner size={14} />}
          휴지통으로
        </button>
      </div>
    </MessageDialogShell>
  );
}

// 필독 읽음 현황: 공통 읽음 현황 모달에 읽은 사람 / 안 읽은 사람을 채움
function ReadersDialog({
  accessToken,
  postId,
  onClose,
}: {
  accessToken: string;
  postId: number;
  onClose: () => void;
}) {
  const [readers, setReaders] = useState<BoardReaders | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    boardApi
      .readers(accessToken, postId)
      .then((result) => alive && setReaders(result))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [accessToken, postId]);
  return (
    <ReadStatusModal
      read={readers?.read ?? null}
      unread={readers?.unread ?? null}
      failed={failed}
      onClose={onClose}
    />
  );
}

// 글 머리줄 오른쪽 아이콘 버튼. 올리면 공통 툴팁으로 이름을 보여 줌.
function HeaderAction({
  label,
  icon: Icon,
  danger = false,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip label={label} className="shrink-0">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 active:scale-90 ${danger ? "hover:text-red-600" : "hover:text-slate-800"}`}
      >
        <Icon size={16} aria-hidden="true" />
      </button>
    </Tooltip>
  );
}

// 사람 아바타(실시간 접속 점·상태 아이콘 포함). 나는 내 상태.
function PersonAvatar({
  membershipId,
  name,
  size,
}: {
  membershipId: number;
  name: string;
  size?: "md" | "lg";
}) {
  const { member } = useAuth();
  const { presenceByMembershipId, memberStatusByMembershipId, myStatusType } =
    useChatNotification();
  const isMe = membershipId === member?.membershipId;
  return (
    <MessageMemberAvatar
      name={name}
      membershipId={membershipId}
      size={size}
      presenceStatus={isMe ? "ONLINE" : (presenceByMembershipId[membershipId] ?? "OFFLINE")}
      statusType={isMe ? myStatusType : memberStatusByMembershipId[membershipId]?.statusType}
    />
  );
}
