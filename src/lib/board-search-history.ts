// 게시판 최근 검색어. 이 브라우저에 사용자(membershipId)별로 최대 10개, 최신순.
// 주소록은 서버에 저장하지만 게시판은 가볍게 브라우저에만 둠(다른 기기와는 공유되지 않음).
// 저장소를 못 쓰는 환경(사생활 보호 창 등)이면 기록 없이 동작.
export type BoardSearchHistory = { enabled: boolean; keywords: string[] };

const MAX_KEYWORDS = 10;
const storageKey = (membershipId: number) => `board-search-history:${membershipId}`;

export const loadSearchHistory = (membershipId: number): BoardSearchHistory => {
  try {
    const raw = window.localStorage.getItem(storageKey(membershipId));
    if (!raw) return { enabled: true, keywords: [] };
    const parsed = JSON.parse(raw) as Partial<BoardSearchHistory>;
    return {
      enabled: parsed.enabled !== false,
      keywords: Array.isArray(parsed.keywords)
        ? parsed.keywords.filter((value): value is string => typeof value === "string").slice(0, MAX_KEYWORDS)
        : [],
    };
  } catch {
    return { enabled: true, keywords: [] };
  }
};

export const saveSearchHistory = (membershipId: number, history: BoardSearchHistory) => {
  try {
    window.localStorage.setItem(storageKey(membershipId), JSON.stringify(history));
  } catch {
    // 저장 못 해도 이번 화면에서는 그대로 보임
  }
};

// 맨 앞에 넣고 같은 검색어(대소문자 무시)는 하나만
export const pushKeyword = (history: BoardSearchHistory, keyword: string): BoardSearchHistory => {
  if (!history.enabled || !keyword) return history;
  const lower = keyword.toLowerCase();
  return {
    ...history,
    keywords: [keyword, ...history.keywords.filter((value) => value.toLowerCase() !== lower)].slice(
      0,
      MAX_KEYWORDS,
    ),
  };
};
