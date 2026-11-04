// 게시판 화면의 날짜 표시는 모두 이 형식으로 통일.
// 날짜: "2026. 11. 04." / 날짜·시각: "2026. 11. 04. 09:30"(24시간)
const pad = (value: number) => String(value).padStart(2, "0");

export const boardDate = (value: string | Date) => {
  const date = new Date(value);
  return `${date.getFullYear()}. ${pad(date.getMonth() + 1)}. ${pad(date.getDate())}.`;
};

export const boardDateTime = (value: string | Date) => {
  const date = new Date(value);
  return `${boardDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
