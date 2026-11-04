"use client";

// 프로젝트 공통 라디오 표시. 얇은 원 + 고르면 테두리가 포인트 색이 되고 가운데 작은 점이 찍힘.
// 큰 버튼(role="radio") 안에 표시용으로 넣어 씀.
export function RadioControl({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] bg-white transition-colors duration-150 ${checked ? "border-blue-600" : "border-slate-300 group-hover:border-slate-400"}`}
    >
      <span
        className={`h-2 w-2 rounded-full bg-blue-600 transition-transform duration-150 ${checked ? "scale-100" : "scale-0"}`}
      />
    </span>
  );
}
