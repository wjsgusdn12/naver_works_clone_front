"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { boardApi } from "@/lib/api/board-api";
import { useEffect, useState } from "react";

// 게시판 사진을 <img>에 넣을 주소로 받아 기억(같은 사진을 목록·본문·편집기에서 다시 받지 않게).
// 너무 많이 쌓이면 가장 먼저 받은 것부터 정리.
const cache = new Map<string, Promise<string>>();
const MAX_CACHED = 100;

const load = (token: string, attachmentId: number, thumbnail: boolean) => {
  const key = `${attachmentId}:${thumbnail}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const promise = boardApi
    .attachmentBlob(token, attachmentId, true, thumbnail)
    .then((blob) => URL.createObjectURL(blob));
  // 실패한 요청은 기억하지 않아 다시 시도할 수 있게 함.
  promise.catch(() => cache.delete(key));
  cache.set(key, promise);
  if (cache.size > MAX_CACHED) {
    const oldestKey = cache.keys().next().value!;
    const oldest = cache.get(oldestKey);
    cache.delete(oldestKey);
    void oldest?.then((url) => URL.revokeObjectURL(url)).catch(() => undefined);
  }
  return promise;
};

// 받는 동안 url=null, 실패하면 failed=true. thumbnail: 작은 사본(목록용), 본문은 원본.
export function useBoardImage(attachmentId: number | null, thumbnail = false) {
  const { accessToken } = useAuth();
  const [result, setResult] = useState<{
    id: number;
    url: string | null;
    failed: boolean;
  } | null>(null);
  useEffect(() => {
    if (!accessToken || attachmentId === null) return;
    let alive = true;
    load(accessToken, attachmentId, thumbnail)
      .then((url) => alive && setResult({ id: attachmentId, url, failed: false }))
      .catch(() => alive && setResult({ id: attachmentId, url: null, failed: true }));
    return () => {
      alive = false;
    };
  }, [accessToken, attachmentId, thumbnail]);
  const current = result?.id === attachmentId ? result : null;
  return { url: current?.url ?? null, failed: current?.failed ?? false };
}
