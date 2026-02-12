import { postFeature, postInteraction } from "@/api/picareService";
import { GlobalContext } from "@/contexts/GlobalContext";
import { useCallback, useContext, useEffect, useRef } from "react";
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
      if (duration > 10) {
        // 10초 이상 체류 부터 저장
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
const MIN_TOUCH_COUNT = 3;
export const useTouchAnalyze = () => {
  const { sId } = useContext(GlobalContext);
  const totalSessionCount = useRef(0);
  const currentSIdRef = useRef(sId);

  const flush = useCallback(async (targetSId, count) => {
    if (count <= 0 || count < MIN_TOUCH_COUNT) {
      return;
    }

    const payload = {
      hwId: "697b07b3251e185c8626a8ad",
      type: "touchAnalyze",
      content: `${count}`,
      sId: targetSId,
    };

    try {
      await postInteraction(payload);
    } catch (error) {
      console.error("[FAILED] touchAnalyze post:", error);
    }
  }, []);

  // 세션(sId) 변경 감지 및 전송 로직
  useEffect(() => {
    if (currentSIdRef.current !== sId) {
      const prevSId = currentSIdRef.current;
      const prevCount = totalSessionCount.current;

      if (prevCount >= MIN_TOUCH_COUNT) {
        flush(prevSId, prevCount);
        totalSessionCount.current = 0;
      }
      currentSIdRef.current = sId;
    }
  }, [sId, flush]);

  useEffect(() => {
    const handleTouch = () => {
      totalSessionCount.current++;
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        flush(currentSIdRef.current, totalSessionCount.current);
        totalSessionCount.current = 0;
      }
    };

    window.addEventListener("touchstart", handleTouch, { passive: true });
    window.addEventListener("mousedown", handleTouch);
    window.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("touchstart", handleTouch);
      window.removeEventListener("mousedown", handleTouch);
      window.removeEventListener("visibilitychange", handleVisibility);

      flush(currentSIdRef.current, totalSessionCount.current);
    };
  }, [flush]);
};

// NOTE: 대화 축적 함수
export const useDialogAnalyze = () => {
  // 단순히 로그를 서버에 전송하는 함수
  const sendLogToServer = async (q, a) => {
    try {
      if (!a) return;

      const isAuto = !q || q.trim() === "";
      const type = isAuto ? "autoDialogAnalyze" : "dialogAnalyze";
      const payload = {
        hwId: "697b07b3251e185c8626a8ad",
        type,
        // 질문만 저장
        content: JSON.stringify([q]),
      };

      await postInteraction(payload);
    } catch (error) {
      console.log("[FAILED] useDialogAnalyze MSG: ", error);
    }
  };

  return { sendLogToServer };
};
