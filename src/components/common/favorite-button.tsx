import { Star } from "lucide-react";

type FavoriteButtonProps = {
  active: boolean;
  onClick: () => void;
  // list: 목록 줄(주소록·게시판 사이드바), panel: 상세 패널, modal: 프로필 모달
  size?: "list" | "panel" | "modal";
  // 스크린 리더용 이름. 무엇의 즐겨찾기인지 알려 주고 싶을 때(예: "자유게시판 즐겨찾기")
  label?: string;
};

const SIZE: Record<NonNullable<FavoriteButtonProps["size"]>, { box: string; icon: number }> = {
  list: { box: "h-5 w-5", icon: 12 },
  panel: { box: "h-6 w-6", icon: 13 },
  modal: { box: "h-7 w-7", icon: 14 },
};

// 프로젝트 공통 즐겨찾기 버튼(주소록·프로필·게시판). 켜지면 녹색 원 안의 흰 별.
export function FavoriteButton({
  active,
  onClick,
  size = "list",
  label = "즐겨찾기 변경",
}: FavoriteButtonProps) {
  const sizes = SIZE[size];
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      className={`flex shrink-0 cursor-pointer items-center justify-center rounded-full border transition active:scale-90 ${sizes.box} ${active ? "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600" : "border-slate-500 bg-transparent text-slate-500 hover:bg-slate-100"}`}
      onClick={onClick}
    >
      <Star
        size={sizes.icon}
        fill={active ? "currentColor" : "none"}
        strokeWidth={size === "modal" ? 2.5 : 2}
      />
    </button>
  );
}
