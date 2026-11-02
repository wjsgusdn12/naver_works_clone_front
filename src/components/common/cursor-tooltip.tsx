"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

// 마우스 커서를 따라다니는 작은 툴팁(커서 오른쪽 아래). 고정 위치 툴팁(Tooltip)과 달리 넓은 타일·카드에 어울림.
// body에 그려 패널 경계에 잘리지 않음. 화면 오른쪽·아래 끝 근처에서는 커서 왼쪽·위쪽으로 뒤집어 붙여
// 어디서든 커서를 따라다님(끝에서 위치를 고정하면 오른쪽 끝 패널에서 툴팁이 멈춰 보임). 터치 기기·누르는 순간에는 숨김.
const OFFSET_X = 14;
const OFFSET_Y = 18;
// 툴팁 최대 폭(max-w-60)과 대략의 높이. 커서에서 이만큼 남지 않으면 반대쪽으로 뒤집음.
const MAX_WIDTH = 240;
const FLIP_HEIGHT = 48;

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
            style={tooltipStyle(position)}
          >
            {label}
          </span>,
          document.body,
        )}
    </span>
  );
}

// 커서 오른쪽 아래가 기본. 오른쪽·아래 공간이 모자라면 왼쪽·위로 뒤집음(transform으로 툴팁 크기만큼 당김).
function tooltipStyle({ x, y }: { x: number; y: number }) {
  const flipX = x + OFFSET_X + MAX_WIDTH > window.innerWidth;
  const flipY = y + OFFSET_Y + FLIP_HEIGHT > window.innerHeight;
  return {
    left: flipX ? x - OFFSET_X : x + OFFSET_X,
    top: flipY ? y - OFFSET_X : y + OFFSET_Y,
    transform: `translate(${flipX ? "-100%" : "0"}, ${flipY ? "-100%" : "0"})`,
  };
}
