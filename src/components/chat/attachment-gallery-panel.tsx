"use client";

import { AttachmentImage } from "@/components/chat/attachment-image";
import type { PreviewFile } from "@/components/chat/file-preview-modal";
import { ItemActionMenu, type ActionMenuItem } from "@/components/common/item-action-menu";
import type { ViewerImage } from "@/components/chat/image-viewer";
import { CheckboxControl, CustomCheckbox } from "@/components/common/custom-checkbox";
import { CustomSelect } from "@/components/common/custom-select";
import { LoadingInline, LoadingState, Spinner } from "@/components/common/loading";
import {
  chatApi,
  type ChatAttachment,
  type ChatAttachmentItem,
  type ChatLinkItem,
} from "@/lib/api/chat-api";
import { fileIconOf, formatFileSize } from "@/lib/attachment-files";
import {
  Download,
  FolderOpen,
  Forward,
  ImageIcon,
  Link2,
  MoreVertical,
  RotateCw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type Kind = "IMAGE" | "FILE" | "LINK";
const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: "IMAGE", label: "사진/동영상" },
  { value: "FILE", label: "파일" },
  { value: "LINK", label: "링크" },
];
const EMPTY_TEXT: Record<Kind, string> = {
  IMAGE: "주고받은 사진이 없습니다.",
  FILE: "주고받은 파일이 없습니다.",
  LINK: "주고받은 링크가 없습니다.",
};
const LOADING_TEXT: Record<Kind, string> = {
  IMAGE: "사진을 불러오는 중입니다...",
  FILE: "파일을 불러오는 중입니다...",
  LINK: "링크를 불러오는 중입니다...",
};

// 종류별 목록. 처음 받기 전에는 status가 loading, 실패하면 failed.
type ListState<T> = {
  items: T[];
  nextCursor: number | null;
  status: "loading" | "loaded" | "failed";
  loadingMore: boolean;
};
type Lists = {
  IMAGE: ListState<ChatAttachmentItem>;
  FILE: ListState<ChatAttachmentItem>;
  LINK: ListState<ChatLinkItem>;
};
const emptyList = <T,>(): ListState<T> => ({
  items: [],
  nextCursor: null,
  status: "loading",
  loadingMore: false,
});

// 제목을 가져오는 중인 링크가 있으면 잠시 뒤 다시 받음(최대 횟수까지).
const LINK_POLL_MS = 2500;
const LINK_POLL_LIMIT = 6;

// 고른 항목 구분값. 사진·파일은 첨부 번호, 링크는 메시지 번호 + 주소(한 메시지에 링크가 여럿일 수 있음).
const linkKey = (item: ChatLinkItem) => `${item.messageId}|${item.url}`;
const attachmentKey = (item: ChatAttachmentItem) => String(item.attachment.id);

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
// 날짜 묶음 제목: 오늘 · 어제 · 11월 2일 (월) · (올해가 아니면) 2025년 11월 2일 (월)
const dayLabel = (value: string) => {
  const date = new Date(value);
  const today = new Date();
  const startOf = (target: Date) =>
    new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const days = Math.round((startOf(today) - startOf(date)) / 86_400_000);
  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  const base = `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`;
  return date.getFullYear() === today.getFullYear() ? base : `${date.getFullYear()}년 ${base}`;
};
const timeLabel = (value: string) =>
  new Date(value).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

