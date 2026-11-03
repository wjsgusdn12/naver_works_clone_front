import type { SVGProps } from "react";

// 첨부 파일 아이콘(우리 프로젝트 전용으로 직접 그린 SVG):
// 비스듬히 누운 클립 하나.
// 기본 색은 포인트 파랑(text-blue-600). 다른 색이 필요하면 tone으로 바꿈(className에 글자색을 넣지 말 것).
export function AttachmentIcon({
  size = 16,
  strokeWidth = 1.8,
  tone = "text-blue-600",
  className = "",
  ...props
}: SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number; tone?: string }) {
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
      className={`${tone} ${className}`}
      {...props}
    >
      {/* 클립: 바깥 고리 → 안쪽 고리 순서로 한 줄로 그리고 40도 기울임 */}
      <path
        transform="rotate(40 12 12)"
        d="M15.25 8.5v8.75a3.25 3.25 0 0 1-6.5 0V5.75a2.25 2.25 0 0 1 4.5 0v10.5a1.25 1.25 0 0 1-2.5 0V8.5"
      />
    </svg>
  );
}

// 제목 옆 "첨부 있음" 표시. has가 false면 아무것도 그리지 않음.
// 게시글 목록·카드·상세 등 제목을 보여 주는 모든 자리에서 이것 하나로 통일.
export function AttachmentMark({
  has,
  size = 15,
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
      className={`shrink-0 ${className}`}
    />
  );
}
