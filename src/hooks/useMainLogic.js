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

  const videoRef = useRef(null);
  const activeLocks = useRef(new Set()); // 엔진 점유자 관리 (HB_POLLING, VIDEO_UI, AI_AUTO)
  const isEngineRunning = useRef(false);

  // --- 엔진 제어 핵심 함수 ---
  const startEngine = useCallback(async (lockId) => {
    activeLocks.current.add(lockId);
    if (isEngineRunning.current) return true;

    try {
      await getStartCollection();
      isEngineRunning.current = true;
      console.log(`[Engine] START by ${lockId}`);
      return true;
    } catch (e) {
      activeLocks.current.delete(lockId);
      return false;
    }
  }, []);

  const stopEngine = useCallback(async (lockId) => {
    activeLocks.current.delete(lockId);
    // 비디오 피드가 켜져 있거나 다른 점유자가 있다면 멈추지 않음
    if (activeLocks.current.size === 0 && isEngineRunning.current) {
      try {
        await getStopCollection();
        isEngineRunning.current = false;
        console.log(`[Engine] STOP by ${lockId}`);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // --- 1. 하트비트 시퀀스 (90초) ---
  useEffect(() => {
    const fetchHB = async () => {
      // 비디오 피드가 켜져 있으면 하트비트 폴링은 별도로 시작/종료를 하지 않고 데이터만 챙김
      const isInternalLock = !activeLocks.current.has("VIDEO_UI");

      if (isInternalLock) await startEngine("HB_POLLING");

      try {
        // 엔진 시작 후 데이터 안정화를 위해 약간 대기
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
        if (isInternalLock) await stopEngine("HB_POLLING");
      }
    };

    const timer = setInterval(fetchHB, HB_INTERVAL);
    fetchHB(); // 최초 실행

    return () => clearInterval(timer);
  }, [startEngine, stopEngine, updateHumanInfo, compareAndLog]);

  // --- 2. 비디오 피드 제어 ---
  const toggleVideoFeed = useCallback(async () => {
    if (!showVideoFeed) {
      const ok = await startEngine("VIDEO_UI");
      if (ok) setShowVideoFeed(true);
    } else {
      setShowVideoFeed(false);
      await stopEngine("VIDEO_UI");
    }
  }, [showVideoFeed, startEngine, stopEngine]);

  // --- 3. AI 자동 캡처 프로세스 (120초) ---
  const runAutoCapture = useCallback(async () => {
    if (isProcessing || !isAutoMode) return;

    setIsProcessing(true);
    // AI 캡처를 위해 잠시 엔진 점유
    const ok = await startEngine("AI_AUTO");

    try {
      if (ok && videoRef.current) {
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

        // 응답 처리 로직 (기존과 동일)
        const rawText =
          typeof response === "string" ? response : JSON.stringify(response);
        const match = rawText.match(/\{[\s\S]*\}/);
        const result = match
          ? JSON.parse(match[0].replace(/'/g, '"')).result
          : rawText;
        if (result) await sendMessage("", result);
      }
    } finally {
      await stopEngine("AI_AUTO");
      setIsProcessing(false);
    }
  }, [
    isAutoMode,
    isProcessing,
    personaId,
    sendMessage,
    startEngine,
    stopEngine,
  ]);

  useEffect(() => {
    let timer;
    if (isAutoMode) {
      timer = setInterval(runAutoCapture, AI_INTERVAL);
    }
    return () => clearInterval(timer);
  }, [isAutoMode, runAutoCapture]);

  // AI 모드 카메라 스트림 관리
  useEffect(() => {
    if (isAutoMode || showVideoFeed) {
      navigator.mediaDevices.getUserMedia({ video: true }).then((s) => {
        if (videoRef.current) videoRef.current.srcObject = s;
      });
    } else {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    }
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
