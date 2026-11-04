import type { SVGProps } from "react";

// 첨부 파일 아이콘(우리 프로젝트 전용으로 직접 그린 SVG):
// 비스듬히 누운 클립 하나. 작게 그려도 뭉치지 않도록 세로 선 3개를 넉넉히 띄움(간격 5).
// 기본 색은 포인트 파랑(text-blue-600). 다른 색이 필요하면 tone으로 바꿈(className에 글자색을 넣지 말 것).
export function AttachmentIcon({
  size = 16,
  strokeWidth = 2,
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
      {/* 클립: 바깥 고리(폭 10) → 안쪽 고리(폭 5)를 한 줄로 그리고 45도 기울임 */}
      <path transform="rotate(45 12 12)" d="M17 9v8a5 5 0 0 1-10 0V6.5a2.5 2.5 0 0 1 5 0V16" />
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
