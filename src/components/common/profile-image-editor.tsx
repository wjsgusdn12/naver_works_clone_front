"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Spinner } from "@/components/common/loading";
import { useProfileImages } from "@/components/common/profile-image-provider";
import { UserAvatar } from "@/components/common/user-avatar";
import { profileImageApi } from "@/lib/api/profile-image-api";
import type { MemberStatusType } from "@/lib/status-options";
import { Camera } from "lucide-react";
import { useRef, useState } from "react";

const MAX_BYTES = 5 * 1024 * 1024;

// 내 프로필 사진 바꾸기: 아바타 왼쪽 아래 카메라 버튼(또는 "사진 변경")으로 파일을 고르면 바로 올림.
// 사진이 있으면 "기본 이미지로"도 보임. 서버가 가운데를 정사각형으로 잘라 줄여 저장함.
export function ProfileImageEditor({
  statusType,
  onToast,
}: {
  statusType: MemberStatusType | null;
  onToast: (message: string) => void;
}) {
  const { member, accessToken } = useAuth();
  const images = useProfileImages();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  if (!member || !accessToken) return null;
  const hasImage = Boolean(images?.versions[member.membershipId]);

  const run = async (task: () => Promise<Record<number, string>>, done: string) => {
    setBusy(true);
    try {
      images?.setVersions(await task());
      onToast(done);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "프로필 사진을 바꾸지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const pick = (file: File | undefined) => {
    if (!file) return;
    // 서버에서도 막지만, 큰 파일은 올리기 전에 바로 안내
    if (file.size > MAX_BYTES) {
      onToast("프로필 사진은 5MB까지 올릴 수 있습니다.");
      return;
    }
    void run(() => profileImageApi.upload(accessToken, file), "프로필 사진을 바꿨습니다.");
  };

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <span className="relative">
        <UserAvatar
          name={member.displayName}
          membershipId={member.membershipId}
          presenceStatus="ONLINE"
          statusType={statusType}
          size="lg"
        />
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
            <Spinner size={18} />
          </span>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label="프로필 사진 변경"
          className="absolute -bottom-0.5 -left-0.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-slate-900 text-white ring-2 ring-white transition hover:bg-blue-600 active:scale-90 disabled:cursor-wait"
        >
          <Camera size={12} aria-hidden="true" />
        </button>
        {/* 파일 고르기 창만 쓰고 기본 입력란은 숨김 */}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          hidden
          onChange={(event) => {
            pick(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </span>
      {hasImage && (
        <button
          type="button"
          onClick={() =>
            void run(() => profileImageApi.remove(accessToken), "기본 이미지로 바꿨습니다.")
          }
          disabled={busy}
          className="cursor-pointer text-[11px] text-slate-400 transition hover:text-slate-800 disabled:cursor-wait"
        >
          기본 이미지로
        </button>
      )}
    </div>
  );
}
