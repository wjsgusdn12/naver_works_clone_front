import { ApiClientError } from "@/lib/api/auth-api";
import { apiBaseUrl, apiFetchBlob, apiRequest } from "@/lib/api/chat-api";

// 사진이 있는 구성원 ID → 판. 사진을 바꾸면 판이 달라져 화면이 새 사진을 받음.
export type ProfileImageVersions = Record<number, string>;

// 사진 올리기는 파일을 보내야 해서 JSON용 공통 요청 대신 FormData로 직접 보냄.
const upload = async (token: string, file: File) => {
  const form = new FormData();
  form.append("file", file);
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}/api/v1/profile/image/upload`, {
      method: "POST",
      credentials: "include",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch {
    throw new ApiClientError("서버에 연결할 수 없습니다.", 0, "NETWORK_ERROR");
  }
  const body = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    data?: ProfileImageVersions;
    message?: string;
    code?: string;
  };
  if (!response.ok || !body.success || !body.data)
    throw new ApiClientError(
      body.message ?? "사진을 올리지 못했습니다.",
      response.status,
      body.code ?? "UNKNOWN_ERROR",
    );
  return body.data;
};

export const profileImageApi = {
  list: (token: string) => apiRequest<ProfileImageVersions>("/api/v1/profile/image/list", token),
  upload,
  remove: (token: string) =>
    apiRequest<ProfileImageVersions>("/api/v1/profile/image/remove", token, { method: "POST" }),
  // 토큰을 헤더로 보내야 해서 <img src>에 주소를 바로 넣지 않고 Blob으로 받음. 판을 붙여 브라우저 캐시가 새 사진을 놓치지 않게 함.
  blob: (token: string, membershipId: number, version: string) =>
    apiFetchBlob(token, `/api/v1/profile/image/${membershipId}?v=${encodeURIComponent(version)}`),
};
