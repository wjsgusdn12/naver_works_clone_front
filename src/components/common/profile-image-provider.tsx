"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { profileImageApi, type ProfileImageVersions } from "@/lib/api/profile-image-api";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

// 실시간 연결이 이어질 때 목록을 다시 받되, 방금 받았으면 건너뜀(로그인 직후 첫 연결과 겹치지 않게).
const RELOAD_GAP_MS = 10_000;

type ProfileImageContextValue = {
  versions: ProfileImageVersions;
  // 내 사진을 바꾼 직후 서버가 돌려준 새 목록으로 바로 교체
  setVersions: (versions: ProfileImageVersions) => void;
  // 실시간 "사진 바뀜" 소식: 그 사람 것만 고침(version이 null이면 사진 없음)
  applyChange: (membershipId: number, version: string | null) => void;
  // 실시간 연결(재연결)될 때: 끊긴 동안 놓친 변경을 메우려고 목록을 한 번 다시 받음
  reload: () => void;
};

const ProfileImageContext = createContext<ProfileImageContextValue | null>(null);

// 프로필 사진 목록(누가 사진이 있는지)을 로그인 때 한 번 받아 두고 모든 아바타가 같이 씀.
// 그 뒤 변경은 주기적으로 묻지 않고 실시간 소식(applyChange)으로 반영, 재연결 때만 다시 받음(reload).
export function ProfileImageProvider({ children }: { children: ReactNode }) {
  const { status, accessToken } = useAuth();
  const [versions, setVersions] = useState<ProfileImageVersions>({});
  const loadRef = useRef<(() => void) | null>(null);
  const loadedAtRef = useRef(0);

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) return;
    let cancelled = false;
    const load = () => {
      loadedAtRef.current = Date.now();
      profileImageApi
        .list(accessToken)
        .then((result) => {
          if (!cancelled) setVersions(result);
        })
        .catch(() => {
          // 실패하면 다음 재연결 때 다시 받을 수 있게
          loadedAtRef.current = 0;
        });
    };
    loadRef.current = load;
    load();
    return () => {
      cancelled = true;
      loadRef.current = null;
      setVersions({});
    };
  }, [status, accessToken]);

  const applyChange = useCallback((membershipId: number, version: string | null) => {
    setVersions((current) => {
      if ((current[membershipId] ?? null) === version) return current;
      const next = { ...current };
      if (version) next[membershipId] = version;
      else delete next[membershipId];
      return next;
    });
  }, []);

  const reload = useCallback(() => {
    if (Date.now() - loadedAtRef.current < RELOAD_GAP_MS) return;
    loadRef.current?.();
  }, []);

  const value = useMemo(
    () => ({ versions, setVersions, applyChange, reload }),
    [versions, applyChange, reload],
  );
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
