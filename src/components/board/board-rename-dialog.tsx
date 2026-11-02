"use client";

import { MessageDialogShell } from "@/components/chat/message-change-dialog";
import { Spinner } from "@/components/common/loading";
import type { BoardItem } from "@/lib/api/board-api";
import { useState } from "react";

// 회사·부서 게시판 이름 변경(관리자). 1~30자.
export function BoardRenameDialog({
  board,
  onClose,
  onSave,
}: {
  board: BoardItem;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(board.name);
  const [busy, setBusy] = useState(false);
  const trimmed = name.trim();
  const submit = async () => {
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onSave(trimmed);
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <MessageDialogShell title="게시판 이름 변경" onClose={onClose} widthClassName="max-w-md">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <input
          data-dialog-initial-focus
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={30}
          aria-label="게시판 이름"
          className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500"
        />
        <p className="mt-1.5 text-right text-xs text-slate-400">{trimmed.length}/30</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md border border-slate-200 px-5 py-2.5 text-sm font-medium transition hover:bg-slate-50 active:scale-95"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!trimmed || busy}
            className="flex cursor-pointer items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy && <Spinner size={14} />}
            저장
          </button>
        </div>
      </form>
    </MessageDialogShell>
  );
}
