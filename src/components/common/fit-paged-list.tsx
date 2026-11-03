"use client";

import { Pagination } from "@/components/common/pagination";
import { useEffect, useRef, useState, type ReactNode } from "react";

// 넓은 화면(xl) 기준. 이때는 부모 칸 높이가 고정이라 그 높이에 들어가는 만큼만 한 페이지로 보여 줌.
const WIDE = "(min-width: 1280px)";

// 스크롤 없이 쪽 번호로 넘기는 목록. 넓은 화면에서는 부모(relative, 높이 고정) 칸을 꽉 채우고
// 첫 줄 높이로 한 페이지에 들어갈 개수를 계산함(카드 높이가 바뀌면 다시 계산). 좁은 화면은 fallbackSize개씩.
export function FitPagedList<T>({
  items,
  getKey,
  renderItem,
  fallbackSize = 5,
  label = "목록 페이지",
  listClassName = "divide-y divide-slate-100",
}: {
  items: T[];
  getKey: (item: T) => string | number;
  renderItem: (item: T) => ReactNode;
  fallbackSize?: number;
  // 스크린 리더용 쪽 번호 영역 이름(카드마다 구분)
  label?: string;
  listClassName?: string;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [pageSize, setPageSize] = useState(fallbackSize);
  const [page, setPage] = useState(0);

  // 칸 높이 ÷ 첫 줄 높이 = 한 페이지 개수. 칸 크기가 바뀌거나 넓은/좁은 화면이 바뀌면 다시 셈.
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const wide = window.matchMedia(WIDE);
    const measure = () => {
      if (!wide.matches) return setPageSize(fallbackSize);
      const row = listRef.current?.firstElementChild as HTMLElement | null;
      if (!row || row.offsetHeight === 0) return;
      // 줄 사이 구분선(1px)까지 한 줄 높이로 셈
      setPageSize(Math.max(1, Math.floor(area.clientHeight / (row.offsetHeight + 1))));
    };
    // 그려진 뒤에 재야 첫 줄 높이가 나옴
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    wide.addEventListener("change", measure);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      wide.removeEventListener("change", measure);
    };
  }, [fallbackSize, items.length]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  // 목록이 줄어 지금 쪽이 사라지면 마지막 쪽으로
  const current = Math.min(page, totalPages - 1);
  const shown = items.slice(current * pageSize, (current + 1) * pageSize);

  return (
    <div className="flex flex-col xl:absolute xl:inset-0">
      <div ref={areaRef} className="min-h-0 overflow-hidden xl:flex-1">
        <ul ref={listRef} className={listClassName}>
          {shown.map((item) => (
            <li key={getKey(item)}>{renderItem(item)}</li>
          ))}
        </ul>
      </div>
      <Pagination
        page={current}
        totalPages={totalPages}
        onChange={setPage}
        label={label}
        className="shrink-0 pt-1"
      />
    </div>
  );
}
