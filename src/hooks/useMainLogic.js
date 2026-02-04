import { useState, useEffect, useCallback, useRef } from "react";
import {
  getHeartbeat,
  getStartCollection,
  getStopCollection,
} from "@/api/npuService";
import { postImg2Chat } from "@/api/gpuService";
import { PERSONA_SYSTEMS } from "@/utils/PersonaSystem";

const AI_INTERVAL = 1000 * 120; // 120초
const HB_INTERVAL = 1000 * 90; // 90초

export function useMainLogic({
  personaId,
  updateHumanInfo,
  compareAndLog,
  sendMessage,
}) {
  const [humidity, setHumidity] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [air, setAir] = useState("");
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [showVideoFeed, setShowVideoFeed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 엔진 점유를 관리할 State (이 값이 변할 때만 실제 엔진 명령 실행)
  const [activeLocks, setActiveLocks] = useState(new Set());
  const isEngineRunning = useRef(false);
  const videoRef = useRef(null);

  // --- 1. 엔진 실제 제어 전담 useEffect ---
  useEffect(() => {
    const manageEngine = async () => {
      const needsEngine = activeLocks.size > 0;

      if (needsEngine && !isEngineRunning.current) {
        try {
          await getStartCollection();
          isEngineRunning.current = true;
          console.log(
            `[Engine] START (Locks: ${Array.from(activeLocks).join(", ")})`,
          );
        } catch (e) {
          console.error("Engine Start Fail", e);
        }
      } else if (!needsEngine && isEngineRunning.current) {
        try {
          await getStopCollection();
          isEngineRunning.current = false;
          console.log("[Engine] STOP (No Locks)");
        } catch (e) {
          console.error("Engine Stop Fail", e);
        }
      }
    };

    manageEngine();
  }, [activeLocks]); // 오직 점유자 목록이 변할 때만 작동

  // --- 2. 점유자 추가/제거 함수 ---
  const addLock = useCallback((id) => {
    setActiveLocks((prev) => new Set(prev).add(id));
  }, []);

  const removeLock = useCallback((id) => {
    setActiveLocks((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // --- 3. 하트비트 폴링 로직 ---
  useEffect(() => {
    const fetchHB = async () => {
      // 이미 비디오 등으로 엔진이 돌아가고 있으면 굳이 추가 락을 걸지 않음
      const needsInternalLock =
        !activeLocks.has("VIDEO_UI") && !activeLocks.has("AI_AUTO");

      if (needsInternalLock) addLock("HB_POLLING");

      try {
        // 엔진 시작/안정화 대기
        await new Promise((r) => setTimeout(r, 2000));
        const { data } = await getHeartbeat();

        updateHumanInfo(data.human);
        setHumidity(parseFloat(data.env.humidity || 0).toFixed(1));
        setTemperature(parseFloat(data.env.temp || 0).toFixed(1));
        setAir(data.env.air);
        compareAndLog(data);
      } catch (e) {
        console.error("HB Error", e);
      } finally {
        if (needsInternalLock) removeLock("HB_POLLING");
      }
    };

    const timer = setInterval(fetchHB, HB_INTERVAL);
    fetchHB();

    return () => clearInterval(timer);
  }, [addLock, removeLock, updateHumanInfo, compareAndLog, activeLocks]);

  // --- 4. 비디오 UI 제어 ---
  const toggleVideoFeed = useCallback(() => {
    if (!showVideoFeed) {
      addLock("VIDEO_UI");
      setShowVideoFeed(true);
    } else {
      setShowVideoFeed(false);
      removeLock("VIDEO_UI");
    }
  }, [showVideoFeed, addLock, removeLock]);

  // --- 5. AI 자동 캡처 로직 ---
  const runAutoCapture = useCallback(async () => {
    if (isProcessing || !isAutoMode) return;

    setIsProcessing(true);
    addLock("AI_AUTO");

    try {
      await new Promise((r) => setTimeout(r, 1000)); // 캡처 전 대기
      if (videoRef.current) {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 240;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoRef.current, 0, 0, 320, 240);

        const blob = await new Promise((res) =>
          canvas.toBlob(res, "image/jpeg", 0.5),
        );
        const file = new File([blob], "ai.jpg", { type: "image/jpeg" });
        const response = await postImg2Chat(file, PERSONA_SYSTEMS[personaId]);

        // 응답 텍스트 처리
        const rawText =
          typeof response === "string" ? response : JSON.stringify(response);
        const match = rawText.match(/\{[\s\S]*\}/);
        const result = match
          ? JSON.parse(match[0].replace(/'/g, '"')).result
          : rawText;

        if (result) await sendMessage("", result);
      }
    } catch (e) {
      console.error("AI Auto Capture Error", e);
    } finally {
      removeLock("AI_AUTO");
      setIsProcessing(false);
    }
  }, [isAutoMode, isProcessing, personaId, sendMessage, addLock, removeLock]);

  useEffect(() => {
    let timer;
    if (isAutoMode) timer = setInterval(runAutoCapture, AI_INTERVAL);
    return () => clearInterval(timer);
  }, [isAutoMode, runAutoCapture]);

  // --- 6. 카메라 장치 스트림 제어 ---
  useEffect(() => {
    let stream = null;
    const startStream = async () => {
      if (isAutoMode || showVideoFeed) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
      }
    };

    startStream();

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
      }
    };
  }, [isAutoMode, showVideoFeed]);

  return {
    humidity,
    temperature,
    air,
    isAutoMode,
    setIsAutoMode,
    showVideoFeed,
    toggleVideoFeed,
    videoRef,
  };
}
