"use client";

import { Spinner } from "@/components/common/loading";
import { useBoardImage } from "@/hooks/use-board-image";
import { ImageOff } from "lucide-react";

// 게시글 본문 속 사진(첨부 ID로 받아 그림). 받는 동안 자리 표시, 실패하면 안내.
export function BoardImage({
  attachmentId,
  selected = false,
}: {
  attachmentId: number;
  selected?: boolean;
}) {
  const { url, failed } = useBoardImage(attachmentId);
  if (failed) {
    return (
      <span className="my-2 flex h-32 w-full max-w-md items-center justify-center gap-2 rounded-lg bg-slate-100 text-sm text-slate-400">
        <ImageOff size={18} aria-hidden="true" />
        사진을 불러오지 못했습니다.
      </span>
    );
  }
  if (!url) {
    return (
      <span className="my-2 flex h-32 w-full max-w-md items-center justify-center rounded-lg bg-slate-100">
        <Spinner size={18} className="text-slate-400" />
      </span>
    );
  }
  return (
    // 서버에서 받은 Blob 주소라 next/image 최적화 대상이 아님.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt="본문 사진"
      className={`my-2 max-h-[480px] max-w-full rounded-lg object-contain ${selected ? "ring-2 ring-blue-500" : ""}`}
    />
  );
}
