"use client";

import { AnswerBadge, PostBadges } from "@/components/board/board-post-list";
import { RichContent } from "@/components/board/rich-content";
import { useAuth } from "@/components/auth/auth-provider";
import { useChatNotification } from "@/components/chat/chat-notification-provider";
import { MessageDialogShell } from "@/components/chat/message-change-dialog";
import { MessageMemberAvatar } from "@/components/chat/message-member-avatar";
import { LoadingState, Spinner } from "@/components/common/loading";
import { MeBadge } from "@/components/common/me-badge";
import { Tabs } from "@/components/common/tabs";
import {
  boardApi,
  type BoardAttachment,
  type BoardPostDetail,
  type BoardReaders,
} from "@/lib/api/board-api";
import { fileIconOf, formatFileSize, saveBlob } from "@/lib/attachment-files";
import { ArrowLeft, Download, Eye, Pencil, RotateCcw, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";

const dateTime = (value: string) =>
  new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

// 글 보기: 머리(게시판·제목·글쓴이), 본문, 첨부, 댓글. 수정·휴지통·복구·필독 읽음 현황 버튼.
export function BoardPostDetailView({
  post,
  accessToken,
  myMembershipId,
  onBack,
  onEdit,
  onChanged,
  onDeleted,
  onRestored,
  onToast,
}: {
  post: BoardPostDetail;
  accessToken: string;
  myMembershipId: number;
  onBack: () => void;
  onEdit: () => void;
  onChanged: (post: BoardPostDetail) => void;
  onDeleted: () => void;
  onRestored: () => void;
  onToast: (message: string) => void;
}) {
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [readersOpen, setReadersOpen] = useState(false);
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

  return (
    <article className="w-full">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex cursor-pointer items-center gap-1 text-sm text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        목록으로
      </button>
      {post.deletedAt && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">
          휴지통에 있는 글입니다. 옮긴 지 30일이 지나면 휴지통에서도 보이지 않습니다.
          {post.canRestore && (
            <button
              type="button"
              onClick={() => void restore()}
              disabled={restoring}
              className="flex cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {restoring ? <Spinner size={13} /> : <RotateCcw size={14} aria-hidden="true" />}
              복구
            </button>
          )}
        </div>
      )}
      <header className="border-b border-slate-200 pb-5">
        <p className="text-sm text-blue-600">{post.board.name}</p>
        <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-bold text-slate-950">
          <PostBadges post={post} />
          {post.board.type === "INQUIRY" && <AnswerBadge answered={!!post.answeredAt} />}
          <span className="break-all">{post.title}</span>
        </h1>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <PersonAvatar membershipId={post.authorMembershipId} name={post.authorName} size="lg" />
            <div>
              <p className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                {post.authorMembershipId === myMembershipId && <MeBadge />}
                {post.authorName}
                {post.authorDepartmentName && (
                  <span className="font-normal text-slate-500">· {post.authorDepartmentName}</span>
                )}
              </p>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                {dateTime(post.createdAt)}
                {post.updatedAt && <span>(수정됨 {dateTime(post.updatedAt)})</span>}
                <span className="flex items-center gap-0.5">
                  <Eye size={12} aria-hidden="true" />
                  {post.viewCount}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {post.canSeeReaders && (
              <ActionButton
                icon={<Users size={15} />}
                label="읽음 현황"
                onClick={() => setReadersOpen(true)}
              />
            )}
            {post.canEdit && (
              <ActionButton icon={<Pencil size={15} />} label="수정" onClick={onEdit} />
            )}
            {post.canDelete && (
              <ActionButton
                icon={<Trash2 size={15} />}
                label="삭제"
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

      {files.length > 0 && (
        <section className="mb-8 rounded-lg border border-slate-200">
          <h2 className="border-b border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">
            첨부 파일 {files.length}
          </h2>
          <ul>
            {files.map((file) => {
              const { Icon, className } = fileIconOf(file.name);
              return (
                <li key={file.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Icon size={18} className={className} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
                    {file.name}
                  </span>
                  <span className="text-xs text-slate-400">{formatFileSize(file.size)}</span>
                  <button
                    type="button"
                    aria-label={`${file.name} 내려받기`}
                    onClick={() => void download(file)}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    <Download size={16} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="border-t border-slate-200 pt-6">
        <h2 className="mb-4 text-base font-bold text-slate-900">
          댓글 <span className="text-blue-600">{post.comments.length}</span>
        </h2>
        <ul className="flex flex-col gap-4">
          {post.comments.map((item) => (
            <li key={item.id} className="flex gap-3">
              <PersonAvatar membershipId={item.authorMembershipId} name={item.authorName} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm">
                  {item.authorMembershipId === myMembershipId && <MeBadge />}
                  <b className="text-slate-900">{item.authorName}</b>
                  {item.authorAdmin && (
                    <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[11px] font-semibold text-violet-600">
                      관리자
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{dateTime(item.createdAt)}</span>
                  {item.canDelete && (
                    <button
                      type="button"
                      onClick={() => void removeComment(item.id)}
                      disabled={deletingCommentId === item.id}
                      className="ml-1 cursor-pointer text-xs text-slate-400 transition hover:text-red-500 disabled:opacity-50"
                    >
                      {deletingCommentId === item.id ? "삭제 중..." : "삭제"}
                    </button>
                  )}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                  {item.content}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {post.canComment && (
          <form
            className="mt-5 rounded-lg border border-slate-300 focus-within:border-blue-500"
            onSubmit={(event) => {
              event.preventDefault();
              void submitComment();
            }}
          >
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={1000}
              rows={3}
              placeholder={
                post.board.type === "INQUIRY"
                  ? "답변이나 추가 문의를 남겨 주세요."
                  : "댓글을 남겨 주세요."
              }
              aria-label="댓글"
              className="block w-full resize-none rounded-t-lg px-4 py-3 text-sm outline-none"
            />
            <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
              <span className="text-xs text-slate-400">{comment.length}/1000</span>
              <button
                type="submit"
                disabled={!comment.trim() || sending}
                className="flex cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending && <Spinner size={13} />}
                등록
              </button>
            </div>
          </form>
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

function ActionButton({
  icon,
  label,
  danger = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm transition active:scale-95 ${danger ? "text-red-500 hover:border-red-200 hover:bg-red-50" : "text-slate-600 hover:bg-slate-50"}`}
    >
      {icon}
      {label}
    </button>
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

// 필독 읽음 현황: 읽은 사람 / 안 읽은 사람 탭
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
  const [tab, setTab] = useState<"read" | "unread">("read");
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
  const list = readers ? readers[tab] : [];
  return (
    <MessageDialogShell title="읽음 현황" onClose={onClose} widthClassName="max-w-md">
      {failed ? (
        <p className="py-10 text-center text-sm text-slate-500">읽음 현황을 불러오지 못했습니다.</p>
      ) : !readers ? (
        <LoadingState message="읽음 현황을 불러오는 중입니다..." className="min-h-48" />
      ) : (
        <>
          <Tabs
            items={[
              { key: "read", label: "읽음", count: readers.read.length },
              { key: "unread", label: "안 읽음", count: readers.unread.length },
            ]}
            value={tab}
            onChange={setTab}
            fill
            ariaLabel="읽음 현황"
          />
          <ul className="mt-2 max-h-80 overflow-y-auto">
            {list.length === 0 ? (
              <li className="py-10 text-center text-sm text-slate-400">
                {tab === "read" ? "아직 읽은 사람이 없습니다." : "모두 읽었습니다."}
              </li>
            ) : (
              list.map((reader) => (
                <li key={reader.membershipId} className="flex items-center gap-3 py-2">
                  <PersonAvatar membershipId={reader.membershipId} name={reader.name} />
                  <span className="text-sm text-slate-800">{reader.name}</span>
                  {reader.departmentName && (
                    <span className="text-xs text-slate-400">{reader.departmentName}</span>
                  )}
                </li>
              ))
            )}
          </ul>
        </>
      )}
    </MessageDialogShell>
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
      size={size}
      presenceStatus={isMe ? "ONLINE" : (presenceByMembershipId[membershipId] ?? "OFFLINE")}
      statusType={isMe ? myStatusType : memberStatusByMembershipId[membershipId]?.statusType}
    />
  );
}
