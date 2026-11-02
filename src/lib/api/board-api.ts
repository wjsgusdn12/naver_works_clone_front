import { ApiClientError } from "@/lib/api/auth-api";
import { apiBaseUrl, apiFetchBlob, apiRequest } from "@/lib/api/chat-api";

// 게시판 종류. 회사마다 공지사항·자유게시판·문의하기·회사 게시판 하나씩, 부서마다 부서 게시판 하나.
export type BoardType = "NOTICE" | "FREE" | "INQUIRY" | "COMPANY" | "DEPARTMENT";
// 목록 종류(사이드바 메뉴). BOARD는 게시판 하나(boardId 필요).
// TYPE은 공지·자유·문의 같은 한 종류 전체(type 필요, 관리자는 모든 회사).
// 목록 정렬: CREATED(글 등록순), ACTIVITY(글/댓글 업데이트 순)
export type BoardListSort = "CREATED" | "ACTIVITY";
export type BoardView = "LATEST" | "MUST_READ" | "IMPORTANT" | "MINE" | "BOARD" | "TYPE" | "TRASH";

// 사이드바의 게시판 한 줄. myCompany: 내 회사 게시판(관리자는 다른 회사 것도 받음).
export type BoardItem = {
  id: number;
  type: BoardType;
  name: string;
  companyId: number;
  companyName: string;
  departmentId: number | null;
  myCompany: boolean;
  favorite: boolean;
  canWrite: boolean;
  canRename: boolean;
};

export type BoardSidebar = { boards: BoardItem[]; admin: boolean };

// 목록의 글 한 줄. read: 내가 읽었는지, hasFile: 첨부 파일 있음, answered: 문의하기 답변 완료.
export type BoardPostSummary = {
  id: number;
  boardId: number;
  boardName: string;
  boardType: BoardType;
  companyName: string;
  title: string;
  preview: string;
  authorMembershipId: number;
  authorName: string;
  createdAt: string;
  important: boolean;
  mustRead: boolean;
  read: boolean;
  viewCount: number;
  commentCount: number;
  hasFile: boolean;
  answered: boolean;
  deletedAt: string | null;
};

// pinned: 게시판 첫 페이지의 중요 글(맨 위 고정, 검색 중이면 없음). page는 0부터.
export type BoardPostPage = {
  pinned: BoardPostSummary[];
  items: BoardPostSummary[];
  page: number;
  totalPages: number;
  totalElements: number;
};

export type BoardHome = {
  latest: BoardPostSummary[];
  inquiries: BoardPostSummary[];
  notices: BoardPostSummary[];
  free: BoardPostSummary[];
  noticeBoardId: number | null;
  freeBoardId: number | null;
  inquiryBoardId: number | null;
};

// inline: 본문 속 사진(아래 첨부 목록에는 안 보임)
export type BoardAttachment = {
  id: number;
  kind: "IMAGE" | "FILE";
  name: string;
  contentType: string;
  size: number;
  width: number | null;
  height: number | null;
  inline: boolean;
};

export type BoardComment = {
  id: number;
  authorMembershipId: number;
  authorName: string;
  authorAdmin: boolean;
  content: string;
  createdAt: string;
  canDelete: boolean;
};

// content: 편집기 문서 JSON 문자열(서버가 허용한 형식만 남긴 것)
export type BoardPostDetail = {
  id: number;
  board: BoardItem;
  title: string;
  content: string;
  authorMembershipId: number;
  authorName: string;
  authorDepartmentName: string | null;
  createdAt: string;
  updatedAt: string | null;
  important: boolean;
  mustRead: boolean;
  viewCount: number;
  answeredAt: string | null;
  deletedAt: string | null;
  version: number;
  attachments: BoardAttachment[];
  comments: BoardComment[];
  canEdit: boolean;
  canDelete: boolean;
  canRestore: boolean;
  canSeeReaders: boolean;
  canComment: boolean;
};

export type BoardReader = { membershipId: number; name: string; departmentName: string | null };
export type BoardReaders = { read: BoardReader[]; unread: BoardReader[] };

export type BoardPostInput = {
  title: string;
  content: string;
  important: boolean;
  mustRead: boolean;
  attachmentIds: number[];
};

const json = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

