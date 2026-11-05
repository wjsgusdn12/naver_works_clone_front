"use client";

import { Spinner } from "@/components/common/loading";
import { Tooltip } from "@/components/common/tooltip";
import { UnderlineComposer } from "@/components/common/underline-composer";
import { boardApi, type BoardAttachment } from "@/lib/api/board-api";
import { fileIconOf, formatFileSize, MAX_ATTACHMENT_SIZE } from "@/lib/attachment-files";
import { Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";

// 댓글 하나에 붙일 수 있는 파일 수(서버와 같은 값)
export const MAX_COMMENT_FILES = 5;

// 붙일 파일 한 개. id가 null이면 아직 올리는 중(progress %).
type CommentFile = { key: string; id: number | null; name: string; size: number; progress: number };

// 댓글·답글 쓰기와 댓글 고치기 공용 입력. 파일은 고르는 즉시 올려 두고, 등록할 때 올린 파일 번호를 함께 보냄.
// onSubmit이 true를 돌려주면(성공) 입력을 비움. 고치기는 initial로 기존 내용·첨부를 채워 시작.
export function CommentComposer({
  accessToken,
  onSubmit,
  onToast,
  placeholder,
  label,
  initial,
  onCancel,
  autoFocus = false,
  showCount = false,
  submitLabel,
  className = "",
}: {
  accessToken: string;
  onSubmit: (content: string, attachmentIds: number[]) => Promise<boolean>;
  onToast: (message: string) => void;
  placeholder: string;
  label: string;
  initial?: { content: string; attachments: BoardAttachment[] };
  onCancel?: () => void;
  autoFocus?: boolean;
  showCount?: boolean;
  submitLabel?: string;
  className?: string;
}) {
  const [text, setText] = useState(initial?.content ?? "");
  const [files, setFiles] = useState<CommentFile[]>(
    () =>
      initial?.attachments.map((file) => ({
        key: `saved-${file.id}`,
        id: file.id,
        name: file.name,
        size: file.size,
        progress: 100,
      })) ?? [],
  );
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sequenceRef = useRef(0);
  const uploading = files.some((file) => file.id === null);

  const addFiles = (picked: File[]) => {
    const room = MAX_COMMENT_FILES - files.length;
    if (picked.length > room) onToast(`댓글 첨부는 ${MAX_COMMENT_FILES}개까지입니다.`);
    for (const file of picked.slice(0, Math.max(room, 0))) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        onToast(
          `${file.name}: 파일은 ${formatFileSize(MAX_ATTACHMENT_SIZE)}까지 올릴 수 있습니다.`,
        );
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
    if (sending || uploading) return;
    setSending(true);
    try {
      const done = await onSubmit(
        text.trim(),
        files.flatMap((file) => (file.id === null ? [] : [file.id])),
      );
      if (done && !initial) {
        setText("");
        setFiles([]);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <UnderlineComposer
      className={className}
      value={text}
      onChange={setText}
      onSubmit={() => void submit()}
      onCancel={onCancel}
      sending={sending}
      autoFocus={autoFocus}
      showCount={showCount}
      placeholder={placeholder}
      label={label}
      submitLabel={submitLabel}
      // Ctrl+V로 붙여 넣은 사진·파일(캡처 포함)도 📎로 고른 것처럼 올림
      onPasteFiles={sending ? undefined : addFiles}
      // 글이나 다 올라간 파일이 하나라도 있으면 등록 가능
      canSubmit={!uploading && (text.trim().length > 0 || files.length > 0)}
      attachments={
        files.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {files.map((file) => {
              const { Icon, className: iconClassName } = fileIconOf(file.name);
              return (
                <li
                  key={file.key}
                  className="flex max-w-[260px] items-center gap-1.5 rounded-md bg-slate-50 py-1 pl-2 pr-1 text-xs text-slate-600"
                >
                  {file.id === null ? (
                    <Spinner size={12} className="text-blue-500" />
                  ) : (
                    <Icon size={13} className={iconClassName} aria-hidden="true" />
                  )}
                  <span className="min-w-0 truncate">{file.name}</span>
                  <span className="shrink-0 text-slate-400">
                    {file.id === null ? `${file.progress}%` : formatFileSize(file.size)}
                  </span>
                  <button
                    type="button"
                    aria-label={`${file.name} 빼기`}
                    disabled={sending}
                    onClick={() =>
                      setFiles((current) => current.filter((item) => item.key !== file.key))
                    }
                    className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed"
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )
      }
      tools={
        <>
          <Tooltip label={`파일 첨부 (최대 ${MAX_COMMENT_FILES}개)`}>
            <button
              type="button"
              aria-label="파일 첨부"
              disabled={sending || files.length >= MAX_COMMENT_FILES}
              onClick={() => inputRef.current?.click()}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Paperclip size={15} aria-hidden="true" />
            </button>
          </Tooltip>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={(event) => {
              addFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
        </>
      }
    />
  );
}
