import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ChatNotificationProvider } from "@/components/chat/chat-notification-provider";
import { LeaveGuardProvider } from "@/components/common/leave-guard";
import { ProfileImageProvider } from "@/components/common/profile-image-provider";
import { ProfileModalProvider } from "@/components/common/profile-modal-provider";
import { RouteStateBoundary } from "@/components/common/route-state-boundary";
import { Geist } from "next/font/google";
import "./globals.css";

// 기본 영문 폰트 변수를 만들고, 실제 화면 글꼴은 globals.css의 Pretendard가 우선 적용됨.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// 브라우저 탭과 검색 엔진에 제공할 기본 페이지 정보.
export const metadata: Metadata = {
  title: "Naver Works Clone",
  description: "Naver Works Clone frontend",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // 모든 페이지가 공통으로 사용하는 HTML 언어·높이·글꼴 설정.
    <html lang="ko" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/* 모든 화면이 동일한 메모리 인증 상태를 공유. */}
        <AuthProvider>
          {/* 작성 중인 화면을 나갈 때 확인 창. 알림 카드·프로필 모달의 이동도 거치므로 가장 바깥 */}
          <LeaveGuardProvider>
            {/* 프로필 사진 목록. 메시지 알림 카드의 아바타도 쓰므로 알림 공급자보다 바깥 */}
            <ProfileImageProvider>
              <ChatNotificationProvider>
                {/* 어느 화면에서든 아바타를 누르면 같은 프로필 모달 */}
                <ProfileModalProvider>
                  <RouteStateBoundary>{children}</RouteStateBoundary>
                </ProfileModalProvider>
              </ChatNotificationProvider>
            </ProfileImageProvider>
          </LeaveGuardProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
