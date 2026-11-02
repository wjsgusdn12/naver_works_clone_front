"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { UserProfileModal } from "@/components/chat/user-profile-modal";
import { Toast } from "@/components/common/toast";
import { useToast } from "@/hooks/use-toast";
import { addressBookApi, type AddressBookMemberDetail } from "@/lib/api/address-book-api";
import { chatApi } from "@/lib/api/chat-api";
import { useLeaveNavigation } from "@/components/common/leave-guard";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type ProfileModalContextValue = { openProfile: (membershipId: number) => void };

const ProfileModalContext = createContext<ProfileModalContextValue | null>(null);

// 어느 화면에서든 아바타를 누르면 같은 프로필 모달을 띄움(상세 정보·즐겨찾기·메시지 보내기).
// 공통 아바타가 구성원 ID를 알면 따로 연결하지 않아도 여기로 열림.
export function ProfileModalProvider({ children }: { children: ReactNode }) {
  const { accessToken, member } = useAuth();
  // 화면 이동은 나가기 확인(작성 중인 글)을 거침
  const router = useLeaveNavigation();
  const { toast, showToast, dismissToast } = useToast();
  const [targetId, setTargetId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AddressBookMemberDetail | null>(null);

  useEffect(() => {
    if (!accessToken || targetId === null) return;
    let cancelled = false;
    addressBookApi
      .memberDetail(accessToken, targetId)
      .then((result) => {
        if (!cancelled) setDetail(result);
      })
      .catch((error: Error) => {
        if (cancelled) return;
        showToast(error.message || "프로필을 불러오지 못했습니다.");
        setTargetId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, targetId, showToast]);

  const close = useCallback(() => {
    setTargetId(null);
    setDetail(null);
  }, []);
  const openProfile = useCallback((membershipId: number) => {
    setDetail(null);
    setTargetId(membershipId);
  }, []);

  const shown = detail && detail.membershipId === targetId ? detail : null;
  return (
    <ProfileModalContext.Provider value={{ openProfile }}>
      {children}
      {shown && accessToken && (
        <UserProfileModal
          member={shown}
          onClose={close}
          onToggleFavorite={async () => {
            const next = !shown.favorite;
            try {
              if (next) await addressBookApi.createFavorite(accessToken, shown.membershipId);
              else await addressBookApi.deleteFavorite(accessToken, shown.membershipId);
              setDetail({ ...shown, favorite: next });
              showToast(next ? "즐겨찾기에 추가했습니다." : "즐겨찾기에서 해제했습니다.");
            } catch (error) {
              showToast(error instanceof Error ? error.message : "즐겨찾기를 바꾸지 못했습니다.");
            }
          }}
          onMessage={async () => {
            try {
              const room =
                shown.membershipId === member?.membershipId
                  ? await chatApi.createSelf(accessToken)
                  : await chatApi.createDirect(accessToken, shown.membershipId);
              close();
              router.push(`/message?roomId=${room.id}`);
            } catch (error) {
              showToast(error instanceof Error ? error.message : "메시지방을 열지 못했습니다.");
            }
          }}
          showToast={showToast}
        />
      )}
      {toast && (
        <Toast key={toast.id} message={toast.message} phase={toast.phase} onClose={dismissToast} />
      )}
    </ProfileModalContext.Provider>
  );
}

// 프로필 모달 열기. 공급자 밖이면 null(아바타가 눌리지 않음).
export function useProfileModal() {
  return useContext(ProfileModalContext);
}
