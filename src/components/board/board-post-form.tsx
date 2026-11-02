"use client";

import { BoardEditor } from "@/components/board/board-editor";
import { RichContent } from "@/components/board/rich-content";
import { MessageDialogShell } from "@/components/chat/message-change-dialog";
import { CustomCheckbox } from "@/components/common/custom-checkbox";
import { COMMON_BOARDS } from "@/components/board/board-sidebar";
import { CustomSelect, type SelectOption } from "@/components/common/custom-select";
import { DateTimePicker } from "@/components/common/date-time-picker";
import { Spinner } from "@/components/common/loading";
import {
  boardApi,
  type BoardItem,
  type BoardPostDetail,
  type BoardSaveMode,
} from "@/lib/api/board-api";
import { fileIconOf, formatFileSize, MAX_ATTACHMENT_SIZE } from "@/lib/attachment-files";
import { Paperclip, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// 아래 첨부 목록의 한 줄. 올리는 중이면 id가 없고 progress(%)만 있음.
type FormFile = { key: string; id: number | null; name: string; size: number; progress: number };

const MAX_FILES = 20;

// 게시판 고르기 목록을 사이드바와 같은 순서로: 공통(공지·자유·문의) → 회사별(회사 게시판 → 부서).
// 공통에서 다른 회사 것(관리자만 받음)은 이름 뒤에 회사명을 붙임.
function boardOptions(boards: BoardItem[]): SelectOption[] {
  const commons = COMMON_BOARDS.flatMap(({ type }) =>
    boards
      .filter((board) => board.type === type)
      .sort(
        (a, b) =>
          Number(b.myCompany) - Number(a.myCompany) ||
          a.companyName.localeCompare(b.companyName, "ko"),
      )
      .map((board) => {
        const label = board.myCompany ? board.name : `${board.name} (${board.companyName})`;
        return { value: String(board.id), label, group: "공통" };
      }),
  );
  const rest = boards
    .filter((board) => board.type === "COMPANY" || board.type === "DEPARTMENT")
    .sort(
      (a, b) =>
        Number(b.myCompany) - Number(a.myCompany) ||
        a.companyName.localeCompare(b.companyName, "ko") ||
        Number(a.type === "DEPARTMENT") - Number(b.type === "DEPARTMENT") ||
        a.name.localeCompare(b.name, "ko"),
    )
    .map((board) => ({
      value: String(board.id),
      label: board.name,
      group: board.companyName,
      selectedLabel: board.type === "COMPANY" ? board.name : `${board.companyName} · ${board.name}`,
    }));
  return [...commons, ...rest];
}

// 예약 시각 기본값: 다음 정시(1시간 뒤 이내). 고를 수 있는 범위는 1분 뒤 ~ 90일(서버와 같음).
const nextHour = () => {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date;
};

// 예약 시각 표시: "11월 3일 오전 9:00"
export const formatPublishAt = (value: string | Date) =>
  new Date(value).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

// 글쓰기·수정. 수정이면 게시판은 바꿀 수 없음. 문의하기에는 중요·필독을 걸 수 없고 댓글은 항상 받음.
// 아직 등록하지 않은 글(새 글·임시저장·예약)은 임시저장·등록예약도 고를 수 있음.
export function BoardPostForm({
  accessToken,
  boards,
  initialBoardId,
  editing,
  onCancel,
  onSaved,
  onToast,
}: {
  accessToken: string;
  // 쓸 수 있는 게시판(사이드바 목록 중 canWrite)
  boards: BoardItem[];
  initialBoardId: number | null;
  editing: BoardPostDetail | null;
  onCancel: () => void;
  // mode: 어떤 방식으로 저장했는지(임시저장이면 화면에 그대로 남아 이어 쓰기)
  onSaved: (post: BoardPostDetail, mode: BoardSaveMode) => void;
  onToast: (message: string) => void;
}) {
  const [boardId, setBoardId] = useState<number | null>(
    editing?.board.id ??
      (boards.some((board) => board.id === initialBoardId) ? initialBoardId : null) ??
      boards.find((board) => board.myCompany && board.type === "FREE")?.id ??
      boards[0]?.id ??
      null,
  );
  const [title, setTitle] = useState(editing?.title ?? "");
  const [content, setContent] = useState(editing?.content ?? "");
  const [mustRead, setMustRead] = useState(editing?.mustRead ?? false);
  const [allowComment, setAllowComment] = useState(editing?.allowComment ?? true);
  const [commentNotify, setCommentNotify] = useState(editing?.commentNotify ?? true);
  const [previewOpen, setPreviewOpen] = useState(false);
  // 등록예약 창: 열려 있으면 고른 시각
  const [scheduleAt, setScheduleAt] = useState<Date | null>(null);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<FormFile[]>(
    (editing?.attachments ?? [])
      .filter((attachment) => !attachment.inline)
      .map((attachment) => ({
        key: `saved-${attachment.id}`,
        id: attachment.id,
        name: attachment.name,
        size: attachment.size,
        progress: 100,
      })),
  );
  const [uploadingImages, setUploadingImages] = useState(0);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sequenceRef = useRef(0);

  const board = boards.find((item) => item.id === boardId) ?? editing?.board ?? null;
  const flagsAllowed = board?.type !== "INQUIRY";
  const uploadingFiles = files.some((file) => file.id === null);
  // 이미 등록된 글을 고치는 중이면 임시저장·예약 없이 "수정"만
  const published = editing?.status === "PUBLISHED";

  // 예약 창: 바깥 클릭·Esc로 닫기
  useEffect(() => {
    if (!scheduleAt) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!scheduleRef.current?.contains(event.target as Node)) setScheduleAt(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setScheduleAt(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [scheduleAt]);

  const addFiles = (picked: File[]) => {
    const room = MAX_FILES - files.length;
    if (picked.length > room) onToast(`첨부 파일은 ${MAX_FILES}개까지 올릴 수 있습니다.`);
    for (const file of picked.slice(0, Math.max(room, 0))) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        onToast(`${file.name}: 파일은 20MB까지 올릴 수 있습니다.`);
        continue;
      }
      const key = `new-${++sequenceRef.current}`;
      setFiles((current) => [
        ...current,
        { key, id: null, name: file.name, size: file.size, progress: 0 },
      ]);
      boardApi
        .uploadAttachment(accessToken, file, (progress) =>
          setFiles((current) =>
            current.map((item) => (item.key === key ? { ...item, progress } : item)),
          ),
        )
        .then((attachment) =>
          setFiles((current) =>
            current.map((item) =>
              item.key === key ? { ...item, id: attachment.id, progress: 100 } : item,
            ),
          ),
        )
        .catch((error: unknown) => {
          setFiles((current) => current.filter((item) => item.key !== key));
          onToast(
            error instanceof Error ? `${file.name}: ${error.message}` : "파일을 올리지 못했습니다.",
          );
        });
    }
  };

  const save = async (mode: BoardSaveMode, publishAt: Date | null = null) => {
    if (saving) return;
    if (!board) return onToast("게시판을 골라 주세요.");
    if (mode !== "DRAFT" && !title.trim()) return onToast("제목을 입력해 주세요.");
    if (uploadingFiles || uploadingImages > 0) return onToast("파일을 다 올린 뒤 저장해 주세요.");
    const input = {
      title: title.trim(),
      content,
      // 중요는 이제 각자 하는 개인 표시라 글쓴이가 정하지 않음
      important: false,
      mustRead: flagsAllowed && mustRead,
      attachmentIds: files.map((file) => file.id).filter((id): id is number => id !== null),
      mode,
      publishAt: publishAt ? publishAt.toISOString() : null,
      allowComment: !flagsAllowed || allowComment,
      commentNotify: !flagsAllowed || commentNotify,
    };
    setSaving(true);
    try {
      const saved = editing
        ? await boardApi.update(accessToken, editing.id, input, editing.version)
        : await boardApi.create(accessToken, board.id, input);
      setScheduleAt(null);
      onSaved(saved, mode);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "글을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const now = new Date();
  // 위·아래 작은 글자 버튼(취소·임시저장·미리보기)
  const quietButton =
    "cursor-pointer rounded-md px-3 py-2 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <form
      className="flex w-full flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        void save("PUBLISH");
      }}
    >
      {/* 게시판(테두리 없는 한 줄). 수정 중이면 바꿀 수 없음 */}
      <div className="flex items-center gap-2 text-sm">
        {editing ? (
          <span className="text-slate-500">{editing.board.name}</span>
        ) : (
          <CustomSelect
            compact
            label="게시판"
            value={boardId ? String(boardId) : ""}
            onChange={(value) => setBoardId(Number(value) || null)}
            placeholder="게시판 선택"
            options={boardOptions(boards)}
            className="w-56"
          />
        )}
        {editing && editing.status !== "PUBLISHED" && (
          <span className="text-xs text-slate-400">
            {editing.status === "DRAFT"
              ? "임시저장한 글"
              : `${formatPublishAt(editing.publishAt ?? "")} 등록 예약`}
          </span>
        )}
      </div>

      {/* 제목: 큰 글자, 밑줄만 */}
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={200}
        placeholder="제목"
        aria-label="제목"
        className="mt-4 border-b border-slate-200 bg-transparent pb-3 text-2xl font-semibold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-slate-900"
      />

      <div className="mt-4">
        <BoardEditor
          accessToken={accessToken}
          initialContent={editing?.content ?? null}
          onChange={setContent}
          onUploadingChange={setUploadingImages}
          onError={onToast}
        />
      </div>

      {/* 첨부: 글자 버튼 한 줄 + 목록 */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-900"
        >
          <Paperclip size={14} aria-hidden="true" />
          파일 첨부
          <span className="text-xs text-slate-400">
            {files.length > 0 ? `${files.length}개 · ` : ""}파일당 20MB, 최대 {MAX_FILES}개
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
        {files.length > 0 && (
          <ul className="mt-2 divide-y divide-slate-100 border-y border-slate-100">
            {files.map((file) => {
              const { Icon, className } = fileIconOf(file.name);
              return (
                <li key={file.key} className="flex items-center gap-2 py-2">
                  <Icon size={15} className={className} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                    {file.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {file.id === null ? `${file.progress}%` : formatFileSize(file.size)}
                  </span>
                  <button
                    type="button"
                    aria-label={`${file.name} 빼기`}
                    disabled={file.id === null}
                    onClick={() =>
                      setFiles((current) => current.filter((item) => item.key !== file.key))
                    }
                    className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:invisible"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 설정: 작은 체크박스 한 줄(문의하기는 필독 없음, 댓글은 항상 받음) */}
      {flagsAllowed && (
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-4">
          <CustomCheckbox
            label="필독"
            text="필독"
            checked={mustRead}
            onChange={() => setMustRead((value) => !value)}
          />
          <CustomCheckbox
            label="댓글 허용"
            text="댓글 허용"
            checked={allowComment}
            onChange={() => setAllowComment((value) => !value)}
          />
          <CustomCheckbox
            label="댓글 알림"
            text="댓글 알림"
            checked={allowComment && commentNotify}
            disabled={!allowComment}
            onChange={() => setCommentNotify((value) => !value)}
          />
        </div>
      )}

      {/* 하단: 왼쪽 취소, 오른쪽 임시저장 · 미리보기 · 예약 · 등록 */}
      <div className="mt-6 flex items-center gap-1 border-t border-slate-100 pb-8 pt-4">
        <button type="button" onClick={onCancel} className={quietButton}>
          취소
        </button>
        <div className="ml-auto flex items-center gap-1">
          {!published && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void save("DRAFT")}
              className={quietButton}
            >
              임시저장
            </button>
          )}
          <button type="button" onClick={() => setPreviewOpen(true)} className={quietButton}>
            미리보기
          </button>
          {!published && (
            <div ref={scheduleRef} className="relative">
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  setScheduleAt((current) =>
                    current
                      ? null
                      : editing?.publishAt && new Date(editing.publishAt) > now
                        ? new Date(editing.publishAt)
                        : nextHour(),
                  )
                }
                className="cursor-pointer rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                예약
              </button>
              {scheduleAt && (
                // 위로 열리는 작은 창: 시각 고르기 + 예약 등록
                <div
                  role="dialog"
                  aria-label="등록 예약"
                  className="absolute bottom-full right-0 z-20 mb-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
                >
                  <p className="text-sm font-semibold text-slate-900">등록 예약</p>
                  <p className="mt-0.5 text-xs text-slate-400">고른 시각에 자동으로 등록됩니다.</p>
                  <div className="mt-3">
                    <DateTimePicker
                      value={scheduleAt}
                      onChange={setScheduleAt}
                      min={new Date(now.getTime() + 60 * 1000)}
                      max={new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void save("SCHEDULE", scheduleAt)}
                    className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-slate-900 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
                  >
                    {saving && <Spinner size={13} />}
                    {formatPublishAt(scheduleAt)}에 등록
                  </button>
                </div>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={saving}
            className="ml-1 flex cursor-pointer items-center gap-2 rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-95 disabled:cursor-wait disabled:opacity-60"
          >
            {saving && !scheduleAt && <Spinner size={14} />}
            {published ? "수정" : "등록"}
          </button>
        </div>
      </div>

      {previewOpen && (
        // 미리보기: 등록하면 보일 모양(제목 + 본문)
        <MessageDialogShell
          title="미리보기"
          onClose={() => setPreviewOpen(false)}
          widthClassName="max-w-3xl"
        >
          <div className="max-h-[70vh] overflow-y-auto">
            <p className="text-xs text-slate-400">{board?.name ?? ""}</p>
            <h2 className="mt-1 break-all text-2xl font-bold text-slate-950">
              {title.trim() || "제목 없음"}
            </h2>
            <div className="mt-5 border-t border-slate-100 pt-5">
              <RichContent json={content || '{"type":"doc","content":[]}'} />
            </div>
          </div>
        </MessageDialogShell>
      )}
    </form>
  );
}
