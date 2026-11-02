"use client";

import { dateLabel } from "@/components/chat/message-search-panel";
import { LoadingInline, LoadingState } from "@/components/common/loading";
import type { BoardPostSummary } from "@/lib/api/board-api";
import { ChevronRight, Eye, Paperclip, RotateCw } from "lucide-react";
import type { ReactNode } from "react";

// 필독·중요·답변 상태 딱지
export function PostBadges({ post }: { post: Pick<BoardPostSummary, "mustRead" | "important"> }) {
  return (
    <>
      {post.mustRead && (
        <span className="shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-600">
          필독
        </span>
      )}
      {post.important && (
        <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
          중요
        </span>
      )}
    </>
  );
}

export function AnswerBadge({ answered }: { answered: boolean }) {
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${answered ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
    >
      {answered ? "답변 완료" : "답변 대기"}
    </span>
  );
}

// 글 목록 한 줄(고정 글 포함). 아직 안 읽은 글은 제목을 굵게. showBoard면 어느 게시판 글인지 함께 표시.
export function PostRow({
  post,
  pinned = false,
  showBoard,
  onOpen,
}: {
  post: BoardPostSummary;
  // 게시판 맨 위에 고정한 중요 글(옅은 배경)
  pinned?: boolean;
  showBoard: boolean;
  onOpen: () => void;
}) {
  return (
    <li className={pinned ? "bg-amber-50/50" : ""}>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full cursor-pointer items-center gap-4 border-b border-slate-100 px-2 py-3.5 text-left transition hover:bg-slate-50"
      >
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <PostBadges post={post} />
            {post.boardType === "INQUIRY" && <AnswerBadge answered={post.answered} />}
            <span
              className={`truncate text-[15px] ${post.read ? "text-slate-700" : "font-semibold text-slate-950"}`}
            >
              {post.title}
            </span>
            {post.commentCount > 0 && (
              <span className="shrink-0 text-sm font-semibold text-blue-600">
                [{post.commentCount}]
              </span>
            )}
            {post.hasFile && (
              <Paperclip
                size={14}
                className="shrink-0 text-slate-400"
                aria-label="첨부 파일 있음"
              />
            )}
          </span>
          {post.preview && (
            <span className="mt-1 block truncate text-xs text-slate-500">{post.preview}</span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-3 text-xs text-slate-500">
          {showBoard && <span className="max-w-28 truncate text-slate-400">{post.boardName}</span>}
          <span className="max-w-24 truncate">{post.authorName}</span>
          <span className="w-20 text-right">{dateLabel(post.deletedAt ?? post.createdAt)}</span>
          <span className="flex w-10 items-center justify-end gap-0.5 text-slate-400">
            <Eye size={12} aria-hidden="true" />
            {post.viewCount}
          </span>
        </span>
      </button>
    </li>
  );
}

// 게시판 홈 영역 카드(제목 + 더 보기 + 글 5개)
export function HomeCard({
  title,
  icon,
  posts,
  emptyText,
  onMore,
  onOpen,
  answerBadge = false,
}: {
  title: string;
  icon: ReactNode;
  posts: BoardPostSummary[];
  emptyText: string;
  onMore: (() => void) | null;
  onOpen: (post: BoardPostSummary) => void;
  answerBadge?: boolean;
}) {
  return (
    <section className="flex min-h-64 flex-col rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          {icon}
          {title}
        </h2>
        {onMore && (
          <button
            type="button"
            onClick={onMore}
            className="flex cursor-pointer items-center text-xs text-slate-500 transition hover:text-blue-600"
          >
            더 보기
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      {posts.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-sm text-slate-400">
          {emptyText}
        </p>
      ) : (
        <ul className="flex flex-col">
          {posts.map((post) => (
            <li key={post.id}>
              <button
                type="button"
                onClick={() => onOpen(post)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-1 py-2 text-left text-sm transition hover:bg-slate-50"
              >
                {answerBadge && <AnswerBadge answered={post.answered} />}
                <PostBadges post={post} />
                <span
                  className={`min-w-0 flex-1 truncate ${post.read ? "text-slate-700" : "font-semibold text-slate-900"}`}
                >
                  {post.title}
                </span>
                {post.commentCount > 0 && (
                  <span className="shrink-0 text-xs font-semibold text-blue-600">
                    [{post.commentCount}]
                  </span>
                )}
                <span className="shrink-0 text-xs text-slate-400">{dateLabel(post.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// 목록 화면 본체: 고정 글(중요) + 일반 글 + 더 보기. 로딩·실패·빈 목록 처리 포함.
export function PostListBody({
  status,
  pinned,
  items,
  hasMore,
  loadingMore,
  showBoard,
  emptyText,
  onRetry,
  onMore,
  onOpen,
}: {
  status: "loading" | "loaded" | "failed";
  pinned: BoardPostSummary[];
  items: BoardPostSummary[];
  hasMore: boolean;
  loadingMore: boolean;
  showBoard: boolean;
  emptyText: string;
  onRetry: () => void;
  onMore: () => void;
  onOpen: (post: BoardPostSummary) => void;
}) {
  if (status === "loading")
    return <LoadingState message="글을 불러오는 중입니다..." className="min-h-64" />;
  if (status === "failed") {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-2 text-sm text-slate-500">
        <p>글 목록을 불러오지 못했습니다.</p>
        <button
          type="button"
          onClick={onRetry}
          className="flex cursor-pointer items-center gap-1 rounded-md px-3 py-1.5 font-medium text-blue-600 transition hover:bg-blue-50"
        >
          <RotateCw size={14} aria-hidden="true" />
          다시 시도
        </button>
      </div>
    );
  }
  if (pinned.length === 0 && items.length === 0) {
    return (
      <p className="flex min-h-64 items-center justify-center text-sm text-slate-400">
        {emptyText}
      </p>
    );
  }
  return (
    <>
      <ul className="border-t border-slate-200">
        {pinned.map((post) => (
          <PostRow
            key={`pinned-${post.id}`}
            post={post}
            pinned
            showBoard={showBoard}
            onOpen={() => onOpen(post)}
          />
        ))}
        {items.map((post) => (
          <PostRow key={post.id} post={post} showBoard={showBoard} onOpen={() => onOpen(post)} />
        ))}
      </ul>
      {hasMore && (
        <div className="my-4 flex justify-center">
          {loadingMore ? (
            <LoadingInline message="더 불러오는 중입니다." className="text-xs text-slate-500" />
          ) : (
            <button
              type="button"
              onClick={onMore}
              className="cursor-pointer rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              더 보기
            </button>
          )}
        </div>
      )}
    </>
  );
}
