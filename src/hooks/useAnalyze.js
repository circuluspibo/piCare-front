import { postFeature, postInteraction } from "@/api/picareService";
import { GlobalContext } from "@/contexts/GlobalContext";
import { useContext, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

// NOTE: 페이지 체류시간 감지
export const usePageAnalyze = () => {
  const location = useLocation();
  const startTimeRef = useRef();

  useEffect(() => {
    const path = location.pathname;
    startTimeRef.current = Date.now();

    return async () => {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (duration > 1) {
        const payload = {
          hwId: "697b07b3251e185c8626a8ad",
          featureId: "pageAnalyze",
          command: path,
          duration,
        };
        await postFeature(payload);
      }
    };
  }, [location.pathname]);
};

// NOTE: 터치 횟수 감지
export const useTouchAnalyze = () => {
  const { sId } = useContext(GlobalContext);
  const totalSessionCount = useRef(0);
  // 현재 sId를 항상 최신으로 유지하는 ref
  const sIdRef = useRef(sId);

  // sId가 업데이트될 때마다 ref도 업데이트
  useEffect(() => {
    sIdRef.current = sId;
  }, [sId]);

  const flush = async () => {
    const count = totalSessionCount.current;
    if (count > 0) {
      const payload = {
        hwId: "697b07b3251e185c8626a8ad",
        type: "touchAnalyze",
        content: `${count}`,
      };

      try {
        // 전송 시점에 sIdRef.current를 쓰면 클로저 문제 해결
        await postInteraction(payload);
        totalSessionCount.current = 0;
      } catch (error) {
        console.error("[FAILED] useTouchAnalyze MSG: ", error);
      }
    }
  };

  useEffect(() => {
    const handleTouch = () => {
      totalSessionCount.current++;
      console.log("터치 카운트 증가:", totalSessionCount.current); // 카운트 올라가는지 확인용
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("touchstart", handleTouch, { passive: true });
    window.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("touchstart", handleTouch);
      window.removeEventListener("visibilitychange", handleVisibility);
      // 정리(Cleanup) 시점의 sId를 명확히 전달
      flush();
    };
  }, [sId]); // sId 변경 시 cleanup -> flush 실행됨
};

// NOTE: 대화 축적 함수
export const useDialogAnalyze = () => {
  const key = "chat_logs";

  // 대화 전송 로직
  const flushChat = async () => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "[]");
      if (saved.length > 0) {
        // 현재까지 쌓인 모든 대화를 한 번에 전송
        const payload = {
          hwId: "697b07b3251e185c8626a8ad",
          type: "dialogAnalyze",
          content: JSON.stringify(saved),
        };
        await postInteraction(payload);
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.log("[FAILED] useDialogAnalyze MSG: ", error);
    }
  };

  // 2. 페이지 이탈 감지
  useEffect(() => {
    return () => flushChat();
  }, []);

  // 3. 대화 축적
  const accumulateLog = (q, a) => {
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    saved.push({ q, a, t: Date.now() });

    localStorage.setItem(key, JSON.stringify(saved));
  };

  return { accumulateLog };
};
