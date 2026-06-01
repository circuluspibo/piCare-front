import { useLog } from "@/contexts/LogContext";
import { useEffect, useRef, useCallback } from "react";
import { postFeature, postClientLog } from "@/api/picareService";

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

export const useTracker = (overridePathname) => {
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
    const isExercise = ['flag', 'head', 'grab'].includes(data.currentPage);

    const accuracy = total > 0 ? (success / total) * 100 : 0;
    let performance = "하";
    if (accuracy >= 80) performance = "상";
    else if (accuracy >= 50) performance = "중";

    let engagement;
    if (isExercise) {
      // 제스처 기반: 터치 없음 → 시도 횟수와 이탈로 판단
      if (data.exitCount >= 2 || total === 0) engagement = "하";
      else if (data.exitCount >= 1 || !data.isCompleted) engagement = "중";
      else engagement = "상";
    } else {
      if (data.exitCount >= 2 || data.idleCount >= 5) engagement = "하";
      else if (data.exitCount >= 1 || data.idleCount >= 1 || !data.isCompleted) engagement = "중";
      else engagement = "상";
    }

    let satisfaction;
    if (isExercise) {
      // 운동: 완료 여부 + 정확도로 판단
      if (!data.isCompleted) satisfaction = "하";
      else if (accuracy < 40) satisfaction = "중";
      else satisfaction = "상";
    } else {
      if (!data.isCompleted) satisfaction = "하";
      else if (data.speechLog.length < 2) satisfaction = "중";
      else satisfaction = "상";
    }

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
    const source = overridePathname ?? window.location.pathname;
    const pageId = source.split("/").pop() || "main";

    const isReturning =
      currentTrackerRef.current &&
      currentTrackerRef.current.currentPage === pageId &&
      !currentTrackerRef.current.isCompleted;

    if (isReturning) {
      currentTrackerRef.current.exitCount =
        (currentTrackerRef.current.exitCount || 0) + 1;
      postClientLog(`tracker returning: ${pageId} (exitCount=${currentTrackerRef.current.exitCount})`);
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
      postClientLog(`tracker init: ${pageId}${featureId ? ` → feature start: ${featureId}` : " (no featureId)"}`);
      if (featureId) postFeature({ featureId, command: "start" });
    }

    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      const tracker = currentTrackerRef.current;
      if (tracker && !tracker.isCompleted) {
        const duration = Math.round((Date.now() - tracker.startTime) / 1000);
        const featureId = FEATURE_ID_MAP[tracker.currentPage];
        postClientLog(`tracker cleanup: ${tracker.currentPage} duration=${duration}s${featureId ? ` → feature exit: ${featureId}` : ""}`);
        if (featureId) postFeature({ featureId, command: "exit", duration });
        const hasProgress = tracker.scores?.total > 0;
        if (hasProgress || duration >= MIN_SESSION_SECONDS) saveLogToDB(getFinalReport());
        tracker.isCompleted = true;
      }
    };
  }, [resetIdleTimer, overridePathname]); // eslint-disable-line react-hooks/exhaustive-deps

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
    restart: () => {
      const tracker = currentTrackerRef.current;
      const pageId = tracker?.currentPage;
      if (tracker && !tracker.isCompleted) {
        const duration = Math.round((Date.now() - tracker.startTime) / 1000);
        const featureId = FEATURE_ID_MAP[pageId];
        postClientLog(`tracker restart: ${pageId} duration=${duration}s → exit + new start`);
        if (featureId) postFeature({ featureId, command: "exit", duration });
        const hasProgress = tracker.scores?.total > 0;
        if (hasProgress || duration >= MIN_SESSION_SECONDS) saveLogToDB(getFinalReport());
        tracker.isCompleted = true;
      }
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
      resetIdleTimer();
    },
  };

  return actions;
};
