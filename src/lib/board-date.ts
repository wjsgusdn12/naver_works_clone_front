// 게시판 화면의 날짜 표시는 모두 이 형식으로 통일.
// 목록 날짜(boardDate): 방금 전 → n분 전 → (오늘) n시간 전 → 어제 → 그 전은 "2026. 11. 04."
// 날짜·시각(boardDateTime, 글 보기·예약): "2026. 11. 04. 09:30"(24시간)
const pad = (value: number) => String(value).padStart(2, "0");

const fullDate = (date: Date) =>
  `${date.getFullYear()}. ${pad(date.getMonth() + 1)}. ${pad(date.getDate())}.`;

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export const boardDate = (value: string | Date, now = new Date()) => {
  const date = new Date(value);
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  // 미래(예약 글 등)·시계 차이는 날짜로
  if (minutes < 0) return fullDate(date);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return `${Math.floor(minutes / 60)}시간 전`;
  if (days === 1) return "어제";
  return fullDate(date);
};

export const boardDateTime = (value: string | Date) => {
  const date = new Date(value);
  return `${fullDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
