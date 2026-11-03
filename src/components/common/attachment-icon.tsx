import type { SVGProps } from "react";

// 첨부 파일 아이콘(직접 그린 SVG): 비스듬히 누운 클립.
// 선 두께·크기 방식은 lucide 아이콘과 같아서 옆에 나란히 둬도 어울림. 색은 글자색(currentColor)을 따름.
export function AttachmentIcon({
  size = 16,
  strokeWidth = 2,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path
        transform="rotate(40 12 12)"
        d="M15.5 8v8.5a3.5 3.5 0 0 1-7 0V6a2.5 2.5 0 0 1 5 0v10a1.5 1.5 0 0 1-3 0V8.5"
      />
    </svg>
  );
}

// 제목 옆 "첨부 있음" 표시. has가 false면 아무것도 그리지 않음.
// 게시글 목록·카드·상세 등 제목을 보여 주는 모든 자리에서 이것 하나로 통일.
export function AttachmentMark({
  has,
  size = 14,
  className = "",
}: {
  has: boolean;
  size?: number;
  className?: string;
}) {
  if (!has) return null;
  return (
    <AttachmentIcon
      size={size}
      role="img"
      aria-label="첨부 파일 있음"
      className={`shrink-0 text-slate-400 ${className}`}
    />
  );
}
