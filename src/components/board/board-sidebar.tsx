"use client";

import { LoadingInline } from "@/components/common/loading";
import { Tooltip } from "@/components/common/tooltip";
import type { BoardItem, BoardType } from "@/lib/api/board-api";
import {
  BellRing,
  Building2,
  ChevronDown,
  ChevronRight,
  Clock3,
  FilePen,
  Flag,
  Megaphone,
  MessageSquare,
  MessagesSquare,
  Pencil,
  Search,
  SquarePen,
  Star,
  Trash2,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

// 사이드바에서 고른 곳. 게시판 홈·모아보기 메뉴·휴지통·게시판 하나.
export type BoardMenu =
  | { kind: "home" }
  | { kind: "latest" | "mustRead" | "important" | "mine" | "trash" }
  | { kind: "board"; boardId: number };

const QUICK_MENUS: {
  kind: "latest" | "mustRead" | "important" | "mine";
  label: string;
  icon: LucideIcon;
}[] = [
  { kind: "latest", label: "최신글", icon: Clock3 },
  { kind: "mustRead", label: "필독", icon: BellRing },
  { kind: "important", label: "중요", icon: Flag },
  { kind: "mine", label: "내 게시글", icon: FilePen },
];

const TYPE_ICON: Record<BoardType, LucideIcon> = {
  NOTICE: Megaphone,
  FREE: MessagesSquare,
  INQUIRY: MessageSquare,
  COMPANY: Building2,
  DEPARTMENT: UsersRound,
};
// 회사 단위 기본 게시판(공지·자유·문의) 순서
const COMPANY_BASIC: BoardType[] = ["NOTICE", "FREE", "INQUIRY"];

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
  const basics = COMPANY_BASIC.map((type) =>
    boards.find((board) => board.myCompany && board.type === type),
  ).filter((board): board is BoardItem => !!board && matches(board));
  // 회사별: 회사 게시판 + 그 회사 부서 게시판(관리자가 보는 다른 회사는 공지·자유·문의도 그 회사 아래에)
  const companies = [...new Map(boards.map((board) => [board.companyId, board])).values()].map(
    (sample) => {
      const inCompany = boards.filter((board) => board.companyId === sample.companyId);
      const companyBoard = inCompany.find((board) => board.type === "COMPANY") ?? null;
      const children = [
        ...(sample.myCompany
          ? []
          : COMPANY_BASIC.map((type) => inCompany.find((board) => board.type === type)).filter(
              (board): board is BoardItem => !!board,
            )),
        ...inCompany
          .filter((board) => board.type === "DEPARTMENT")
          .sort((a, b) => a.name.localeCompare(b.name, "ko")),
      ].filter(matches);
      return {
        companyId: sample.companyId,
        companyName: sample.companyName,
        companyBoard,
        children,
        visible: (companyBoard && matches(companyBoard)) || children.length > 0,
      };
    },
  );
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

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-slate-50 p-3">
      <button
        type="button"
        onClick={onWrite}
        className="mb-3 flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-slate-950 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-[.98]"
      >
        <SquarePen size={16} aria-hidden="true" />
        글쓰기
      </button>
      <div className="grid grid-cols-4 border-b border-slate-200 pb-3 text-xs">
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
      <label className="mt-3 flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 transition focus-within:border-blue-500">
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

      <nav aria-label="게시판 목록" className="mt-3 flex-1 text-sm">
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
                  {query ? "맞는 게시판이 없습니다." : "게시판의 ☆를 눌러 추가하세요."}
                </p>
              )}
            </Section>
            <Section title="전체게시판" open={!closed.all} onToggle={() => toggle("all")}>
              {basics.map((board) => row(board))}
            </Section>
            <Section
              title="회사별게시판"
              open={!closed.companies}
              onToggle={() => toggle("companies")}
            >
              {companies
                .filter((company) => company.visible)
                .map((company) => {
                  const key = `company-${company.companyId}`;
                  // 검색 중에는 맞는 게시판이 보이도록 펼침
                  const open = !!query || !closed[key];
                  return (
                    <div key={company.companyId}>
                      <div className="flex items-center">
                        <button
                          type="button"
                          aria-label={`${company.companyName} ${open ? "접기" : "펼치기"}`}
                          onClick={() => toggle(key)}
                          disabled={company.children.length === 0}
                          className="flex h-7 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-slate-500 transition hover:bg-slate-200 disabled:invisible"
                        >
                          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        <div className="min-w-0 flex-1">
                          {company.companyBoard ? (
                            row(company.companyBoard)
                          ) : (
                            <span className="block truncate px-2 py-1.5 text-slate-600">
                              {company.companyName}
                            </span>
                          )}
                        </div>
                      </div>
                      {open && company.children.map((board) => row(board, 1))}
                    </div>
                  );
                })}
            </Section>
          </>
        )}
      </nav>

      <button
        type="button"
        aria-current={menu.kind === "trash" ? "page" : undefined}
        onClick={() => onSelect({ kind: "trash" })}
        className={`mt-3 flex cursor-pointer items-center gap-2 rounded-md border-t border-slate-200 px-2 pt-3 pb-1.5 text-sm transition hover:text-slate-900 ${menu.kind === "trash" ? "font-semibold text-blue-600" : "text-slate-600"}`}
      >
        <Trash2 size={16} aria-hidden="true" />
        휴지통
      </button>
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
      <Tooltip label={board.favorite ? "즐겨찾기 해제" : "즐겨찾기"}>
        <button
          type="button"
          aria-label={`${board.name} ${board.favorite ? "즐겨찾기 해제" : "즐겨찾기"}`}
          aria-pressed={board.favorite}
          onClick={onToggleFavorite}
          className={`mr-1 h-6 w-6 cursor-pointer items-center justify-center rounded transition hover:bg-slate-200 ${board.favorite ? "flex text-amber-400" : "hidden text-slate-400 group-hover:flex"}`}
        >
          <Star size={14} fill={board.favorite ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      </Tooltip>
    </div>
  );
}
