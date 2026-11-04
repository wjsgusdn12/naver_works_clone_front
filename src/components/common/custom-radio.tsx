"use client";

// 프로젝트 공통 라디오 표시. 얇은 원 + 고르면 원이 포인트 색으로 차고 가운데 흰 점이 찍힘.
// 큰 버튼(role="radio") 안에 표시용으로 넣어 씀.
export function RadioControl({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-150 ${checked ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white group-hover:border-slate-400"}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full bg-white transition-transform duration-150 ${checked ? "scale-100" : "scale-0"}`}
      />
    </span>
  );
}
