"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useChatNotification } from "@/components/chat/chat-notification-provider";
import { MessageMemberAvatar } from "@/components/chat/message-member-avatar";
import { dateLabel, Highlight, previewLinesOf } from "@/components/chat/message-search-panel";
import { LoadingInline, LoadingState } from "@/components/common/loading";
import { chatApi, type ChatMessageSearchItem } from "@/lib/api/chat-api";
import { Forward, RotateCw, Search, SearchX, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// 서버 검색어 최대 길이(ChatRoomService.SEARCH_KEYWORD_MAX)와 같게.
const KEYWORD_MAX = 100;

type Result = {
  keyword: string;
  items: ChatMessageSearchItem[];
  nextCursor: number | null;
  status: "loading" | "loaded" | "failed";
  loadingMore: boolean;
};

// 열린 방 안에서 대화 내용 검색. Enter로 검색하고, 결과를 누르면 그 메시지 위치로 이동(onOpenMessage).
// 최신순 30개씩 이어서 불러옴.
export function RoomMessageSearchPanel({
  roomId,
  accessToken,
  onClose,
  onOpenMessage,
}: {
  roomId: number;
  accessToken: string;
  onClose: () => void;
  onOpenMessage: (messageId: number) => void;
}) {
  const { member } = useAuth();
  const { presenceByMembershipId, memberStatusByMembershipId, myStatusType } =
    useChatNotification();
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // 검색을 여러 번 빠르게 하면 마지막 검색 결과만 반영.
  const searchVersionRef = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const closeByEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeByEscape);
    return () => document.removeEventListener("keydown", closeByEscape);
  }, [onClose]);

  const search = async (keyword: string) => {
    const version = ++searchVersionRef.current;
    setResult({ keyword, items: [], nextCursor: null, status: "loading", loadingMore: false });
    try {
      const page = await chatApi.searchMessages(accessToken, keyword, roomId);
      if (searchVersionRef.current !== version) return;
      setResult({
        keyword,
        items: page.items,
        nextCursor: page.nextCursor,
        status: "loaded",
        loadingMore: false,
      });
    } catch {
      if (searchVersionRef.current !== version) return;
      setResult((current) => current && { ...current, status: "failed" });
    }
  };

  const loadMore = async () => {
    if (!result?.nextCursor || result.loadingMore) return;
    const version = searchVersionRef.current;
    setResult({ ...result, loadingMore: true });
    try {
      const page = await chatApi.searchMessages(
        accessToken,
        result.keyword,
        roomId,
        result.nextCursor,
      );
      if (searchVersionRef.current !== version) return;
      setResult((current) =>
        current
          ? {
              ...current,
              items: [...current.items, ...page.items],
              nextCursor: page.nextCursor,
              loadingMore: false,
            }
          : current,
      );
    } catch {
      if (searchVersionRef.current !== version) return;
      setResult((current) => current && { ...current, loadingMore: false });
    }
  };

  const submit = () => {
    const keyword = input.trim();
    if (keyword) void search(keyword);
  };

  // 보낸 사람 아바타(접속 점·상태 아이콘 포함). 나는 내 상태.
  const avatarOf = (item: ChatMessageSearchItem) => {
    const isMe = item.senderMembershipId === member?.membershipId;
    return (
      <MessageMemberAvatar
        name={item.senderName}
        presenceStatus={
          isMe ? "ONLINE" : (presenceByMembershipId[item.senderMembershipId] ?? "OFFLINE")
        }
        statusType={
          isMe ? myStatusType : memberStatusByMembershipId[item.senderMembershipId]?.statusType
        }
      />
    );
  };

  return (
    <aside className="flex h-full w-[min(420px,40vw)] shrink-0 animate-in slide-in-from-right flex-col border-l border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
        <h2 className="text-base font-bold">대화 내용 검색</h2>
        <button
          type="button"
          aria-label="대화 내용 검색 닫기"
          onClick={onClose}
          className="cursor-pointer rounded p-1 text-slate-500 transition hover:bg-slate-100"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <form
        className="px-5"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 transition focus-within:border-blue-500">
          <Search size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            maxLength={KEYWORD_MAX}
            placeholder="검색어를 입력하고 Enter"
            aria-label="대화 내용 검색어"
            className="min-w-0 flex-1 text-sm outline-none placeholder:text-slate-400"
          />
          {input && (
            <button
              type="button"
              aria-label="검색어 지우기"
              onClick={() => {
                setInput("");
                inputRef.current?.focus();
              }}
              className="cursor-pointer rounded-full p-0.5 text-slate-400 transition hover:bg-slate-100"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </label>
      </form>
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pb-5">
        {!result ? (
          <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-sm text-slate-500">
            <Search size={30} className="text-slate-300" aria-hidden="true" />
            <p>이 대화방에서 주고받은 메시지를 찾아보세요.</p>
          </div>
        ) : result.status === "loading" ? (
          <LoadingState message="검색 중입니다..." className="h-full min-h-48" />
        ) : result.status === "failed" ? (
          <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-sm text-slate-500">
            <p>검색 결과를 불러오지 못했습니다.</p>
            <button
              type="button"
              onClick={() => void search(result.keyword)}
              className="flex cursor-pointer items-center gap-1 rounded-md px-3 py-1.5 font-medium text-blue-600 transition hover:bg-blue-50"
            >
              <RotateCw size={14} aria-hidden="true" />
              다시 시도
            </button>
          </div>
        ) : result.items.length === 0 ? (
          <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-sm text-slate-500">
            <SearchX size={30} className="text-slate-300" aria-hidden="true" />
            <p>&lsquo;{result.keyword}&rsquo;이(가) 들어간 메시지가 없습니다.</p>
          </div>
        ) : (
          <>
            <ul>
              {result.items.map((item) => (
                <li key={item.messageId}>
                  <button
                    type="button"
                    onClick={() => onOpenMessage(item.messageId)}
                    className="flex w-full cursor-pointer items-start gap-3 px-5 py-3 text-left transition hover:bg-slate-50"
                  >
                    {avatarOf(item)}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <b className="truncate text-sm text-slate-900">{item.senderName}</b>
                        <span className="shrink-0 text-xs text-slate-400">
                          {dateLabel(item.createdAt)}
                        </span>
                      </span>
                      {previewLinesOf(item.content, result.keyword).map((line, index) => (
                        <span
                          key={index}
                          className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-slate-600"
                        >
                          {index === 0 && item.forwarded && (
                            <Forward
                              size={13}
                              className="shrink-0 text-slate-400"
                              aria-label="전달된 메시지"
                            />
                          )}
                          <span className="truncate">
                            <Highlight text={line} keyword={result.keyword} />
                          </span>
                        </span>
                      ))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {result.nextCursor && (
              <div className="my-3 flex justify-center">
                {result.loadingMore ? (
                  <LoadingInline
                    message="더 불러오는 중입니다."
                    className="text-xs text-slate-500"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => void loadMore()}
                    className="cursor-pointer rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    더 보기
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
