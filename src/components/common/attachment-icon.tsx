import type { SVGProps } from "react";

// 첨부 파일 아이콘(우리 프로젝트 전용으로 직접 그린 SVG):
// 오른쪽 위 귀퉁이가 접힌 문서 + 문서 안에 꽂힌 클립. 문서 안쪽은 옅게 채워 작은 크기에서도 덩어리로 보임.
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
      {/* 문서: 옅은 채움 + 테두리 */}
      <path
        d="M7 2.75h7.25L19.25 7.75V19A2.25 2.25 0 0 1 17 21.25H7A2.25 2.25 0 0 1 4.75 19V5A2.25 2.25 0 0 1 7 2.75Z"
        fill="currentColor"
        fillOpacity={0.12}
      />
      {/* 접힌 귀퉁이 */}
      <path d="M14.25 2.75V6.5a1.25 1.25 0 0 0 1.25 1.25h3.75" />
      {/* 문서 안 클립 */}
      <path d="M13.5 11v4.25a1.75 1.75 0 0 1-3.5 0V10.5a1 1 0 0 1 2 0v4.5" />
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