// 최신순 목록을 날짜별로 묶음(순서 유지).
function groupByDay<T>(items: T[], dateOf: (item: T) => string) {
  const groups: { label: string; items: T[] }[] = [];
  for (const item of items) {
    const label = dayLabel(dateOf(item));
    const last = groups.at(-1);
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

// 방 상세의 사진·파일·링크 모아보기 패널. 종류는 위쪽 선택 상자로 고르고, 목록은 날짜별로 묶음.
// "선택"을 누르면 체크박스로 하나 또는 여러 개를 골라 한 번에 PC 저장·전달. 30개씩 이어서 불러옴.
export function AttachmentGalleryPanel({
  roomId,
  accessToken,
  refreshKey,
  onClose,
  onOpenImage,
  onOpenFile,
  onDownload,
  onForward,
  onToast,
}: {
  roomId: number;
  accessToken: string;
  // 새 첨부가 오거나 지워지면 바뀌는 값. 바뀌면 지금 종류의 첫 페이지를 다시 받음.
  refreshKey: string;
  onClose: () => void;
  onOpenImage: (images: ViewerImage[], index: number) => void;
  onOpenFile: (file: PreviewFile) => void;
  onDownload: (attachment: ChatAttachment) => Promise<void>;
  // 고른 항목이 담긴 메시지들을 전달(전달 모달은 부모가 띄움). preview는 모달에 보일 한 줄.
  onForward: (messageIds: number[], preview: string) => void;
  onToast: (message: string) => void;
}) {
  const [kind, setKind] = useState<Kind>("IMAGE");
  const [lists, setLists] = useState<Lists>({
    IMAGE: emptyList(),
    FILE: emptyList(),
    LINK: emptyList(),
  });
  // 선택 모드와 고른 항목
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [menu, setMenu] = useState<{
    key: string;
    position: { left: number; top: number };
    items: ActionMenuItem[];
  } | null>(null);
  const linkPolls = useRef(0);

  const setList = useCallback(
    <K extends Kind>(target: K, change: (current: Lists[K]) => Lists[K]) =>
      setLists((current) => ({ ...current, [target]: change(current[target]) })),
    [],
  );

  // 첫 페이지 받기. 이미 받은 목록이 있으면 그대로 보여 주면서 새로 받아 교체.
  const loadFirst = useCallback(
    async (target: Kind) => {
      try {
        if (target === "LINK") {
          const page = await chatApi.links(accessToken, roomId);
          setList("LINK", () => ({ ...page, status: "loaded", loadingMore: false }));
        } else {
          const page = await chatApi.attachments(accessToken, roomId, target);
          setList(target, () => ({ ...page, status: "loaded", loadingMore: false }));
        }
      } catch {
        setList(target, (current) =>
          current.status === "loading" ? { ...current, status: "failed" } : current,
        );
      }
    },
    [accessToken, roomId, setList],
  );

  useEffect(() => {
    linkPolls.current = 0;
    void Promise.resolve().then(() => loadFirst(kind));
  }, [kind, loadFirst, refreshKey]);

  // 제목을 가져오는 중인 링크가 첫 페이지에 있으면 잠시 뒤 다시 받아 제목·이미지를 채움.
  const linkList = lists.LINK;
  const linkPending =
    kind === "LINK" &&
    linkList.status === "loaded" &&
    linkList.items.some((item) => item.previewStatus === "PENDING");
  useEffect(() => {
    if (!linkPending || linkPolls.current >= LINK_POLL_LIMIT) return;
    const timer = window.setTimeout(() => {
      linkPolls.current += 1;
      void loadFirst("LINK");
    }, LINK_POLL_MS);
    return () => window.clearTimeout(timer);
  }, [linkPending, linkList, loadFirst]);

  const list = lists[kind];
  const loadMore = async () => {
    if (!list.nextCursor || list.loadingMore) return;
    const target = kind;
    const cursor = list.nextCursor;
    setList(target, (current) => ({ ...current, loadingMore: true }));
    try {
      if (target === "LINK") {
        const page = await chatApi.links(accessToken, roomId, cursor);
        setList("LINK", (current) => ({
          items: [...current.items, ...page.items],
          nextCursor: page.nextCursor,
          status: "loaded",
          loadingMore: false,
        }));
      } else {
        const page = await chatApi.attachments(accessToken, roomId, target, cursor);
        setList(target, (current) => ({
          items: [...current.items, ...page.items],
          nextCursor: page.nextCursor,
          status: "loaded",
          loadingMore: false,
        }));
      }
    } catch {
      setList(target, (current) => ({ ...current, loadingMore: false }));
    }
  };

  useEffect(() => {
    const closeByEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || menu) return;
      onClose();
    };
    document.addEventListener("keydown", closeByEscape);
    return () => document.removeEventListener("keydown", closeByEscape);
  }, [onClose, menu]);

  const changeKind = (value: string) => {
    setKind(value as Kind);
    setSelected(new Set());
    setMenu(null);
  };
  const toggleSelecting = () => {
    setSelecting((value) => !value);
    setSelected(new Set());
  };
  const toggle = (key: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const keysOf = (target: Kind): string[] =>
    target === "LINK" ? lists.LINK.items.map(linkKey) : lists[target].items.map(attachmentKey);
  const allKeys = keysOf(kind);
  const allSelected = allKeys.length > 0 && allKeys.every((key) => selected.has(key));

  const selectedAttachments = () =>
    kind === "LINK" ? [] : lists[kind].items.filter((item) => selected.has(attachmentKey(item)));
  const selectedLinks = () => lists.LINK.items.filter((item) => selected.has(linkKey(item)));

  // 여러 개 PC 저장: 하나씩 차례로 내려받음(실패한 것은 onDownload가 토스트로 알림).
  const saveAll = async (attachments: ChatAttachment[]) => {
    if (attachments.length === 0 || saving) return;
    setSaving(true);
    try {
      for (const attachment of attachments) await onDownload(attachment);
      if (attachments.length > 1) onToast(`${attachments.length}개를 PC에 저장했습니다.`);
    } finally {
      setSaving(false);
    }
  };

  // 전달: 같은 메시지는 한 번만. 모달에 보일 글은 하나면 그 이름·주소, 여럿이면 "사진 3개" 식.
  const forwardAttachments = (items: ChatAttachmentItem[]) => {
    if (items.length === 0) return;
    const noun = kind === "IMAGE" ? "사진" : "파일";
    onForward(
      [...new Set(items.map((item) => item.messageId))],
      items.length === 1 && kind === "FILE"
        ? items[0].attachment.name
        : `${noun} ${items.length}개`,
    );
  };
  const forwardLinks = (items: ChatLinkItem[]) => {
    if (items.length === 0) return;
    onForward(
      [...new Set(items.map((item) => item.messageId))],
      items.length === 1 ? items[0].url : `링크 ${items.length}개`,
    );
  };

  const openMenu = (key: string, button: HTMLElement, items: ActionMenuItem[]) => {
    if (menu?.key === key) {
      setMenu(null);
      return;
    }
    const rect = button.getBoundingClientRect();
    // 메뉴 폭(144px)만큼 왼쪽으로 붙여 패널 밖으로 나가지 않게
    setMenu({ key, items, position: { left: rect.right - 144, top: rect.bottom + 4 } });
  };

  const imageItems = lists.IMAGE.items;
  const viewerImages: ViewerImage[] = imageItems.map((item) => ({
    attachment: item.attachment,
    messageId: item.messageId,
    senderName: item.senderName,
    createdAt: item.createdAt,
  }));
  const imageIndex = new Map(imageItems.map((item, index) => [item.attachment.id, index]));
  const selectedCount = allKeys.filter((key) => selected.has(key)).length;

  return (
    <aside className="flex h-full w-[min(420px,40vw)] shrink-0 animate-in slide-in-from-right flex-col border-l border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
        <h2 className="text-base font-bold">사진·파일·링크</h2>
        <button
          type="button"
          aria-label="사진·파일·링크 모아보기 닫기"
          onClick={onClose}
          className="cursor-pointer rounded p-1 text-slate-500 transition hover:bg-slate-100"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="flex items-center gap-2 px-5">
        <CustomSelect
          label="모아볼 종류"
          value={kind}
          onChange={changeKind}
          options={KIND_OPTIONS}
          className="flex-1"
        />
        <button
          type="button"
          onClick={toggleSelecting}
          aria-pressed={selecting}
          className={`h-12 shrink-0 cursor-pointer rounded-lg border px-4 text-sm font-medium transition active:scale-95 ${selecting ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-700 hover:border-blue-400"}`}
        >
          {selecting ? "취소" : "선택"}
        </button>
      </div>
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        {list.status === "loading" ? (
          <LoadingState message={LOADING_TEXT[kind]} className="h-full min-h-48" />
        ) : list.status === "failed" ? (
          <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-sm text-slate-500">
            <p>목록을 불러오지 못했습니다.</p>
            <button
              type="button"
              onClick={() => {
                setList(kind, (current) => ({ ...current, status: "loading" }));
                void loadFirst(kind);
              }}
              className="flex cursor-pointer items-center gap-1 rounded-md px-3 py-1.5 font-medium text-blue-600 transition hover:bg-blue-50"
            >
              <RotateCw size={14} aria-hidden="true" />
              다시 시도
            </button>
          </div>
        ) : list.items.length === 0 ? (
          <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-sm text-slate-500">
            {kind === "IMAGE" ? (
              <ImageIcon size={30} className="text-slate-300" aria-hidden="true" />
            ) : kind === "FILE" ? (
              <FolderOpen size={30} className="text-slate-300" aria-hidden="true" />
            ) : (
              <Link2 size={30} className="text-slate-300" aria-hidden="true" />
            )}
            <p>{EMPTY_TEXT[kind]}</p>
          </div>
        ) : kind === "IMAGE" ? (
          groupByDay(imageItems, (item) => item.createdAt).map((group) => (
            <DaySection key={group.label} label={group.label}>
              <ul className="grid grid-cols-3 gap-1">
                {group.items.map((item) => {
                  const key = attachmentKey(item);
                  const checked = selected.has(key);
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        role={selecting ? "checkbox" : undefined}
                        aria-checked={selecting ? checked : undefined}
                        aria-label={
                          selecting
                            ? `${item.senderName}님이 보낸 사진 선택`
                            : `${item.senderName}님이 보낸 사진 크게 보기`
                        }
                        onClick={() =>
                          selecting
                            ? toggle(key)
                            : onOpenImage(viewerImages, imageIndex.get(item.attachment.id) ?? 0)
                        }
                        className={`relative block aspect-square w-full cursor-pointer overflow-hidden rounded-md bg-slate-100 transition active:scale-[0.98] ${checked ? "ring-2 ring-blue-600 ring-offset-1" : "hover:opacity-85"}`}
                      >
                        <AttachmentImage attachment={item.attachment} className="h-full w-full" />
                        {selecting && (
                          <span className="absolute left-1.5 top-1.5">
                            <CheckboxControl checked={checked} />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </DaySection>
          ))
        ) : kind === "FILE" ? (
          groupByDay(lists.FILE.items, (item) => item.createdAt).map((group) => (
            <DaySection key={group.label} label={group.label}>
              <ul>
                {group.items.map((item) => {
                  const key = attachmentKey(item);
                  return (
                    <FileRow
                      key={key}
                      item={item}
                      selecting={selecting}
                      checked={selected.has(key)}
                      menuOpen={menu?.key === key}
                      onToggle={() => toggle(key)}
                      onOpen={() =>
                        onOpenFile({
                          attachment: item.attachment,
                          messageId: item.messageId,
                          senderName: item.senderName,
                          createdAt: item.createdAt,
                        })
                      }
                      onMenu={(button) =>
                        openMenu(key, button, [
                          {
                            key: "save",
                            label: "PC 저장",
                            icon: Download,
                            onSelect: () => void saveAll([item.attachment]),
                          },
                          {
                            key: "forward",
                            label: "전달",
                            icon: Forward,
                            onSelect: () => forwardAttachments([item]),
                          },
                        ])
                      }
                    />
                  );
                })}
              </ul>
            </DaySection>
          ))
        ) : (
          groupByDay(lists.LINK.items, (item) => item.createdAt).map((group) => (
            <DaySection key={group.label} label={group.label}>
              <ul>
                {group.items.map((item) => {
                  const key = linkKey(item);
                  return (
                    <LinkRow
                      key={key}
                      item={item}
                      accessToken={accessToken}
                      selecting={selecting}
                      checked={selected.has(key)}
                      menuOpen={menu?.key === key}
                      onToggle={() => toggle(key)}
                      onMenu={(button) =>
                        openMenu(key, button, [
                          {
                            key: "forward",
                            label: "전달",
                            icon: Forward,
                            onSelect: () => forwardLinks([item]),
                          },
                        ])
                      }
                    />
                  );
                })}
              </ul>
            </DaySection>
          ))
        )}
        {list.status === "loaded" && list.nextCursor && (
          <div className="mt-3 flex justify-center">
            {list.loadingMore ? (
              <LoadingInline message="더 불러오는 중입니다." className="text-xs text-slate-500" />
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
      </div>
      {/* 선택 모드: 전체 선택과 고른 항목 한 번에 저장·전달 */}
      {selecting && list.status === "loaded" && list.items.length > 0 && (
        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-5 py-3">
          <CustomCheckbox
            label="전체 선택"
            checked={allSelected}
            onChange={() => setSelected(allSelected ? new Set() : new Set(allKeys))}
            text={
              <span>
                전체 선택 <b className="text-blue-600">{selectedCount}</b>
              </span>
            }
          />
          <div className="flex gap-2">
            {kind !== "LINK" && (
              <button
                type="button"
                disabled={selectedCount === 0 || saving}
                onClick={() => void saveAll(selectedAttachments().map((item) => item.attachment))}
                className="flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <Spinner size={14} /> : <Download size={15} aria-hidden="true" />}
                PC 저장
              </button>
            )}
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() =>
                kind === "LINK"
                  ? forwardLinks(selectedLinks())
                  : forwardAttachments(selectedAttachments())
              }
              className="flex cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Forward size={15} aria-hidden="true" />
              전달
            </button>
          </div>
        </div>
      )}
      {menu && (
        <ItemActionMenu position={menu.position} items={menu.items} onClose={() => setMenu(null)} />
      )}
    </aside>
  );
}

// 날짜 묶음 하나: 날짜 제목 + 그날 항목들
function DaySection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mb-4">
      <h3 className="mb-2 text-xs font-semibold text-slate-500">{label}</h3>
      {children}
    </section>
  );
}

// 줄 오른쪽 ⋮ 버튼(파일·링크 공용). 마우스를 올렸을 때·메뉴가 열렸을 때 보임.
function RowMenuButton({
  label,
  open,
  onMenu,
}: {
  label: string;
  open: boolean;
  onMenu: (button: HTMLElement) => void;
}) {
  return (
    <button
      type="button"
      data-item-menu
      aria-label={`${label} 메뉴`}
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={(event) => {
        event.stopPropagation();
        onMenu(event.currentTarget);
      }}
      className={`flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded text-slate-600 transition hover:bg-slate-200 group-hover:opacity-100 focus-visible:opacity-100 ${open ? "bg-slate-200 opacity-100" : "opacity-0"}`}
    >
      <MoreVertical size={17} aria-hidden="true" />
    </button>
  );
}

// 파일 한 줄(채팅 목록 모양): 형식 아이콘 · 이름/시각 · 올린 사람/크기 · ⋮(PC 저장·전달).
// 선택 모드면 줄을 눌러 체크, 아니면 미리보기.
function FileRow({
  item,
  selecting,
  checked,
  menuOpen,
  onToggle,
  onOpen,
  onMenu,
}: {
  item: ChatAttachmentItem;
  selecting: boolean;
  checked: boolean;
  menuOpen: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onMenu: (button: HTMLElement) => void;
}) {
  const { Icon, className: iconClassName } = fileIconOf(item.attachment.name);
  return (
    <li className="group relative">
      <button
        type="button"
        role={selecting ? "checkbox" : undefined}
        aria-checked={selecting ? checked : undefined}
        aria-label={selecting ? `${item.attachment.name} 선택` : `${item.attachment.name} 미리보기`}
        onClick={selecting ? onToggle : onOpen}
        className={`flex w-full cursor-pointer items-center gap-3 rounded-lg py-2.5 pl-2 pr-10 text-left transition ${checked ? "bg-blue-50" : "hover:bg-slate-50"}`}
      >
        {selecting && <CheckboxControl checked={checked} />}
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}
        >
          <Icon size={20} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <b
              className="truncate text-sm font-semibold text-slate-900"
              title={item.attachment.name}
            >
              {item.attachment.name}
            </b>
            <span className="shrink-0 text-xs text-slate-400">{timeLabel(item.createdAt)}</span>
          </span>
          <span className="mt-0.5 block truncate text-xs text-slate-500">
            {item.senderName} · {formatFileSize(item.attachment.size)}
          </span>
        </span>
      </button>
      <span className="absolute right-1.5 top-1/2 -translate-y-1/2">
        <RowMenuButton label={item.attachment.name} open={menuOpen} onMenu={onMenu} />
      </span>
    </li>
  );
}

// 링크 한 줄: 대표 이미지(없으면 빈 이미지 자리) · 제목(없으면 "제목 없는 웹사이트")/시각 · 주소 · 올린 사람 · ⋮(전달).
// 선택 모드면 줄을 눌러 체크, 아니면 새 탭으로 열기.
function LinkRow({
  item,
  accessToken,
  selecting,
  checked,
  menuOpen,
  onToggle,
  onMenu,
}: {
  item: ChatLinkItem;
  accessToken: string;
  selecting: boolean;
  checked: boolean;
  menuOpen: boolean;
  onToggle: () => void;
  onMenu: (button: HTMLElement) => void;
}) {
  const pending = item.previewStatus === "PENDING";
  const title = item.title ?? (pending ? "제목을 불러오는 중..." : "제목 없는 웹사이트");
  const body = (
    <>
      {selecting && <CheckboxControl checked={checked} />}
      <LinkThumbnail previewId={item.imagePreviewId} pending={pending} accessToken={accessToken} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <b
            className={`truncate text-sm font-semibold ${item.title ? "text-slate-900" : "text-slate-400"}`}
            title={item.title ?? undefined}
          >
            {title}
          </b>
          <span className="shrink-0 text-xs text-slate-400">{timeLabel(item.createdAt)}</span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-blue-600" title={item.url}>
          {hostOf(item.url)}
        </span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">{item.senderName}</span>
      </span>
    </>
  );
  const rowClass = `flex w-full cursor-pointer items-center gap-3 rounded-lg py-2.5 pl-2 pr-10 text-left transition ${checked ? "bg-blue-50" : "hover:bg-slate-50"}`;
  return (
    <li className="group relative">
      {selecting ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={`${title} 선택`}
          onClick={onToggle}
          className={rowClass}
        >
          {body}
        </button>
      ) : (
        // 외부 사이트로 우리 주소가 넘어가지 않게(noreferrer), 새 창이 이 창을 조작하지 못하게(noopener)
        <a href={item.url} target="_blank" rel="noopener noreferrer" className={rowClass}>
          {body}
        </a>
      )}
      <span className="absolute right-1.5 top-1/2 -translate-y-1/2">
        <RowMenuButton label={title} open={menuOpen} onMenu={onMenu} />
      </span>
    </li>
  );
}

// 링크 대표 이미지 자리(48px). 이미지가 없으면 링크 아이콘이 든 빈 자리로 줄 맞춤을 유지.
// 토큰을 헤더로 보내야 해서 Blob으로 받아 주소를 만들고, 사라질 때 정리.
function LinkThumbnail({
  previewId,
  pending,
  accessToken,
}: {
  previewId: number | null;
  pending: boolean;
  accessToken: string;
}) {
  const [loaded, setLoaded] = useState<{ previewId: number; url: string | null } | null>(null);
  useEffect(() => {
    if (previewId === null) return;
    let alive = true;
    let objectUrl: string | null = null;
    chatApi
      .linkImageBlob(accessToken, previewId)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (alive) setLoaded({ previewId, url: objectUrl });
        else URL.revokeObjectURL(objectUrl);
      })
      .catch(() => {
        if (alive) setLoaded({ previewId, url: null });
      });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [accessToken, previewId]);
  const url = previewId !== null && loaded?.previewId === previewId ? loaded.url : null;
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-400">
      {url ? (
        // 서버가 줄여 둔 Blob 이미지라 next/image 최적화 대상이 아님.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : pending || (previewId !== null && !loaded) ? (
        <Spinner size={16} className="text-slate-300" />
      ) : (
        <Link2 size={20} aria-hidden="true" />
      )}
    </span>
  );
}
