"use client";

import { dateLabel } from "@/components/chat/message-search-panel";
import { LoadingState } from "@/components/common/loading";
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
  showCompany = false,
  onOpen,
}: {
  post: BoardPostSummary;
  // 관리자처럼 여러 회사 글이 섞이는 목록이면 회사 이름도
  showCompany?: boolean;
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
          {(showBoard || showCompany) && (
            <span className="max-w-40 truncate text-slate-400">
              {[showCompany && post.companyName, showBoard && post.boardName]
                .filter(Boolean)
                .join(" · ")}
            </span>
          )}
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

// 게시판 홈 영역(제목 + 더보기 + 글 목록). 테두리·아이콘 없이 제목 아래 선과 목록만.
export function HomeCard({
  title,
  posts,
  emptyText,
  onMore,
  onOpen,
  answerBadge = false,
}: {
  title: string;
  posts: BoardPostSummary[];
  emptyText: string;
  onMore: () => void;
  onOpen: (post: BoardPostSummary) => void;
  answerBadge?: boolean;
}) {
  return (
    <section>
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
        <button
          type="button"
          onClick={onMore}
          className="flex cursor-pointer items-center text-xs text-slate-400 transition hover:text-slate-800"
        >
          더보기
          <ChevronRight size={13} aria-hidden="true" />
        </button>
      </div>
      {posts.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">{emptyText}</p>
      ) : (
        // 넓은 화면에서는 글을 좌우 2열로(왼쪽→오른쪽 순서). 줄마다 아래에 옅은 구분선.
        <ul className="grid grid-cols-1 gap-x-10 md:grid-cols-2">
          {posts.map((post) => (
            <li key={post.id} className="border-b border-slate-100">
              <button
                type="button"
                onClick={() => onOpen(post)}
                className="flex w-full cursor-pointer items-center gap-2 py-2.5 text-left text-sm transition hover:text-blue-600"
              >
                {answerBadge && <AnswerBadge answered={post.answered} />}
                <PostBadges post={post} />
                <span
                  className={`min-w-0 flex-1 truncate ${post.read ? "text-slate-600" : "font-semibold text-slate-900"}`}
                >
                  {post.title}
                </span>
                {post.commentCount > 0 && (
                  <span className="shrink-0 text-xs text-blue-600">[{post.commentCount}]</span>
                )}
                <span className="w-16 shrink-0 text-right text-xs text-slate-400">
                  {dateLabel(post.createdAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// 목록 화면 본체: 고정 글(중요) + 일반 글 + footer(페이지 번호). 로딩·실패·빈 목록 처리 포함.
export function PostListBody({
  status,
  pinned,
  items,
  showBoard,
  showCompany = false,
  emptyText,
  footer,
  onRetry,
  onOpen,
}: {
  status: "loading" | "loaded" | "failed";
  pinned: BoardPostSummary[];
  items: BoardPostSummary[];
  showBoard: boolean;
  showCompany?: boolean;
  emptyText: string;
  footer?: ReactNode;
  onRetry: () => void;
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
            showCompany={showCompany}
            onOpen={() => onOpen(post)}
          />
        ))}
        {items.map((post) => (
          <PostRow
            key={post.id}
            post={post}
            showBoard={showBoard}
            showCompany={showCompany}
            onOpen={() => onOpen(post)}
          />
        ))}
      </ul>
      {footer}
    </>
  );
}
