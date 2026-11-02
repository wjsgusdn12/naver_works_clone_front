"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

// 마우스 커서를 따라다니는 작은 툴팁(커서 오른쪽 아래). 고정 위치 툴팁(Tooltip)과 달리 넓은 타일·카드에 어울림.
// body에 그려 패널 경계에 잘리지 않고, 화면 오른쪽·아래 끝에서는 안쪽으로 붙임. 터치 기기·누르는 순간에는 숨김.
const OFFSET_X = 14;
const OFFSET_Y = 18;
const MAX_WIDTH = 240;

export function CursorTooltip({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const follow = (event: MouseEvent) => {
    if (window.matchMedia("(hover: none)").matches) return;
    setPosition({ x: event.clientX, y: event.clientY });
  };
  const hide = () => setPosition(null);
  return (
    <span className={className} onMouseMove={follow} onMouseLeave={hide} onMouseDown={hide}>
      {children}
      {position &&
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-[300] max-w-60 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs leading-snug text-white shadow-lg"
            style={{
              left: Math.min(position.x + OFFSET_X, window.innerWidth - MAX_WIDTH - 8),
              top: Math.min(position.y + OFFSET_Y, window.innerHeight - 40),
            }}
          >
            {label}
          </span>,
          document.body,
        )}
    </span>
  );
}
