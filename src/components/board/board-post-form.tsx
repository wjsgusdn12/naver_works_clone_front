"use client";

import { BoardEditor } from "@/components/board/board-editor";
import { CustomCheckbox } from "@/components/common/custom-checkbox";
import { CustomSelect } from "@/components/common/custom-select";
import { Spinner } from "@/components/common/loading";
import { boardApi, type BoardItem, type BoardPostDetail } from "@/lib/api/board-api";
import { fileIconOf, formatFileSize, MAX_ATTACHMENT_SIZE } from "@/lib/attachment-files";
import { Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";

// 아래 첨부 목록의 한 줄. 올리는 중이면 id가 없고 progress(%)만 있음.
type FormFile = { key: string; id: number | null; name: string; size: number; progress: number };

const MAX_FILES = 20;

// 글쓰기·수정. 수정이면 게시판은 바꿀 수 없음. 문의하기에는 중요·필독을 걸 수 없음.
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
  onSaved: (post: BoardPostDetail) => void;
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
  const [important, setImportant] = useState(editing?.important ?? false);
  const [mustRead, setMustRead] = useState(editing?.mustRead ?? false);
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

  const submit = async () => {
    if (saving) return;
    if (!board) return onToast("게시판을 골라 주세요.");
    if (!title.trim()) return onToast("제목을 입력해 주세요.");
    if (uploadingFiles || uploadingImages > 0) return onToast("파일을 다 올린 뒤 등록해 주세요.");
    const input = {
      title: title.trim(),
      content,
      important: flagsAllowed && important,
      mustRead: flagsAllowed && mustRead,
      attachmentIds: files.map((file) => file.id).filter((id): id is number => id !== null),
    };
    setSaving(true);
    try {
      onSaved(
        editing
          ? await boardApi.update(accessToken, editing.id, input, editing.version)
          : await boardApi.create(accessToken, board.id, input),
      );
    } catch (error) {
      onToast(error instanceof Error ? error.message : "글을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="flex w-full max-w-4xl flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <h1 className="text-xl font-bold text-slate-950">{editing ? "글 수정" : "글쓰기"}</h1>
      <div className="flex items-center gap-3">
        <span className="w-14 shrink-0 text-sm font-medium text-slate-600">게시판</span>
        {editing ? (
          <span className="text-sm text-slate-800">{editing.board.name}</span>
        ) : (
          <CustomSelect
            label="게시판"
            value={boardId ? String(boardId) : ""}
            onChange={(value) => setBoardId(Number(value) || null)}
            placeholder="게시판 선택"
            options={boards.map((item) => ({
              value: String(item.id),
              label: item.myCompany ? item.name : `${item.companyName} · ${item.name}`,
            }))}
            className="w-72"
          />
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="w-14 shrink-0 text-sm font-medium text-slate-600">제목</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          placeholder="제목을 입력하세요"
          aria-label="제목"
          className="h-11 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500"
        />
      </div>
      {flagsAllowed && (
        <div className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-sm font-medium text-slate-600">옵션</span>
          <CustomCheckbox
            label="중요"
            text="중요 (게시판 맨 위에 고정)"
            checked={important}
            onChange={() => setImportant((value) => !value)}
          />
          <CustomCheckbox
            label="필독"
            text="필독 (읽음 확인)"
            checked={mustRead}
            onChange={() => setMustRead((value) => !value)}
          />
        </div>
      )}
      <BoardEditor
        accessToken={accessToken}
        initialContent={editing?.content ?? null}
        onChange={setContent}
        onUploadingChange={setUploadingImages}
        onError={onToast}
      />
      <section className="rounded-lg border border-dashed border-slate-300 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">
            첨부 파일 {files.length}
            <span className="ml-2 text-xs font-normal text-slate-400">
              파일당 20MB · 최대 {MAX_FILES}개
            </span>
          </span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            <Paperclip size={14} aria-hidden="true" />
            파일 추가
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
        </div>
        {files.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1">
            {files.map((file) => {
              const { Icon, className } = fileIconOf(file.name);
              return (
                <li
                  key={file.key}
                  className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2"
                >
                  <Icon size={16} className={className} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
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
                    className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 disabled:invisible"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <div className="flex justify-end gap-2 pb-6">
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-md border border-slate-200 px-5 py-2.5 text-sm font-medium transition hover:bg-slate-50 active:scale-95"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex cursor-pointer items-center gap-2 rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-95 disabled:cursor-wait disabled:opacity-60"
        >
          {saving && <Spinner size={14} />}
          {editing ? "수정" : "등록"}
        </button>
      </div>
    </form>
  );
}
