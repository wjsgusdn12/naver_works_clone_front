"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { profileImageApi, type ProfileImageVersions } from "@/lib/api/profile-image-api";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// 다른 사람이 사진을 바꾼 것은 이 간격마다 반영(내 사진은 바꾸는 즉시).
const REFRESH_MS = 5 * 60 * 1000;

type ProfileImageContextValue = {
  versions: ProfileImageVersions;
  // 내 사진을 바꾼 직후 서버가 돌려준 새 목록으로 바로 교체
  setVersions: (versions: ProfileImageVersions) => void;
};

const ProfileImageContext = createContext<ProfileImageContextValue | null>(null);

// 프로필 사진 목록(누가 사진이 있는지)을 로그인 동안 한 번 받아 두고 모든 아바타가 같이 씀.
export function ProfileImageProvider({ children }: { children: ReactNode }) {
  const { status, accessToken } = useAuth();
  const [versions, setVersions] = useState<ProfileImageVersions>({});

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) return;
    let cancelled = false;
    const load = () =>
      profileImageApi
        .list(accessToken)
        .then((result) => {
          if (!cancelled) setVersions(result);
        })
        .catch(() => undefined);
    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      setVersions({});
    };
  }, [status, accessToken]);

  const value = useMemo(() => ({ versions, setVersions }), [versions]);
  return <ProfileImageContext.Provider value={value}>{children}</ProfileImageContext.Provider>;
}

export function useProfileImages() {
  return useContext(ProfileImageContext);
}

// 같은 사진을 화면 여러 곳이 동시에 그려도 한 번만 받도록 "구성원:판"별로 Blob 주소를 보관(새로고침 전까지).
const urlCache = new Map<string, Promise<string | null>>();

// 이 구성원의 프로필 사진 주소. 사진이 없거나 받는 중·실패면 null(이름 글자 아바타).
export function useProfileImageUrl(membershipId: number | null | undefined) {
  const { accessToken } = useAuth();
  const context = useContext(ProfileImageContext);
  const version = membershipId == null ? undefined : context?.versions[membershipId];
  const key = membershipId != null && version ? `${membershipId}:${version}` : null;
  const [loaded, setLoaded] = useState<{ key: string; url: string | null } | null>(null);

  const fetchUrl = useCallback(
    (id: number, ver: string, cacheKey: string) => {
      if (!accessToken) return Promise.resolve(null);
      let pending = urlCache.get(cacheKey);
      if (!pending) {
        pending = profileImageApi
          .blob(accessToken, id, ver)
          .then((blob) => URL.createObjectURL(blob))
          .catch(() => {
            // 실패하면 다음에 다시 시도할 수 있게 지움
            urlCache.delete(cacheKey);
            return null;
          });
        urlCache.set(cacheKey, pending);
      }
      return pending;
    },
    [accessToken],
  );

  useEffect(() => {
    if (!key || membershipId == null || !version) return;
    let cancelled = false;
    void fetchUrl(membershipId, version, key).then((url) => {
      if (!cancelled) setLoaded({ key, url });
    });
    return () => {
      cancelled = true;
    };
  }, [key, membershipId, version, fetchUrl]);

  return key && loaded?.key === key ? loaded.url : null;
}
