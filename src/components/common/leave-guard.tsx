"use client";

import { MessageDialogShell } from "@/components/chat/message-change-dialog";
import { TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
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

// 작성 중인 화면(게시글 글쓰기 등)을 나가려 할 때 확인 창을 띄우는 공통 장치.
// - 앱 안 이동: push/back/confirmLeave 를 거친 이동만 막음(상단바·사이드바·알림 등은 이것을 씀)
// - 브라우저 뒤로가기: 같은 주소 기록을 하나 더 쌓아 두고(보초), 뒤로 가면 그 보초가 빠질 때 확인
// - 새로고침·탭 닫기: 브라우저 기본 확인 창(문구는 브라우저가 정함)
type LeaveGuard = {
  // 작성 중이면 확인 후, 아니면 바로 실행
  confirmLeave: (action: () => void) => void;
  push: (href: string) => void;
  back: () => void;
  // 작성 중 여부 등록(useLeaveGuard 가 씀)
  setActive: (active: boolean) => void;
};

const LeaveGuardContext = createContext<LeaveGuard | null>(null);

export function LeaveGuardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [active, setActiveState] = useState(false);
  const activeRef = useRef(false);
  // 브라우저 뒤로가기를 잡으려고 쌓아 둔 같은 주소 기록이 남아 있는지
  const sentinelRef = useRef(false);
  const [pending, setPending] = useState<(() => void) | null>(null);
  // 확인 창이 브라우저 뒤로가기 때문에 떴는지(취소하면 보초를 다시 쌓음)
  const fromPopRef = useRef(false);

  const setActive = useCallback((next: boolean) => {
    activeRef.current = next;
    setActiveState(next);
  }, []);

  const confirmLeave = useCallback((action: () => void) => {
    if (!activeRef.current) return action();
    fromPopRef.current = false;
    setPending(() => action);
  }, []);

  // 보초 기록이 있으면 그 자리를 새 주소로 바꿔 끼워 뒤로가기 기록이 겹치지 않게 함
  const push = useCallback(
    (href: string) =>
      confirmLeave(() => {
        if (sentinelRef.current) {
          sentinelRef.current = false;
          router.replace(href);
        } else router.push(href);
      }),
    [confirmLeave, router],
  );

  const back = useCallback(
    () =>
      confirmLeave(() => {
        if (sentinelRef.current) {
          sentinelRef.current = false;
          window.history.go(-2);
        } else router.back();
      }),
    [confirmLeave, router],
  );

  // 작성 중일 때만: 새로고침·탭 닫기 확인, 뒤로가기 보초
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    if (!sentinelRef.current) {
      window.history.pushState(window.history.state, "", window.location.href);
      sentinelRef.current = true;
    }
    const onPopState = () => {
      if (!sentinelRef.current || !activeRef.current) return;
      // 보초가 빠지고 원래 글쓰기 기록으로 돌아온 상태(화면은 그대로)
      sentinelRef.current = false;
      fromPopRef.current = true;
      setPending(() => () => window.history.back());
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
      // 작성이 끝나면(저장 뒤 주소 교체 등) 보초는 이미 다른 기록으로 바뀌었다고 봄
      sentinelRef.current = false;
    };
  }, [active]);

  const stay = () => {
    // 뒤로가기로 뜬 창을 취소하면 다음 뒤로가기도 잡히게 보초를 다시 쌓음
    if (fromPopRef.current && activeRef.current) {
      window.history.pushState(window.history.state, "", window.location.href);
      sentinelRef.current = true;
    }
    fromPopRef.current = false;
    setPending(null);
  };

  const leave = () => {
    const action = pending;
    activeRef.current = false;
    fromPopRef.current = false;
    setPending(null);
    action?.();
  };

  const value = useMemo(
    () => ({ confirmLeave, push, back, setActive }),
    [back, confirmLeave, push, setActive],
  );

  return (
    <LeaveGuardContext.Provider value={value}>
      {children}
      {pending && (
        <MessageDialogShell title="페이지 나가기" onClose={stay} widthClassName="max-w-md">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500">
              <TriangleAlert size={22} />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-base font-semibold text-slate-800">
                작성 중인 게시글이 있습니다. 나갈까요?
              </p>
              <p className="mt-1.5 text-sm leading-6 text-slate-500">
                나가면 저장하지 않은 내용은 사라집니다. 남겨 두려면 임시저장해 주세요.
              </p>
            </div>
          </div>
          <div className="mt-7 flex justify-end gap-2">
            <button
              data-dialog-initial-focus
              type="button"
              onClick={stay}
              className="cursor-pointer rounded-md border border-slate-200 px-5 py-2.5 text-sm font-medium transition hover:bg-slate-50 active:scale-95"
            >
              계속 작성
            </button>
            <button
              type="button"
              onClick={leave}
              className="cursor-pointer rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-95"
            >
              나가기
            </button>
          </div>
        </MessageDialogShell>
      )}
    </LeaveGuardContext.Provider>
  );
}

// 화면 이동은 이것으로: 작성 중인 화면이 있으면 확인 후 이동
export function useLeaveNavigation() {
  const context = useContext(LeaveGuardContext);
  if (!context) throw new Error("LeaveGuardProvider 안에서만 쓸 수 있습니다.");
  return context;
}

// 작성 중(active)인 동안 나가기 확인을 켬. 화면이 닫히면 자동으로 끔.
export function useLeaveGuard(active: boolean) {
  const { setActive } = useLeaveNavigation();
  useEffect(() => {
    setActive(active);
    return () => setActive(false);
  }, [active, setActive]);
}