// 첨부 올리기. 진행률을 보이려고 XMLHttpRequest 사용(채팅 첨부와 같은 방식).
const uploadAttachment = (token: string, file: File, onProgress: (percent: number) => void) =>
  new Promise<BoardAttachment>((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${apiBaseUrl()}/api/v1/board/attachment/upload`);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let body: { success?: boolean; data?: BoardAttachment; message?: string; code?: string } = {};
      try {
        body = JSON.parse(xhr.responseText) as typeof body;
      } catch {
        // 본문이 JSON이 아니면 아래 공통 오류로 처리.
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.success && body.data) resolve(body.data);
      else
        reject(
          new ApiClientError(
            body.message ?? "파일을 올리지 못했습니다.",
            xhr.status,
            body.code ?? "UNKNOWN_ERROR",
          ),
        );
    };
    xhr.onerror = () =>
      reject(new ApiClientError("서버에 연결할 수 없습니다.", 0, "NETWORK_ERROR"));
    xhr.send(form);
  });

export const boardApi = {
  sidebar: (token: string) => apiRequest<BoardSidebar>("/api/v1/board/sidebar", token),
  home: (token: string) => apiRequest<BoardHome>("/api/v1/board/home", token),
  list: (
    token: string,
    view: BoardView,
    target: { boardId?: number | null; type?: BoardType | null },
    // page: 0부터. keyword: 제목·본문·글쓴이 검색어(없으면 전체). size·sort·unread는 보기 설정.
    options: {
      page?: number;
      keyword?: string;
      size?: number;
      sort?: BoardListSort;
      unread?: boolean;
    } = {},
  ) => {
    const query = new URLSearchParams({ view });
    if (target.boardId) query.set("boardId", String(target.boardId));
    if (target.type) query.set("type", target.type);
    if (options.page) query.set("page", String(options.page));
    if (options.keyword) query.set("keyword", options.keyword);
    if (options.size) query.set("size", String(options.size));
    if (options.sort) query.set("sort", options.sort);
    if (options.unread) query.set("unread", "true");
    return apiRequest<BoardPostPage>(`/api/v1/board/post/list?${query}`, token);
  },
  // 목록에서 고른 글을 한꺼번에 읽음으로(최대 100개). 결과는 새로 읽음 처리한 글 수.
  markRead: (token: string, postIds: number[]) =>
    apiRequest<number>("/api/v1/board/post/read", token, json({ postIds })),
  // 처음 여는 글이면 서버가 읽음 기록·조회수 1을 함께 처리.
  detail: (token: string, postId: number) =>
    apiRequest<BoardPostDetail>(`/api/v1/board/post/${postId}`, token),
  create: (token: string, boardId: number, input: BoardPostInput) =>
    apiRequest<BoardPostDetail>("/api/v1/board/post/create", token, json({ boardId, ...input })),
  update: (token: string, postId: number, input: BoardPostInput, expectedVersion: number) =>
    apiRequest<BoardPostDetail>(
      `/api/v1/board/post/update/${postId}`,
      token,
      json({ ...input, expectedVersion }),
    ),
  // 휴지통으로 옮김(복구 가능)
  remove: (token: string, postId: number) =>
    apiRequest<void>(`/api/v1/board/post/delete/${postId}`, token, { method: "POST" }),
  restore: (token: string, postId: number) =>
    apiRequest<void>(`/api/v1/board/post/restore/${postId}`, token, { method: "POST" }),
  readers: (token: string, postId: number) =>
    apiRequest<BoardReaders>(`/api/v1/board/post/${postId}/readers`, token),
  addComment: (token: string, postId: number, content: string) =>
    apiRequest<BoardPostDetail>(
      `/api/v1/board/comment/create?postId=${postId}`,
      token,
      json({ content }),
    ),
  deleteComment: (token: string, commentId: number) =>
    apiRequest<BoardPostDetail>(`/api/v1/board/comment/delete/${commentId}`, token, {
      method: "POST",
    }),
  toggleFavorite: (token: string, boardId: number) =>
    apiRequest<boolean>(`/api/v1/board/favorite/toggle?boardId=${boardId}`, token, {
      method: "POST",
    }),
  rename: (token: string, boardId: number, name: string) =>
    apiRequest<BoardItem>(`/api/v1/board/rename?boardId=${boardId}`, token, json({ name })),
  uploadAttachment,
  // 토큰을 헤더로 보내야 해서 <img src>에 주소를 바로 넣지 않고 Blob으로 받음.
  attachmentBlob: (token: string, attachmentId: number, inline: boolean, thumbnail = false) =>
    apiFetchBlob(
      token,
      `/api/v1/board/attachment/download?attachmentId=${attachmentId}&inline=${inline}&thumbnail=${thumbnail}`,
    ),
};
