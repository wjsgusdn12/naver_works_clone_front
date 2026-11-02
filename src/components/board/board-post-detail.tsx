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
import { Download, Eye, Paperclip, RotateCcw, Trash2 } from "lucide-react";
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

  // 머리줄 오른쪽 글자 버튼(읽음 현황·수정·삭제)
  const textAction =
    "cursor-pointer rounded px-1.5 py-1 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-900";

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
        {(post.mustRead || post.important || post.board.type === "INQUIRY") && (
          <div className="mb-2 flex items-center gap-1.5">
            <PostBadges post={post} />
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
          <div className="flex items-center">
            {post.canSeeReaders && (
              <button type="button" onClick={() => setReadersOpen(true)} className={textAction}>
                읽음 현황
              </button>
            )}
            {post.canEdit && (
              <button type="button" onClick={onEdit} className={textAction}>
                수정
              </button>
            )}
            {post.canDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className={`${textAction} hover:text-red-600`}
              >
                삭제
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="py-8">
        <RichContent json={post.content} />
      </div>

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
          댓글 <span className="font-normal text-slate-400">{post.comments.length}</span>
        </p>
        {post.comments.length > 0 && (
          <ul className="mt-2 divide-y divide-slate-100">
            {post.comments.map((item) => (
              <li key={item.id} className="flex gap-3 py-3">
                <PersonAvatar membershipId={item.authorMembershipId} name={item.authorName} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-xs text-slate-400">
                    {item.authorMembershipId === myMembershipId && <MeBadge />}
                    <span className="text-sm font-medium text-slate-800">{item.authorName}</span>
                    {item.authorAdmin && <span className="text-violet-600">관리자</span>}
                    <span>{dateTime(item.createdAt)}</span>
                    {item.canDelete && (
                      <button
                        type="button"
                        onClick={() => void removeComment(item.id)}
                        disabled={deletingCommentId === item.id}
                        className="ml-auto cursor-pointer transition hover:text-red-600 disabled:opacity-50"
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
        )}
        {!post.allowComment && !post.deletedAt && (
          <p className="mt-3 text-sm text-slate-400">
            글쓴이가 댓글을 받지 않도록 설정한 글입니다.
          </p>
        )}
        {post.canComment && (
          <form
            className="mt-3 flex items-end gap-2 border-b border-slate-200 pb-2 transition focus-within:border-slate-900"
            onSubmit={(event) => {
              event.preventDefault();
              void submitComment();
            }}
          >
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={1000}
              rows={2}
              placeholder={
                post.board.type === "INQUIRY"
                  ? "답변이나 추가 문의를 남겨 주세요."
                  : "댓글을 남겨 주세요."
              }
              aria-label="댓글"
              className="min-w-0 flex-1 resize-none bg-transparent py-1 text-sm outline-none placeholder:text-slate-300"
            />
            {comment.length > 0 && (
              <span className="pb-1.5 text-xs text-slate-300">{comment.length}/1000</span>
            )}
            <button
              type="submit"
              disabled={!comment.trim() || sending}
              className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-3 py-1.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
            >
              {sending && <Spinner size={12} />}
              등록
            </button>
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
                  {/* 부서 · 회사 */}
                  <span className="min-w-0 truncate text-xs text-slate-400">
                    {[reader.departmentName, reader.companyName].filter(Boolean).join(" · ")}
                  </span>
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
