"use client";

import { dateLabel, Highlight } from "@/components/chat/message-search-panel";
import { CustomCheckbox } from "@/components/common/custom-checkbox";
import { LoadingState } from "@/components/common/loading";
import type { BoardPostSummary, BoardSearchScope } from "@/lib/api/board-api";
import {
  ChevronRight,
  Eye,
  Flag,
  MessageSquare,
  Paperclip,
  RotateCw,
  SmilePlus,
} from "lucide-react";

// 중요 표시(개인 깃발) 켜기·끄기 버튼. 표시하면 주황 깃발, 아니면 옅은 회색 깃발.
export function ImportantFlagButton({
  important,
  onToggle,
  size = 15,
}: {
  important: boolean;
  onToggle: () => void;
  size?: number;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={important}
      aria-label={important ? "중요 표시 해제" : "중요 표시"}
      title={important ? "중요 표시 해제" : "중요 표시(나만 보임)"}
      className={`flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition hover:bg-slate-100 active:scale-90 ${important ? "text-amber-500" : "text-slate-300 hover:text-slate-500"}`}
    >
      <Flag size={size} fill={important ? "currentColor" : "none"} aria-hidden="true" />
    </button>
  );
}

// 필독 딱지 + 내가 중요 표시한 글이면 작은 주황 깃발(showImportant가 false면 깃발은 따로 그리는 곳)
export function PostBadges({
  post,
  showImportant = true,
}: {
  post: Pick<BoardPostSummary, "mustRead" | "important">;
  showImportant?: boolean;
}) {
  return (
    <>
      {showImportant && post.important && (
        <Flag
          size={13}
          fill="currentColor"
          className="shrink-0 text-amber-500"
          aria-label="중요 표시한 글"
        />
      )}
      {post.mustRead && (
        <span className="shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-600">
          필독
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

// 검색 결과 강조: 검색어(파란 글씨)와 탭(어느 칸에서 찾았는지)
export type PostSearchMark = { keyword: string; scope: BoardSearchScope };

// 글 목록 한 줄(고정 글 포함). 아직 안 읽은 글은 제목을 굵게. showBoard면 어느 게시판 글인지 함께 표시.
// search가 있으면 맞은 글자를 파랗게, 파일·댓글 탭이면 맞은 파일 이름·댓글을 한 줄 더.
export function PostRow({
  post,
  pinned = false,
  showBoard,
  showCompany = false,
  checked,
  onCheck,
  onOpen,
  search,
  onToggleImportant,
}: {
  post: BoardPostSummary;
  search?: PostSearchMark;
  // 있으면 줄 앞에 중요 표시(깃발) 버튼
  onToggleImportant?: () => void;
  // onCheck가 있으면 줄 앞에 체크박스(읽음 처리할 글 고르기)
  checked?: boolean;
  onCheck?: () => void;
  // 관리자처럼 여러 회사 글이 섞이는 목록이면 회사 이름도
  showCompany?: boolean;
  // 게시판 맨 위에 고정한 중요 글(옅은 배경)
  pinned?: boolean;
  showBoard: boolean;
  onOpen: () => void;
}) {
  return (
    <li
      className={`flex items-center border-b border-slate-100 ${checked ? "bg-blue-50/60" : pinned ? "bg-amber-50/50" : ""}`}
    >
      {onCheck && (
        <CustomCheckbox
          label={`${post.title} 선택`}
          checked={!!checked}
          onChange={onCheck}
          className="ml-1 shrink-0"
        />
      )}
      {onToggleImportant && (
        <ImportantFlagButton important={post.important} onToggle={onToggleImportant} />
      )}
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 px-2 py-3.5 text-left transition hover:bg-slate-50"
      >
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            {post.status !== "PUBLISHED" && (
              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                {post.status === "DRAFT"
                  ? "임시저장"
                  : `예약 ${new Date(post.publishAt ?? "").toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}`}
              </span>
            )}
            <PostBadges post={post} showImportant={!onToggleImportant} />
            {post.boardType === "INQUIRY" && <AnswerBadge answered={post.answered} />}
            <span
              className={`truncate text-[15px] ${post.read ? "text-slate-700" : "font-bold text-slate-950"}`}
            >
              {search ? <Highlight text={post.title} keyword={search.keyword} /> : post.title}
            </span>
            {post.hasFile && (
              <Paperclip
                size={14}
                className="shrink-0 text-slate-400"
                aria-label="첨부 파일 있음"
              />
            )}
          </span>
          {post.preview && (
            <span className="mt-1 block truncate text-xs text-slate-500">
              {search ? <Highlight text={post.preview} keyword={search.keyword} /> : post.preview}
            </span>
          )}
          {search && post.matchText && (
            // 파일·댓글 탭: 검색어가 들어 있는 파일 이름·댓글
            <span className="mt-1 flex min-w-0 items-center gap-1 text-xs text-slate-600">
              {search.scope === "FILE" ? (
                <Paperclip size={12} className="shrink-0 text-slate-400" aria-label="파일" />
              ) : (
                <MessageSquare size={12} className="shrink-0 text-slate-400" aria-label="댓글" />
              )}
              <span className="truncate">
                <Highlight text={post.matchText} keyword={search.keyword} />
              </span>
            </span>
          )}
        </span>
        <PostMeta
          post={post}
          highlight={search?.scope === "AUTHOR" ? search.keyword : undefined}
          prefix={
            [showCompany && post.companyName, showBoard && post.boardName]
              .filter(Boolean)
              .join(" · ") || undefined
          }
          dateText={dateLabel(post.deletedAt ?? post.createdAt)}
        />
      </button>
    </li>
  );
}

// 글 줄 오른쪽 정보(작성자·날짜·조회수·댓글 수) 사이 구분 점
function MetaDot() {
  return (
    <span aria-hidden="true" className="text-slate-300">
      ·
    </span>
  );
}

// 글 줄 오른쪽 정보: (prefix ·) 작성자 · 날짜 · 조회수 · 리액션 수 · 댓글 수. 게시판 목록·게시판 홈·메인 홈 카드 공통.
// prefix는 게시판·회사 이름처럼 앞에 붙일 글자.
// dateText가 없으면 날짜 형식(dateLabel)으로.
export function PostMeta({
  post,
  dateText,
  prefix,
  highlight,
}: {
  post: BoardPostSummary;
  dateText?: string;
  prefix?: string;
  // 작성자 검색이면 이름에서 맞은 글자를 파랗게
  highlight?: string;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-xs text-slate-400">
      {prefix && (
        <>
          <span className="max-w-40 truncate">{prefix}</span>
          <MetaDot />
        </>
      )}
      <span className="max-w-20 truncate text-slate-500">
        {highlight ? <Highlight text={post.authorName} keyword={highlight} /> : post.authorName}
      </span>
      <MetaDot />
      <span className="whitespace-nowrap">{dateText ?? dateLabel(post.createdAt)}</span>
      <MetaDot />
      <span className="flex items-center gap-0.5" title="조회수">
        <Eye size={12} aria-hidden="true" />
        {post.viewCount}
      </span>
      <MetaDot />
      <span
        className={`flex items-center gap-0.5 ${post.reactionCount > 0 ? "text-amber-600" : ""}`}
        title="리액션 수"
      >
        <SmilePlus size={12} aria-hidden="true" />
        {post.reactionCount}
      </span>
      <MetaDot />
      <span
        className={`flex items-center gap-0.5 ${post.commentCount > 0 ? "text-blue-600" : ""}`}
        title="댓글 수"
      >
        <MessageSquare size={12} aria-hidden="true" />
        {post.commentCount}
      </span>
    </span>
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
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        <button
          type="button"
          onClick={onMore}
          className="flex cursor-pointer items-center text-xs font-medium text-blue-600 transition hover:text-blue-700"
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
                  className={`min-w-0 flex-1 truncate ${post.read ? "text-slate-600" : "font-bold text-slate-950"}`}
                >
                  {post.title}
                </span>
                <PostMeta post={post} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// 목록 화면 본체: 고정 글(중요) + 일반 글. 로딩·실패·빈 목록 처리 포함.
export function PostListBody({
  status,
  pinned,
  items,
  showBoard,
  showCompany = false,
  emptyText,
  checkedIds,
  onCheck,
  onRetry,
  onOpen,
  search,
  onToggleImportant,
}: {
  // 검색 결과 화면이면 검색어 강조
  search?: PostSearchMark;
  // 있으면 줄마다 중요 표시(깃발) 버튼
  onToggleImportant?: (post: BoardPostSummary) => void;
  status: "loading" | "loaded" | "failed";
  pinned: BoardPostSummary[];
  items: BoardPostSummary[];
  showBoard: boolean;
  showCompany?: boolean;
  emptyText: string;
  // onCheck가 있으면 줄마다 체크박스(휴지통처럼 고를 일이 없는 목록은 넘기지 않음)
  checkedIds?: number[];
  onCheck?: (postId: number) => void;
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
            checked={checkedIds?.includes(post.id)}
            onCheck={onCheck && (() => onCheck(post.id))}
            onOpen={() => onOpen(post)}
          />
        ))}
        {items.map((post) => (
          <PostRow
            key={post.id}
            post={post}
            showBoard={showBoard}
            showCompany={showCompany}
            checked={checkedIds?.includes(post.id)}
            onCheck={onCheck && (() => onCheck(post.id))}
            onOpen={() => onOpen(post)}
            search={search}
            onToggleImportant={onToggleImportant && (() => onToggleImportant(post))}
          />
        ))}
      </ul>
    </>
  );
}
