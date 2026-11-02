"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { BoardPostDetailView } from "@/components/board/board-post-detail";
import { BoardPostForm } from "@/components/board/board-post-form";
import { HomeCard, PostListBody } from "@/components/board/board-post-list";
import { BoardRenameDialog } from "@/components/board/board-rename-dialog";
import {
  BoardSidebar,
  COMMON_BOARDS,
  type BoardMenu,
  type CommonBoardType,
} from "@/components/board/board-sidebar";
import { GlobalHeader } from "@/components/common/global-header";
import { LoadingState, PageLoading } from "@/components/common/loading";
import { Toast } from "@/components/common/toast";
import { useToast } from "@/hooks/use-toast";
import {
  boardApi,
  type BoardHome,
  type BoardItem,
  type BoardPostDetail,
  type BoardPostSummary,
  type BoardView,
} from "@/lib/api/board-api";
import { markAuthenticationRequired } from "@/lib/auth-required-notice";
import { SquarePen } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

// 화면은 주소의 쿼리로 정함(뒤로 가기·새로고침이 그대로 동작).
// 없음: 게시판 홈 / menu=latest|mustRead|important|mine|trash / boardId=N: 게시판 /
// postId=N: 글 보기 / write=1(&boardId=N): 글쓰기 / edit=N: 글 수정
type Screen =
  | { kind: "menu"; menu: BoardMenu }
  | { kind: "post"; postId: number }
  | { kind: "write"; boardId: number | null; type: CommonBoardType | null }
  | { kind: "edit"; postId: number };

const MENU_VIEW: Record<"latest" | "mustRead" | "important" | "mine" | "trash", BoardView> = {
  latest: "LATEST",
  mustRead: "MUST_READ",
  important: "IMPORTANT",
  mine: "MINE",
  trash: "TRASH",
};
const MENU_TITLE: Record<keyof typeof MENU_VIEW, string> = {
  latest: "최신글",
  mustRead: "필독",
  important: "중요",
  mine: "내 게시글",
  trash: "휴지통",
};
const MENU_EMPTY: Record<keyof typeof MENU_VIEW, string> = {
  latest: "아직 올라온 글이 없습니다.",
  mustRead: "필독 글이 없습니다.",
  important: "중요 글이 없습니다.",
  mine: "내가 쓴 글이 없습니다.",
  trash: "휴지통이 비어 있습니다. 지운 글은 30일 동안 여기에 보관됩니다.",
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
  nextCursor: number | null;
  loadingMore: boolean;
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
  // 빠르게 화면을 바꿀 때 늦게 온 이전 응답이 덮어쓰지 않게.
  const listVersionRef = useRef(0);

  const screen = screenOf(new URLSearchParams(searchParams.toString()));
  const menu: BoardMenu = screen.kind === "menu" ? screen.menu : { kind: "home" };
  const listKey =
    screen.kind === "menu" && screen.menu.kind !== "home" ? menuHref(screen.menu) : null;
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
    async (key: string, view: BoardView, boardId: number | null, type: CommonBoardType | null) => {
      if (!accessToken) return;
      const version = ++listVersionRef.current;
      try {
        const page = await boardApi.list(accessToken, view, { boardId, type });
        if (version !== listVersionRef.current) return;
        setList({ key, status: "loaded", ...page, loadingMore: false });
      } catch {
        if (version !== listVersionRef.current) return;
        setList({
          key,
          status: "failed",
          pinned: [],
          items: [],
          nextCursor: null,
          loadingMore: false,
        });
      }
    },
    [accessToken],
  );
  const listView = listTarget?.view ?? null;
  const listBoardId = listTarget?.boardId ?? null;
  const listType = listTarget?.type ?? null;
  useEffect(() => {
    if (listKey && listView)
      void Promise.resolve().then(() => loadList(listKey, listView, listBoardId, listType));
  }, [listKey, listView, listBoardId, listType, loadList]);

  const loadMore = async () => {
    if (!accessToken || !list || !list.nextCursor || list.loadingMore || !listTarget) return;
    const version = listVersionRef.current;
    setList({ ...list, loadingMore: true });
    try {
      const page = await boardApi.list(
        accessToken,
        listTarget.view,
        { boardId: listTarget.boardId, type: listTarget.type },
        list.nextCursor,
      );
      if (version !== listVersionRef.current) return;
      setList(
        (current) =>
          current && {
            ...current,
            items: [...current.items, ...page.items],
            nextCursor: page.nextCursor,
            loadingMore: false,
          },
      );
    } catch {
      setList((current) => current && { ...current, loadingMore: false });
      showToast("글을 더 불러오지 못했습니다.");
    }
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
  const openPost = (target: BoardPostSummary) => go(`/board?postId=${target.id}`);
  const writableBoards = (boards ?? []).filter((board) => board.canWrite);

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

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white text-slate-900">
      <GlobalHeader
        role={member.role}
        pageTitle="게시판"
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
        <section className="min-w-0 flex-1 overflow-y-auto bg-white p-6">
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
                onSaved={(saved) => {
                  showToast("글을 등록했습니다.");
                  router.replace(`/board?postId=${saved.id}`);
                }}
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
                onSaved={(saved) => {
                  showToast("글을 수정했습니다.");
                  setPost({ id: saved.id, detail: saved, failed: false });
                  router.replace(`/board?postId=${saved.id}`);
                }}
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
                onBack={() => router.back()}
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
              <div className="mb-4 flex items-center justify-between gap-4">
                <h1 className="text-xl font-bold">{listTitle}</h1>
                {writeTarget && (
                  <button
                    type="button"
                    onClick={() => go(writeTarget.href)}
                    className="flex cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-95"
                  >
                    <SquarePen size={15} aria-hidden="true" />
                    {writeTarget.inquiry ? "문의하기" : "글쓰기"}
                  </button>
                )}
              </div>
              {(commonType === "INQUIRY" ||
                (menu.kind === "board" && currentBoard?.type === "INQUIRY")) && (
                <p className="mb-3 text-xs text-slate-500">
                  문의 글은 쓴 사람과 관리자만 볼 수 있습니다. 관리자가 댓글로 답변하면 &lsquo;답변
                  완료&rsquo;로 바뀝니다.
                </p>
              )}
              <PostListBody
                status={currentList ? currentList.status : "loading"}
                pinned={currentList?.pinned ?? []}
                items={currentList?.items ?? []}
                hasMore={!!currentList?.nextCursor}
                loadingMore={currentList?.loadingMore ?? false}
                showBoard={menu.kind !== "board" && menu.kind !== "type"}
                showCompany={admin}
                emptyText={
                  menu.kind === "board" || menu.kind === "type"
                    ? "아직 글이 없습니다."
                    : MENU_EMPTY[menu.kind]
                }
                onRetry={() =>
                  listKey &&
                  listTarget &&
                  void loadList(listKey, listTarget.view, listTarget.boardId, listTarget.type)
                }
                onMore={() => void loadMore()}
                onOpen={openPost}
              />
            </div>
          )}
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
      <h1 className="mb-8 text-xl font-bold">게시판 홈</h1>
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
