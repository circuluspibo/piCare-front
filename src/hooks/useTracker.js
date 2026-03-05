import { useLog } from "@/contexts/LogContext";
import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";

export const useTracker = () => {
  const { currentTrackerRef, saveLogToDB } = useLog();
  const idleTimerRef = useRef(null);

  // 무반응 타이머 설정
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (currentTrackerRef.current) {
        currentTrackerRef.current.idleCount += 1;
        resetIdleTimer();
      }
    }, 30000);
  }, [currentTrackerRef]);

  // 페이지 진입 시 데이터 초기화 또는 복구
  useEffect(() => {
    const location = window.location.pathname;
    const pageId = location.split("/").pop() || "main";

    // [변경] 기존에 같은 페이지를 하던 기록이 '미완료' 상태로 전역 Ref에 남아있는지 확인
    const isReturning =
      currentTrackerRef.current &&
      currentTrackerRef.current.currentPage === pageId &&
      !currentTrackerRef.current.isCompleted;

    if (isReturning) {
      // 1. 재진입 시: 기존 데이터 유지 + 이탈 횟수(exitCount) 증가
      currentTrackerRef.current.exitCount =
        (currentTrackerRef.current.exitCount || 0) + 1;
      console.log(
        `[재진입] ${pageId} - 기존 기록을 유지합니다. (이탈 횟수: ${currentTrackerRef.current.exitCount})`,
      );
    } else {
      // 2. 처음 진입 또는 이미 완료된 경우: 새로 초기화
      currentTrackerRef.current = {
        currentPage: pageId,
        startTime: Date.now(),
        endTime: 0,
        idleCount: 0,
        exitCount: 0,
        touchCount: 0,
        scores: { total: 0, success: 0, time: 0 },
        speechLog: [],
        isCompleted: false,
      };
      console.log(`[새 세션] ${pageId} - 로그 추적을 시작합니다.`);
    }

    resetIdleTimer();

    // 페이지 이탈 시 타이머만 해제 (Ref 데이터는 Context에 보존됨)
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [location.pathname, resetIdleTimer]);

  const actions = {
    resetIdleTimer,
    recordTouch: () => {
      if (!currentTrackerRef.current) return;
      currentTrackerRef.current.touchCount += 1;
      resetIdleTimer();
    },
    recordScore: (total, success, time) => {
      if (!currentTrackerRef.current) return;
      currentTrackerRef.current.scores = { total, success, time };
    },
    recordSpeech: (text) => {
      if (!currentTrackerRef.current) return;
      currentTrackerRef.current.speechLog.push(text);
    },
    getFinalReport: () => {
      const data = currentTrackerRef.current;
      const { total, success } = data.scores;

      // 1. 수행도 (정답률 기준)
      const accuracy = total > 0 ? (success / total) * 100 : 0;
      let performance = "하";
      if (accuracy >= 80) performance = "상";
      else if (accuracy >= 50) performance = "중";

      // 2. 참여도 (무반응 횟수 및 이탈 횟수 기준)
      let engagement = "상";
      // 이탈이 2회 이상이거나 무반응이 5회 이상이면 '하'
      if (data.exitCount >= 2 || data.idleCount >= 5) {
        engagement = "하";
      }
      // 이탈이 1회 있거나 무반응이 1회라도 있으면 '중'
      else if (
        data.exitCount >= 1 ||
        data.idleCount >= 1 ||
        !data.isCompleted
      ) {
        engagement = "중";
      }

      // 3. 만족도
      let satisfaction = "상";
      if (!data.isCompleted) satisfaction = "하";
      else if (data.speechLog.length < 2) satisfaction = "중";

      return {
        ...data,
        endTime: Date.now(),
        performance,
        engagement,
        satisfaction,
      };
    },
    save: async () => {
      if (currentTrackerRef.current) {
        currentTrackerRef.current.isCompleted = true;
        const report = actions.getFinalReport();
        await saveLogToDB(report);
        // 저장 완료 후, 다음 진입 시 새로 시작하도록 초기화할 수도 있습니다.
        // currentTrackerRef.current = null;
      }
    },
  };

  return actions;
};
