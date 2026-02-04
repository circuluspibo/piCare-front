import { useState, useEffect, useCallback, useRef } from "react";

import {
  getHeartbeat,
  getStartCollection,
  getStopCollection,
} from "@/api/npuService";

import { postImg2Chat } from "@/api/gpuService";

import { PERSONA_SYSTEMS } from "@/utils/PersonaSystem";

const AI_INTERVAL = 1000 * 120;

const HB_INTERVAL = 1000 * 90;

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

  const activeLocks = useRef(new Set());

  const isEngineRunning = useRef(false);

  const isTransitioning = useRef(false);

  // [엔진 제어 통합 함수] - 기존 로직 유지

  const controlEngine = useCallback(async (lockId, action) => {
    if (action === "START") {
      activeLocks.current.add(lockId);

      if (isEngineRunning.current || isTransitioning.current) return true;

      isTransitioning.current = true;

      try {
        await getStartCollection();

        isEngineRunning.current = true;

        console.log(`[Engine] >>> START by ${lockId}`);

        return true;
      } catch (e) {
        return false;
      } finally {
        isTransitioning.current = false;
      }
    } else {
      activeLocks.current.delete(lockId);

      if (
        activeLocks.current.size === 0 &&
        isEngineRunning.current &&
        !isTransitioning.current
      ) {
        isTransitioning.current = true;

        try {
          await getStopCollection();

          isEngineRunning.current = false;

          console.log(`[Engine] <<< STOP by ${lockId}`);
        } finally {
          isTransitioning.current = false;
        }
      }
    }
  }, []);

  // 1. 하트비트 (기존 루프 방지 로직 유지)

  useEffect(() => {
    const fetchHB = async () => {
      const isFirstLock = activeLocks.current.size === 0;

      if (isFirstLock) {
        await controlEngine("HB", "START");

        await new Promise((r) => setTimeout(r, 1500));
      } else {
        activeLocks.current.add("HB");
      }

      try {
        const { data } = await getHeartbeat();

        setHumidity(parseFloat(data.env.humidity || 0).toFixed(1));

        setTemperature(parseFloat(data.env.temp || 0).toFixed(1));

        setAir(data.env.air);

        updateHumanInfo(data.human);

        compareAndLog(data);
      } finally {
        await controlEngine("HB", "STOP");
      }
    };

    const timer = setInterval(fetchHB, HB_INTERVAL);

    fetchHB();

    return () => clearInterval(timer);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. 비디오 제어

  const toggleVideoFeed = useCallback(async () => {
    const nextState = !showVideoFeed;

    if (nextState) {
      const ok = await controlEngine("VIDEO", "START");

      if (ok) setShowVideoFeed(true);
    } else {
      setShowVideoFeed(false);

      await controlEngine("VIDEO", "STOP");
    }
  }, [showVideoFeed, controlEngine]);

  // 3. AI 자동 캡처 로직 (isProcessing 의존성 추가하여 중복 방지)

  const processingRef = useRef(false);

  const runAutoCapture = useCallback(async () => {
    // ref와 state 모두 체크하여 중복 진입 차단
    if (processingRef.current || isProcessing) return;

    processingRef.current = true;
    setIsProcessing(true);

    await controlEngine("AI", "START");

    try {
      if (videoRef.current) {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 240;
        canvas.getContext("2d").drawImage(videoRef.current, 0, 0, 320, 240);

        const blob = await new Promise((res) =>
          canvas.toBlob(res, "image/jpeg", 0.5),
        );
        const response = await postImg2Chat(
          new File([blob], "ai.jpg"),
          PERSONA_SYSTEMS[personaId],
        );

        // 응답 파싱 로직 (기존 유지)
        const rawText =
          typeof response === "string" ? response : JSON.stringify(response);
        const match = rawText.match(/\{[\s\S]*\}/);
        const result = match
          ? JSON.parse(match[0].replace(/'/g, '"')).result
          : rawText;

        if (result) await sendMessage("", result);
      }
    } catch (e) {
      console.error("AI Error:", e);
    } finally {
      await controlEngine("AI", "STOP");
      // 종료 시점에만 상태 해제
      setIsProcessing(false);
      processingRef.current = false;
    }
  }, [personaId, sendMessage, controlEngine]);

  // [수정 포인트 2] 의존성 루프를 끊은 타이머 로직
  useEffect(() => {
    let timerId = null;

    const scheduleNext = () => {
      if (!isAutoMode) return;

      // 재귀적으로 호출하여 "종료 후 120초"를 보장함
      timerId = setTimeout(async () => {
        await runAutoCapture();
        scheduleNext(); // 처리가 끝나면 다음 실행 예약
      }, AI_INTERVAL);
    };

    if (isAutoMode) {
      runAutoCapture(); // 처음 켰을 때 즉시 실행
      scheduleNext(); // 루프 시작
    }

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [isAutoMode, runAutoCapture]);

  // 카메라 스트림 유지

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
