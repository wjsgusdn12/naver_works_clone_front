"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { BoardContentHeader } from "@/components/board/board-content-header";
import { BoardPostDetailView } from "@/components/board/board-post-detail";
import { BoardPostForm, formatPublishAt } from "@/components/board/board-post-form";
import { BoardPostSearch } from "@/components/board/board-post-search";
import { HomeCard, PostListBody } from "@/components/board/board-post-list";
import { BoardRenameDialog } from "@/components/board/board-rename-dialog";
import {
  BoardSidebar,
  COMMON_BOARDS,
  type BoardMenu,
  type CommonBoardType,
} from "@/components/board/board-sidebar";
import { GlobalHeader } from "@/components/common/global-header";
import { CustomCheckbox } from "@/components/common/custom-checkbox";
import { CustomSelect } from "@/components/common/custom-select";
import { LoadingState, PageLoading, Spinner } from "@/components/common/loading";
import { Pagination } from "@/components/common/pagination";
import { Toast } from "@/components/common/toast";
import { useToast } from "@/hooks/use-toast";
import {
  boardApi,
  type BoardHome,
  type BoardItem,
  type BoardListSort,
  type BoardSaveMode,
  type BoardPostDetail,
  type BoardPostSummary,
  type BoardView,
} from "@/lib/api/board-api";
import { markAuthenticationRequired } from "@/lib/auth-required-notice";
import { MailOpen, SquarePen } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

// 화면은 주소의 쿼리로 정함(뒤로 가기·새로고침이 그대로 동작).
// 없음: 게시판 홈 / menu=latest|mustRead|important|mine|trash / boardId=N: 게시판 /
// postId=N: 글 보기 / write=1(&boardId=N): 글쓰기 / edit=N: 글 수정
// 목록에는 page=N(1부터)·q=검색어를 덧붙임
type Screen =
  | { kind: "menu"; menu: BoardMenu }
  | { kind: "post"; postId: number }
  | { kind: "write"; boardId: number | null; type: CommonBoardType | null }
  | { kind: "edit"; postId: number };

const MENU_VIEW: Record<
  "latest" | "mustRead" | "important" | "mine" | "trash" | "drafts" | "scheduled",
  BoardView
> = {
  latest: "LATEST",
  mustRead: "MUST_READ",
  important: "IMPORTANT",
  mine: "MINE",
  trash: "TRASH",
  drafts: "DRAFTS",
  scheduled: "SCHEDULED",
};
const MENU_TITLE: Record<keyof typeof MENU_VIEW, string> = {
  latest: "최신글",
  mustRead: "필독",
  important: "중요",
  mine: "내 게시글",
  trash: "휴지통",
  drafts: "임시저장함",
  scheduled: "예약함",
};
const MENU_EMPTY: Record<keyof typeof MENU_VIEW, string> = {
  latest: "아직 올라온 글이 없습니다.",
  mustRead: "필독 글이 없습니다.",
  important: "중요 글이 없습니다.",
  mine: "내가 쓴 글이 없습니다.",
  trash: "휴지통이 비어 있습니다. 지운 글은 30일 동안 여기에 보관됩니다.",
  drafts: "임시저장한 글이 없습니다.",
  scheduled: "등록 예약한 글이 없습니다.",
};

// 목록 보기 설정(n개씩·정렬·안읽음). 게시판을 옮겨도 유지하고, 이 브라우저에 기억해 둠.
type ListPrefs = { size: number; sort: BoardListSort; unread: boolean };
const DEFAULT_PREFS: ListPrefs = { size: 20, sort: "CREATED", unread: false };
const PREFS_STORAGE_KEY = "board-list-prefs";
const SIZE_OPTIONS = [10, 20, 30, 40, 50].map((size) => ({
  value: String(size),
  label: `${size}개씩 보기`,
}));
const SORT_OPTIONS = [
  { value: "CREATED", label: "글 등록순" },
  { value: "ACTIVITY", label: "글/댓글 업데이트 순" },
];
const FILTER_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "unread", label: "안읽음" },
];
const loadPrefs = (): ListPrefs => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(PREFS_STORAGE_KEY) ?? "null");
    return {
      size: [10, 20, 30, 40, 50].includes(saved?.size) ? saved.size : DEFAULT_PREFS.size,
      sort: saved?.sort === "ACTIVITY" ? "ACTIVITY" : "CREATED",
      unread: saved?.unread === true,
    };
  } catch {
    return DEFAULT_PREFS;
  }
};

