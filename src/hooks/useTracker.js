import { useLog } from "@/contexts/LogContext";
import { useEffect, useRef, useCallback } from "react";
import { postFeature } from "@/api/picareService";

const FEATURE_ID_MAP = {
  flag: "exercise_flag",
  head: "exercise_head",
  grab: "exercise_grab",
  color: "training_color",
  number: "training_number",
  piano: "training_piano",
  draw: "ai_draw",
  mirror: "ai_mirror",
  voice: "ai_voice",
};

const MIN_SESSION_SECONDS = 30;

export const useTracker = () => {
  const { currentTrackerRef, saveLogToDB } = useLog();
  const idleTimerRef = useRef(null);
  const resetIdleTimerRef = useRef(null);

  // 무반응 타이머 설정
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (currentTrackerRef.current) {
        currentTrackerRef.current.idleCount += 1;
        resetIdleTimerRef.current?.();
      }
    }, 30000);
  }, [currentTrackerRef]);

  useEffect(() => {
    resetIdleTimerRef.current = resetIdleTimer;
  }, [resetIdleTimer]);

  const getFinalReport = useCallback(() => {
    const data = currentTrackerRef.current;
    const { total, success } = data.scores;

    const accuracy = total > 0 ? (success / total) * 100 : 0;
    let performance = "하";
    if (accuracy >= 80) performance = "상";
    else if (accuracy >= 50) performance = "중";

    let engagement = "상";
    if (data.exitCount >= 2 || data.idleCount >= 5) {
      engagement = "하";
    } else if (
      data.exitCount >= 1 ||
      data.idleCount >= 1 ||
      !data.isCompleted
    ) {
      engagement = "중";
    }

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
  }, [currentTrackerRef]);

  // 페이지 진입 시 데이터 초기화 또는 복구
  useEffect(() => {
    const pageId = window.location.pathname.split("/").pop() || "main";

    const isReturning =
      currentTrackerRef.current &&
      currentTrackerRef.current.currentPage === pageId &&
      !currentTrackerRef.current.isCompleted;

    if (isReturning) {
      currentTrackerRef.current.exitCount =
        (currentTrackerRef.current.exitCount || 0) + 1;
    } else {
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
      const featureId = FEATURE_ID_MAP[pageId];
      if (featureId) postFeature({ featureId, command: "start" });
    }

    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      const tracker = currentTrackerRef.current;
      if (tracker && !tracker.isCompleted) {
        const duration = Math.round((Date.now() - tracker.startTime) / 1000);
        const featureId = FEATURE_ID_MAP[tracker.currentPage];
        if (featureId) postFeature({ featureId, command: "complete", duration });
        if (duration >= MIN_SESSION_SECONDS) saveLogToDB(getFinalReport());
        tracker.isCompleted = true;
      }
    };
  }, [resetIdleTimer]); // eslint-disable-line react-hooks/exhaustive-deps

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
    getFinalReport,
    save: async () => {
      if (currentTrackerRef.current) {
        const startTime = currentTrackerRef.current.startTime;
        currentTrackerRef.current.isCompleted = true;
        const report = getFinalReport();
        await saveLogToDB(report);
        const featureId = FEATURE_ID_MAP[report.currentPage];
        if (featureId) {
          const duration = Math.round((report.endTime - startTime) / 1000);
          postFeature({ featureId, command: "complete", duration });
        }
      }
    },
  };

  return actions;
};
