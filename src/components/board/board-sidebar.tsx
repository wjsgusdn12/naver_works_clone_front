"use client";

import { FavoriteButton } from "@/components/common/favorite-button";
import { LoadingInline } from "@/components/common/loading";
import { Tooltip } from "@/components/common/tooltip";
import type { BoardItem, BoardType } from "@/lib/api/board-api";
import {
  BellRing,
  Building2,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileClock,
  FilePen,
  Star,
  House,
  Megaphone,
  MessageSquare,
  MessagesSquare,
  Pencil,
  Search,
  SquarePen,
  Trash2,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

// 사이드바에서 고른 곳. 게시판 홈·모아보기 메뉴·휴지통·공통 게시판(종류)·게시판 하나.
export type CommonBoardType = "NOTICE" | "FREE" | "INQUIRY";
export type BoardMenu =
  | { kind: "home" }
  | { kind: "latest" | "mustRead" | "important" | "mine" | "trash" | "drafts" | "scheduled" }
  | { kind: "type"; type: CommonBoardType }
  | { kind: "board"; boardId: number };

// 공통 메뉴: 회사와 상관없는 프로젝트 전체 게시판(모든 사용자가 같은 게시판을 봄).
export const COMMON_BOARDS: { type: CommonBoardType; label: string }[] = [
  { type: "NOTICE", label: "공지사항" },
  { type: "FREE", label: "자유게시판" },
  { type: "INQUIRY", label: "문의하기" },
];

const QUICK_MENUS: {
  kind: "latest" | "mustRead" | "important" | "mine";
  label: string;
  icon: LucideIcon;
}[] = [
  { kind: "latest", label: "최신글", icon: Clock3 },
  { kind: "mustRead", label: "필독", icon: BellRing },
  { kind: "important", label: "중요", icon: Star },
  { kind: "mine", label: "내 게시글", icon: FilePen },
];

const TYPE_ICON: Record<BoardType, LucideIcon> = {
  NOTICE: Megaphone,
  FREE: MessagesSquare,
  INQUIRY: MessageSquare,
  COMPANY: Building2,
  DEPARTMENT: UsersRound,
};

export function BoardSidebar({
  boards,
  loading,
  menu,
  onSelect,
  onWrite,
  onToggleFavorite,
  onRename,
}: {
  boards: BoardItem[];
  loading: boolean;
  menu: BoardMenu;
  onSelect: (menu: BoardMenu) => void;
  onWrite: () => void;
  onToggleFavorite: (board: BoardItem) => void;
  onRename: (board: BoardItem) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setClosed((current) => ({ ...current, [key]: !current[key] }));
  const query = keyword.trim().toLowerCase();
  const matches = (board: BoardItem) => !query || board.name.toLowerCase().includes(query);

  const favorites = boards.filter((board) => board.favorite && matches(board));
  const commons = COMMON_BOARDS.filter(
    (item) =>
      boards.some((board) => board.type === item.type) &&
      (!query || item.label.toLowerCase().includes(query)),
  );
  // 회사별: 회사는 부서 게시판을 묶는 경로(폴더)일 뿐, 실제 게시판은 그 아래 부서 게시판.
  const departmentBoards = boards.filter((board) => board.type === "DEPARTMENT");
  const companies = [
    ...new Map(departmentBoards.map((board) => [board.companyId, board])).values(),
  ].map((sample) => ({
    companyId: sample.companyId,
    companyName: sample.companyName,
    children: departmentBoards
      .filter((board) => board.companyId === sample.companyId)
      .sort((a, b) => a.name.localeCompare(b.name, "ko"))
      .filter(matches),
  }));
  const isSelected = (board: BoardItem) => menu.kind === "board" && menu.boardId === board.id;

  const row = (board: BoardItem, indent = 0) => (
    <BoardRow
      key={board.id}
      board={board}
      indent={indent}
      selected={isSelected(board)}
      onSelect={() => onSelect({ kind: "board", boardId: board.id })}
      onToggleFavorite={() => onToggleFavorite(board)}
      onRename={() => onRename(board)}
    />
  );

  // 위(글쓰기·메뉴·검색)와 아래(휴지통)는 고정하고 게시판 목록만 스크롤
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50 p-3">
      <button
        type="button"
        onClick={onWrite}
        className="mb-3 flex h-11 w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-slate-950 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-[.98]"
      >
        <SquarePen size={16} aria-hidden="true" />
        글쓰기
      </button>
      <div className="grid shrink-0 grid-cols-4 border-b border-slate-200 pb-3 text-xs">
        {QUICK_MENUS.map(({ kind, label, icon: Icon }) => (
          <button
            key={kind}
            type="button"
            aria-current={menu.kind === kind ? "page" : undefined}
            onClick={() => onSelect({ kind })}
            className={`cursor-pointer rounded-md py-2 transition hover:bg-slate-100 ${menu.kind === kind ? "text-blue-600" : "text-slate-600"}`}
          >
            <Icon className="mx-auto mb-1" size={18} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      <label className="mt-3 flex h-9 shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 transition focus-within:border-blue-500">
        <Search size={15} className="shrink-0 text-slate-400" aria-hidden="true" />
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="게시판 이름 검색"
          aria-label="게시판 이름 검색"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
        {keyword && (
          <button
            type="button"
            aria-label="검색어 지우기"
            onClick={() => setKeyword("")}
            className="cursor-pointer rounded-full p-0.5 text-slate-400 transition hover:bg-slate-100"
          >
            <X size={13} aria-hidden="true" />
          </button>
        )}
      </label>
      {/* 게시판 홈(최신글·공지·자유·문의 미리보기)으로 */}
      <button
        type="button"
        aria-current={menu.kind === "home" ? "page" : undefined}
        onClick={() => onSelect({ kind: "home" })}
        className={`mt-2 flex w-full shrink-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${menu.kind === "home" ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-700 hover:bg-slate-100"}`}
      >
        <House size={15} className="shrink-0 opacity-70" aria-hidden="true" />
        게시판 홈
      </button>

      <nav
        aria-label="게시판 목록"
        className="-mx-1 mt-3 min-h-0 flex-1 overflow-y-auto px-1 text-sm"
      >
        {loading ? (
          <LoadingInline
            message="게시판을 불러오는 중입니다."
            className="px-3 py-2 text-xs text-slate-500"
          />
        ) : (
          <>
            <Section title="즐겨찾기" open={!closed.favorite} onToggle={() => toggle("favorite")}>
              {favorites.length > 0 ? (
                favorites.map((board) => row(board))
              ) : (
                <p className="px-3 py-1.5 text-xs text-slate-400">
                  {query
                    ? "맞는 게시판이 없습니다."
                    : "게시판에 마우스를 올려 별을 눌러 추가하세요."}
                </p>
              )}
            </Section>
            <Section title="전체게시판" open={!closed.all} onToggle={() => toggle("all")}>
              {commons.map((item) => {
                const Icon = TYPE_ICON[item.type];
                const selected = menu.kind === "type" && menu.type === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    aria-current={selected ? "page" : undefined}
                    onClick={() => onSelect({ kind: "type", type: item.type })}
                    className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left ${selected ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-700 hover:bg-slate-100"}`}
                  >
                    <Icon size={15} className="shrink-0 opacity-70" aria-hidden="true" />
                    {item.label}
                  </button>
                );
              })}
            </Section>
            <Section
              title="회사별게시판"
              open={!closed.companies}
              onToggle={() => toggle("companies")}
            >
              {companies
                .filter((company) => company.children.length > 0)
                .map((company) => {
                  const key = `company-${company.companyId}`;
                  // 검색 중에는 맞는 게시판이 보이도록 펼침
                  const open = !!query || !closed[key];
                  return (
                    <div key={company.companyId}>
                      {/* 회사 줄: 게시판이 아니라 폴더. 누르면 부서 게시판 목록을 접고 폄 */}
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => toggle(key)}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-md py-1.5 pl-0.5 pr-2 text-left text-slate-700 transition hover:bg-slate-100"
                      >
                        <span className="flex w-5 shrink-0 justify-center text-slate-500">
                          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                        <Building2 size={15} className="shrink-0 opacity-70" aria-hidden="true" />
                        <span className="truncate">{company.companyName}</span>
                      </button>
                      {open && company.children.length > 0 && (
                        // 회사 아이콘 아래에서 시작하는 세로선 + 한 단계 더 들여쓴 부서 게시판(회사 소속이 한눈에 보이게)
                        <div className="mb-1 ml-[31px] border-l border-slate-200 pl-2">
                          {company.children.map((board) => row(board))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </Section>
          </>
        )}
      </nav>

      {/* 아래 고정: 임시저장함 · 예약함 · 휴지통(모두 내 글만) */}
      <div className="mt-2 flex shrink-0 flex-col border-t border-slate-200 pt-2">
        {(
          [
            { kind: "drafts", label: "임시저장함", icon: FileClock },
            { kind: "scheduled", label: "예약함", icon: CalendarClock },
            { kind: "trash", label: "휴지통", icon: Trash2 },
          ] as const
        ).map(({ kind, label, icon: Icon }) => (
          <button
            key={kind}
            type="button"
            aria-current={menu.kind === kind ? "page" : undefined}
            onClick={() => onSelect({ kind })}
            className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-slate-100 hover:text-slate-900 ${menu.kind === kind ? "font-semibold text-blue-600" : "text-slate-600"}`}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </aside>
  );
}

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="mb-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-1 rounded px-1 py-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-800"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {title}
      </button>
      {open && <div className="mt-0.5">{children}</div>}
    </section>
  );
}

// 게시판 한 줄. 마우스를 올리면 즐겨찾기(☆)와 이름 변경(관리자) 버튼이 보임. 즐겨찾기한 게시판은 ★가 늘 보임.
function BoardRow({
  board,
  indent,
  selected,
  onSelect,
  onToggleFavorite,
  onRename,
}: {
  board: BoardItem;
  indent: number;
  selected: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onRename: () => void;
}) {
  const Icon = TYPE_ICON[board.type];
  return (
    <div
      className={`group flex items-center rounded-md ${selected ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100"}`}
      style={{ paddingLeft: indent * 24 }}
    >
      <button
        type="button"
        aria-current={selected ? "page" : undefined}
        onClick={onSelect}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-2 py-1.5 text-left"
      >
        <Icon size={15} className="shrink-0 opacity-70" aria-hidden="true" />
        <span className={`truncate ${selected ? "font-semibold" : ""}`}>{board.name}</span>
      </button>
      {board.canRename && (
        <Tooltip label="이름 변경">
          <button
            type="button"
            aria-label={`${board.name} 이름 변경`}
            onClick={onRename}
            className="mr-0.5 hidden h-6 w-6 cursor-pointer items-center justify-center rounded text-slate-400 transition group-hover:flex hover:bg-slate-200 hover:text-slate-700"
          >
            <Pencil size={13} aria-hidden="true" />
          </button>
        </Tooltip>
      )}
      {/* 즐겨찾기한 게시판은 버튼이 늘 보이고, 아니면 마우스를 올렸을 때만 */}
      <span className={`mr-1.5 ${board.favorite ? "flex" : "hidden group-hover:flex"}`}>
        <FavoriteButton
          active={board.favorite}
          label={`${board.name} ${board.favorite ? "즐겨찾기 해제" : "즐겨찾기"}`}
          onClick={onToggleFavorite}
        />
      </span>
    </div>
  );
}