const numberParam = (value: string | null) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};

const screenOf = (params: URLSearchParams): Screen => {
  const postId = numberParam(params.get("postId"));
  const editId = numberParam(params.get("edit"));
  const boardId = numberParam(params.get("boardId"));
  if (editId) return { kind: "edit", postId: editId };
  const type = COMMON_BOARDS.find((item) => item.type === params.get("type"))?.type ?? null;
  if (params.get("write")) return { kind: "write", boardId, type };
  if (postId) return { kind: "post", postId };
  if (boardId) return { kind: "menu", menu: { kind: "board", boardId } };
  if (type) return { kind: "menu", menu: { kind: "type", type } };
  const menu = params.get("menu");
  if (menu && menu in MENU_VIEW)
    return { kind: "menu", menu: { kind: menu as keyof typeof MENU_VIEW } };
  return { kind: "menu", menu: { kind: "home" } };
};

const menuHref = (menu: BoardMenu) =>
  menu.kind === "home"
    ? "/board"
    : menu.kind === "board"
      ? `/board?boardId=${menu.boardId}`
      : menu.kind === "type"
        ? `/board?type=${menu.type}`
        : `/board?menu=${menu.kind}`;

// 목록 한 화면의 상태. key가 지금 화면과 다르면(다른 메뉴로 옮긴 직후) 불러오는 중으로 봄.
type ListState = {
  key: string;
  status: "loaded" | "failed";
  pinned: BoardPostSummary[];
  items: BoardPostSummary[];
  totalPages: number;
  totalElements: number;
};

// 목록 주소에 쪽 번호(화면에는 1부터, 1쪽이면 생략)·검색어를 붙임.
const listHref = (menu: BoardMenu, page: number, keyword: string) => {
  const query = new URLSearchParams();
  if (page > 0) query.set("page", String(page + 1));
  if (keyword) query.set("q", keyword);
  const extra = query.toString();
  const base = menuHref(menu);
  return extra ? `${base}${base.includes("?") ? "&" : "?"}${extra}` : base;
};

export default function BoardPage() {
  // URL 쿼리는 런타임 값이라 Suspense 경계 안에서 읽음.
  return (
    <Suspense fallback={<PageLoading />}>
      <BoardContent />
    </Suspense>
  );
}

function BoardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, member, status, logout } = useAuth();
  const { toast, showToast, dismissToast } = useToast();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [boards, setBoards] = useState<BoardItem[] | null>(null);
  // 관리자면 여러 회사 글이 한 목록에 섞이므로 글 줄에 회사 이름도 보여 줌
  const [admin, setAdmin] = useState(false);
  const [home, setHome] = useState<BoardHome | null>(null);
  const [homeFailed, setHomeFailed] = useState(false);
  const [list, setList] = useState<ListState | null>(null);
  const [post, setPost] = useState<{
    id: number;
    detail: BoardPostDetail | null;
    failed: boolean;
  } | null>(null);
  const [renaming, setRenaming] = useState<BoardItem | null>(null);
  const [checked, setChecked] = useState<{ key: string | null; ids: number[] }>({
    key: null,
    ids: [],
  });
  const [markingRead, setMarkingRead] = useState(false);
  const [prefs, setPrefs] = useState<ListPrefs>(() =>
    typeof window === "undefined" ? DEFAULT_PREFS : loadPrefs(),
  );
  // 빠르게 화면을 바꿀 때 늦게 온 이전 응답이 덮어쓰지 않게.
  const listVersionRef = useRef(0);

  const screen = screenOf(new URLSearchParams(searchParams.toString()));
  const menu: BoardMenu = screen.kind === "menu" ? screen.menu : { kind: "home" };
  const listPage = Math.max((numberParam(searchParams.get("page")) ?? 1) - 1, 0);
  const listKeyword = (searchParams.get("q") ?? "").trim();
  const listKey =
    screen.kind === "menu" && screen.menu.kind !== "home"
      ? `${listHref(screen.menu, listPage, listKeyword)}|${prefs.size}|${prefs.sort}|${prefs.unread}`
      : null;
  // 목록 쪽을 넘기면 오른쪽 화면을 맨 위로
  const contentRef = useRef<HTMLElement>(null);
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [listKey]);
  const postId = screen.kind === "post" || screen.kind === "edit" ? screen.postId : null;

  useEffect(() => {
    if (status === "unauthenticated") {
      if (!isLoggingOut) markAuthenticationRequired();
      router.replace("/");
    }
  }, [isLoggingOut, router, status]);

  const loadBoards = useCallback(async () => {
    if (!accessToken) return;
    try {
      const sidebar = await boardApi.sidebar(accessToken);
      setBoards(sidebar.boards);
      setAdmin(sidebar.admin);
    } catch (error) {
      setBoards([]);
      showToast(error instanceof Error ? error.message : "게시판 목록을 불러오지 못했습니다.");
    }
  }, [accessToken, showToast]);

  useEffect(() => {
    // 상태 변경은 응답을 받은 뒤에 하도록 다음 차례로 미룸(effect 안에서 바로 바꾸지 않음).
    void Promise.resolve().then(loadBoards);
  }, [loadBoards]);

  // 게시판 홈
  const loadHome = useCallback(async () => {
    if (!accessToken) return;
    try {
      setHome(await boardApi.home(accessToken));
      setHomeFailed(false);
    } catch {
      setHomeFailed(true);
    }
  }, [accessToken]);
  const isHome = screen.kind === "menu" && screen.menu.kind === "home";
  useEffect(() => {
    if (isHome) void Promise.resolve().then(loadHome);
  }, [isHome, loadHome]);

  // 목록(메뉴·게시판)
  type ListTarget = { view: BoardView; boardId: number | null; type: CommonBoardType | null };
  const viewOf = (target: BoardMenu): ListTarget | null =>
    target.kind === "home"
      ? null
      : target.kind === "board"
        ? { view: "BOARD", boardId: target.boardId, type: null }
        : target.kind === "type"
          ? { view: "TYPE", boardId: null, type: target.type }
          : { view: MENU_VIEW[target.kind], boardId: null, type: null };
  const listTarget = viewOf(menu);
  const loadList = useCallback(
    async (
      key: string,
      view: BoardView,
      boardId: number | null,
      type: CommonBoardType | null,
      page: number,
      keyword: string,
      listPrefs: ListPrefs,
    ) => {
      if (!accessToken) return;
      const version = ++listVersionRef.current;
      try {
        const result = await boardApi.list(
          accessToken,
          view,
          { boardId, type },
          { page, keyword, ...listPrefs },
        );
        if (version !== listVersionRef.current) return;
        setList({ key, status: "loaded", ...result });
      } catch {
        if (version !== listVersionRef.current) return;
        setList({ key, status: "failed", pinned: [], items: [], totalPages: 0, totalElements: 0 });
      }
    },
    [accessToken],
  );
  const listView = listTarget?.view ?? null;
  const listBoardId = listTarget?.boardId ?? null;
  const listType = listTarget?.type ?? null;
  useEffect(() => {
    if (listKey && listView)
      void Promise.resolve().then(() =>
        loadList(listKey, listView, listBoardId, listType, listPage, listKeyword, prefs),
      );
    // prefs는 listKey에 들어 있어 바뀌면 다시 불러옴
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey, listView, listBoardId, listType, listPage, listKeyword, loadList]);

  // 보기 설정을 바꾸면 기억해 두고 1쪽부터
  const changePrefs = (next: Partial<ListPrefs>) => {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    try {
      window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // 저장 못 해도 이번 화면에서는 적용됨
    }
    if (listPage > 0) router.replace(listHref(menu, 0, listKeyword));
  };

  // 글 보기·수정
  const loadPost = useCallback(
    async (id: number) => {
      if (!accessToken) return;
      try {
        const detail = await boardApi.detail(accessToken, id);
        setPost({ id, detail, failed: false });
      } catch (error) {
        setPost({ id, detail: null, failed: true });
        showToast(error instanceof Error ? error.message : "글을 불러오지 못했습니다.");
      }
    },
    [accessToken, showToast],
  );
  useEffect(() => {
    if (postId) void Promise.resolve().then(() => loadPost(postId));
  }, [postId, loadPost]);
  const currentPost = post && post.id === postId ? post : null;

  const go = (href: string) => router.push(href);
  // 임시저장·예약 글은 보기 대신 바로 이어 쓰기(수정 화면)
  const openPost = (target: BoardPostSummary) =>
    go(target.status === "PUBLISHED" ? `/board?postId=${target.id}` : `/board?edit=${target.id}`);
  const writableBoards = (boards ?? []).filter((board) => board.canWrite);

  // 저장한 뒤: 임시저장이면 그 글 수정 화면에 남아 이어 쓰기, 예약이면 예약함, 등록·수정이면 글 보기.
  const afterSave = (saved: BoardPostDetail, mode: BoardSaveMode, verb: "등록" | "수정") => {
    setPost({ id: saved.id, detail: saved, failed: false });
    if (mode === "DRAFT") {
      showToast("임시저장했습니다.");
      router.replace(`/board?edit=${saved.id}`);
    } else if (mode === "SCHEDULE") {
      showToast(`${formatPublishAt(saved.publishAt ?? "")}에 등록하도록 예약했습니다.`);
      router.replace("/board?menu=scheduled");
    } else {
      showToast(
        saved.status === "PUBLISHED" && verb === "수정"
          ? "글을 수정했습니다."
          : "글을 등록했습니다.",
      );
      router.replace(`/board?postId=${saved.id}`);
    }
  };

  const toggleFavorite = async (board: BoardItem) => {
    if (!accessToken) return;
    try {
      const favorite = await boardApi.toggleFavorite(accessToken, board.id);
      setBoards(
        (current) =>
          current && current.map((item) => (item.id === board.id ? { ...item, favorite } : item)),
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : "즐겨찾기를 바꾸지 못했습니다.");
    }
  };

  const rename = async (board: BoardItem, name: string) => {
    if (!accessToken) return;
    try {
      const renamed = await boardApi.rename(accessToken, board.id, name);
      setBoards(
        (current) =>
          current &&
          current.map((item) => (item.id === board.id ? { ...item, name: renamed.name } : item)),
      );
      showToast("게시판 이름을 바꿨습니다.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "게시판 이름을 바꾸지 못했습니다.");
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    router.replace("/");
  };

  if (status !== "authenticated" || !member || !accessToken) return <PageLoading />;

  const currentBoard =
    menu.kind === "board" ? (boards ?? []).find((board) => board.id === menu.boardId) : null;
  const commonType = menu.kind === "type" ? menu.type : null;
  const commonLabel = COMMON_BOARDS.find((item) => item.type === commonType)?.label ?? "";
  // 글쓰기 버튼: 게시판이면 그 게시판, 공통 메뉴면 그 종류 중 내 회사 게시판(관리자는 글쓰기 화면에서 회사 선택)
  const writeTarget =
    menu.kind === "board"
      ? currentBoard?.canWrite
        ? {
            href: `/board?write=1&boardId=${menu.boardId}`,
            inquiry: currentBoard.type === "INQUIRY",
          }
        : null
      : commonType && (boards ?? []).some((board) => board.type === commonType && board.canWrite)
        ? { href: `/board?write=1&type=${commonType}`, inquiry: commonType === "INQUIRY" }
        : null;
  const listTitle =
    menu.kind === "type"
      ? commonLabel
      : menu.kind === "board"
        ? currentBoard
          ? currentBoard.myCompany
            ? currentBoard.name
            : `${currentBoard.companyName} · ${currentBoard.name}`
          : "게시판"
        : menu.kind === "home"
          ? ""
          : MENU_TITLE[menu.kind];
  const currentList = list && list.key === listKey ? list : null;
  // 읽음 처리할 글 고르기(휴지통 제외). 다른 목록·쪽으로 옮기면 key가 달라져 자동으로 비워짐.
  // 내 글 보관함(휴지통·임시저장함·예약함)은 읽음 처리·정렬·안읽음 거르기가 의미 없어 뺌
  const personalBox = menu.kind === "trash" || menu.kind === "drafts" || menu.kind === "scheduled";
  const selectable = !personalBox && currentList?.status === "loaded";
  const listPostIds = currentList
    ? [...currentList.pinned, ...currentList.items].map((item) => item.id)
    : [];
  const checkedIds = checked.key === listKey ? checked.ids : [];
  const allChecked = listPostIds.length > 0 && listPostIds.every((id) => checkedIds.includes(id));
  const toggleChecked = (postId: number) =>
    setChecked({
      key: listKey,
      ids: checkedIds.includes(postId)
        ? checkedIds.filter((id) => id !== postId)
        : [...checkedIds, postId],
    });
  const markCheckedRead = async () => {
    if (!accessToken || checkedIds.length === 0 || markingRead) return;
    setMarkingRead(true);
    try {
      await boardApi.markRead(accessToken, checkedIds);
      const done = new Set(checkedIds);
      // 화면의 글도 바로 읽음으로(안 읽었던 글은 조회수 1 증가)
      const mark = (item: BoardPostSummary) =>
        done.has(item.id) && !item.read
          ? { ...item, read: true, viewCount: item.viewCount + 1 }
          : item;
      setList(
        (current) =>
          current && {
            ...current,
            pinned: current.pinned.map(mark),
            items: current.items.map(mark),
          },
      );
      setChecked({ key: null, ids: [] });
      showToast(`${done.size}개 글을 읽음으로 표시했습니다.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "읽음으로 표시하지 못했습니다.");
    } finally {
      setMarkingRead(false);
    }
  };
  // 오른쪽 화면 공통 머리줄 제목. 글 보기는 그 글의 게시판 이름.
  const postBoard = currentPost?.detail?.board;
  const headerTitle =
    screen.kind === "write"
      ? "글쓰기"
      : screen.kind === "edit"
        ? "글 수정"
        : screen.kind === "post"
          ? postBoard
            ? postBoard.myCompany
              ? postBoard.name
              : `${postBoard.companyName} · ${postBoard.name}`
            : "게시글"
          : menu.kind === "home"
            ? "게시판 홈"
            : listTitle;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white text-slate-900">
      <GlobalHeader
        role={member.role}
        pageTitle="게시판"
        headerContent={
          // 어느 화면에서든 게시판 전체(볼 수 있는 모든 게시판 = 최신글 목록)에서 찾음
          <BoardPostSearch
            key={`${menu.kind}|${listKeyword}`}
            keyword={menu.kind === "latest" ? listKeyword : ""}
            onSearch={(keyword) => go(listHref({ kind: "latest" }, 0, keyword))}
          />
        }
        isAuthenticated
        profileName={member.displayName}
        onToast={showToast}
        isProfileMenuOpen={isProfileMenuOpen}
        onHomeAction={() => router.push("/home")}
        onServiceAction={(label) => showToast(`${label} 기능은 준비 중입니다.`)}
        onProfileAction={() => setIsProfileMenuOpen((open) => !open)}
        onCloseProfileMenu={() => setIsProfileMenuOpen(false)}
        onLogout={() => void handleLogout()}
      />
      <main className="flex min-h-0 flex-1">
        <BoardSidebar
          boards={boards ?? []}
          loading={boards === null}
          menu={menu}
          onSelect={(target) => go(menuHref(target))}
          onWrite={() =>
            go(
              menu.kind === "board"
                ? `/board?write=1&boardId=${menu.boardId}`
                : menu.kind === "type"
                  ? `/board?write=1&type=${menu.type}`
                  : "/board?write=1",
            )
          }
          onToggleFavorite={(board) => void toggleFavorite(board)}
          onRename={setRenaming}
        />
        <section ref={contentRef} className="min-w-0 flex-1 overflow-y-auto bg-white">
          {/* 게시판 홈에는 머리줄 없이 영역 목록만 */}
          {!isHome && (
            <BoardContentHeader
              title={headerTitle}
              onBack={screen.kind === "menu" ? undefined : () => router.back()}
              actions={
                listKey &&
                writeTarget && (
                  <button
                    type="button"
                    onClick={() => go(writeTarget.href)}
                    className="flex cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-95"
                  >
                    <SquarePen size={15} aria-hidden="true" />
                    {writeTarget.inquiry ? "문의하기" : "글쓰기"}
                  </button>
                )
              }
            />
          )}
          <div className="p-6">
            {screen.kind === "write" ? (
              boards === null ? (
                <LoadingState message="게시판을 불러오는 중입니다..." className="min-h-64" />
              ) : (
                <BoardPostForm
                  key={`write-${screen.boardId ?? 0}-${screen.type ?? ""}`}
                  accessToken={accessToken}
                  boards={writableBoards}
                  initialBoardId={
                    screen.boardId ??
                    writableBoards.find((board) => board.myCompany && board.type === screen.type)
                      ?.id ??
                    writableBoards.find((board) => board.type === screen.type)?.id ??
                    null
                  }
                  editing={null}
                  onCancel={() => router.back()}
                  onSaved={(saved, mode) => afterSave(saved, mode, "등록")}
                  onToast={showToast}
                />
              )
            ) : screen.kind === "edit" ? (
              !currentPost?.detail ? (
                <LoadingState message="글을 불러오는 중입니다..." className="min-h-64" />
              ) : (
                <BoardPostForm
                  key={`edit-${currentPost.id}-${currentPost.detail.version}`}
                  accessToken={accessToken}
                  boards={writableBoards}
                  initialBoardId={null}
                  editing={currentPost.detail}
                  onCancel={() => router.back()}
                  onSaved={(saved, mode) => afterSave(saved, mode, "수정")}
                  onToast={showToast}
                />
              )
            ) : screen.kind === "post" ? (
              currentPost?.failed ? (
                <p className="flex min-h-64 items-center justify-center text-sm text-slate-500">
                  글을 찾을 수 없습니다. 지워졌거나 볼 수 없는 글입니다.
                </p>
              ) : !currentPost?.detail ? (
                <LoadingState message="글을 불러오는 중입니다..." className="min-h-64" />
              ) : (
                <BoardPostDetailView
                  key={currentPost.id}
                  post={currentPost.detail}
                  accessToken={accessToken}
                  myMembershipId={member.membershipId}
                  onEdit={() => go(`/board?edit=${currentPost.id}`)}
                  onChanged={(detail) => setPost({ id: detail.id, detail, failed: false })}
                  onDeleted={() => {
                    showToast("글을 휴지통으로 옮겼습니다.");
                    router.replace(`/board?boardId=${currentPost.detail!.board.id}`);
                  }}
                  onRestored={() => {
                    showToast("글을 복구했습니다.");
                    void loadPost(currentPost.id);
                  }}
                  onToast={showToast}
                />
              )
            ) : menu.kind === "home" ? (
              <HomeScreen
                home={home}
                failed={homeFailed}
                onRetry={() => void loadHome()}
                onOpen={openPost}
                onGo={go}
              />
            ) : (
              <div className="w-full">
                {(commonType === "INQUIRY" ||
                  (menu.kind === "board" && currentBoard?.type === "INQUIRY")) && (
                  <p className="mb-3 text-xs text-slate-500">
                    문의 글은 쓴 사람과 관리자만 볼 수 있습니다. 관리자가 댓글로 답변하면
                    &lsquo;답변 완료&rsquo;로 바뀝니다.
                  </p>
                )}
                {listKeyword && currentList?.status === "loaded" && (
                  <p className="mb-3 text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">
                      &lsquo;{listKeyword}&rsquo;
                    </span>{" "}
                    검색 결과 {currentList.totalElements}건
                  </p>
                )}
                {/* 목록 도구 줄: 왼쪽은 전체 선택·읽음, 오른쪽은 보기 설정(휴지통은 n개씩 보기만) */}
                <div className="mb-2 flex min-h-8 items-center gap-2 px-1">
                  {selectable && listPostIds.length > 0 && (
                    <>
                      <CustomCheckbox
                        label="이 쪽 글 전체 선택"
                        checked={allChecked}
                        onChange={() =>
                          setChecked({ key: listKey, ids: allChecked ? [] : listPostIds })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => void markCheckedRead()}
                        disabled={checkedIds.length === 0 || markingRead}
                        className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 px-3 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {markingRead ? (
                          <Spinner size={13} />
                        ) : (
                          <MailOpen size={14} aria-hidden="true" />
                        )}
                        읽음
                      </button>
                      {checkedIds.length > 0 && (
                        <span className="text-xs text-blue-600">{checkedIds.length}개 선택</span>
                      )}
                    </>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <CustomSelect
                      compact
                      label="n개씩 보기"
                      value={String(prefs.size)}
                      onChange={(value) => changePrefs({ size: Number(value) })}
                      options={SIZE_OPTIONS}
                      className="w-32"
                    />
                    {!personalBox && (
                      <>
                        <CustomSelect
                          compact
                          label="보기 정렬"
                          value={prefs.sort}
                          onChange={(value) => changePrefs({ sort: value as BoardListSort })}
                          options={SORT_OPTIONS}
                          className="w-44"
                        />
                        <CustomSelect
                          compact
                          label="필터"
                          value={prefs.unread ? "unread" : "all"}
                          onChange={(value) => changePrefs({ unread: value === "unread" })}
                          options={FILTER_OPTIONS}
                          className="w-24"
                        />
                      </>
                    )}
                  </div>
                </div>
                <PostListBody
                  status={currentList ? currentList.status : "loading"}
                  checkedIds={checkedIds}
                  onCheck={selectable ? toggleChecked : undefined}
                  pinned={currentList?.pinned ?? []}
                  items={currentList?.items ?? []}
                  showBoard={menu.kind !== "board" && menu.kind !== "type"}
                  showCompany={admin}
                  emptyText={
                    listKeyword
                      ? "검색 결과가 없습니다."
                      : prefs.unread && !personalBox
                        ? "안 읽은 글이 없습니다."
                        : menu.kind === "board" || menu.kind === "type"
                          ? "아직 글이 없습니다."
                          : MENU_EMPTY[menu.kind]
                  }
                  onRetry={() =>
                    listKey &&
                    listTarget &&
                    void loadList(
                      listKey,
                      listTarget.view,
                      listTarget.boardId,
                      listTarget.type,
                      listPage,
                      listKeyword,
                      prefs,
                    )
                  }
                  onOpen={openPost}
                />
                {/* 쪽 번호는 글이 한 쪽뿐이어도 항상 아래에 */}
                {currentList?.status === "loaded" && (
                  <Pagination
                    page={listPage}
                    totalPages={Math.max(currentList.totalPages, 1)}
                    onChange={(page) => go(listHref(menu, page, listKeyword))}
                    label="글 목록 페이지"
                    className="mt-6"
                  />
                )}
              </div>
            )}
          </div>
        </section>
      </main>
      {renaming && (
        <BoardRenameDialog
          board={renaming}
          onClose={() => setRenaming(null)}
          onSave={(name) => rename(renaming, name)}
        />
      )}
      {toast && (
        <Toast key={toast.id} message={toast.message} phase={toast.phase} onClose={dismissToast} />
      )}
    </div>
  );
}

// 게시판 홈: 최신글·공지사항·자유게시판·문의하기 순으로 한 줄에 하나씩(테두리·아이콘 없이 제목 줄과 목록만)
function HomeScreen({
  home,
  failed,
  onRetry,
  onOpen,
  onGo,
}: {
  home: BoardHome | null;
  failed: boolean;
  onRetry: () => void;
  onOpen: (post: BoardPostSummary) => void;
  onGo: (href: string) => void;
}) {
  if (!home) {
    return failed ? (
      <div className="flex min-h-64 flex-col items-center justify-center gap-2 text-sm text-slate-500">
        <p>게시판 홈을 불러오지 못했습니다.</p>
        <button
          type="button"
          onClick={onRetry}
          className="cursor-pointer rounded-md px-3 py-1.5 font-medium text-blue-600 transition hover:bg-blue-50"
        >
          다시 시도
        </button>
      </div>
    ) : (
      <LoadingState message="게시판 홈을 불러오는 중입니다..." className="min-h-64" />
    );
  }
  return (
    <div className="w-full">
      <div className="flex flex-col gap-10">
        <HomeCard
          title="최신글"
          posts={home.latest}
          emptyText="아직 올라온 글이 없습니다."
          onMore={() => onGo("/board?menu=latest")}
          onOpen={onOpen}
        />
        <HomeCard
          title="공지사항"
          posts={home.notices}
          emptyText="공지사항이 없습니다."
          onMore={() => onGo("/board?type=NOTICE")}
          onOpen={onOpen}
        />
        <HomeCard
          title="자유게시판"
          posts={home.free}
          emptyText="자유게시판에 글이 없습니다."
          onMore={() => onGo("/board?type=FREE")}
          onOpen={onOpen}
        />
        <HomeCard
          title="문의하기"
          posts={home.inquiries}
          emptyText="문의 내역이 없습니다."
          onMore={() => onGo("/board?type=INQUIRY")}
          onOpen={onOpen}
          answerBadge
        />
      </div>
    </div>
  );
}
