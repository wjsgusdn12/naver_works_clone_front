import type { SVGProps } from "react";

// 댓글 아이콘(직접 그린 SVG): 둥근 타원 말풍선 + 안쪽 점 세 개, 꼬리는 왼쪽 아래로 휘어짐.
// 선 두께·크기 방식은 lucide 아이콘과 같아서 옆에 나란히 둬도 어울림. 색은 글자색(currentColor)을 따름.
export function CommentIcon({
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
      <path d="M12 4c4.7 0 8.5 2.95 8.5 6.6s-3.8 6.6-8.5 6.6c-.95 0-1.86-.12-2.7-.34L4.6 19.4l1.3-3.7C4.4 14.5 3.5 12.65 3.5 10.6 3.5 6.95 7.3 4 12 4Z" />
      <circle cx="8.6" cy="10.6" r="0.4" fill="currentColor" />
      <circle cx="12" cy="10.6" r="0.4" fill="currentColor" />
      <circle cx="15.4" cy="10.6" r="0.4" fill="currentColor" />
    </svg>
  );
}
