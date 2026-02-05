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

  const processingRef = useRef(false);

  const loopActiveRef = useRef(false);
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


  // 3. AI 자동 캡처 (요구하신 대로 엔진 제어 없이 독립 실행)
const runAutoCapture = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);

    try {
      const video = videoRef.current;
      
      // [수정 포인트] 비디오가 준비될 때까지 최대 3초간 대기 (0.5초 간격 체크)
      let retryCount = 0;
      while ((!video || video.readyState < 2) && retryCount < 6) {
        console.log("비디오 스트림 대기 중...");
        await new Promise(res => setTimeout(res, 500));
        retryCount++;
      }

      if (!video || video.paused || video.ended || video.readyState < 2) {
        console.warn("비디오가 여전히 준비되지 않았습니다.");
        return; // 다음 루프(120초 후)를 기약
      }

      // 캡처 로직 진행
      const canvas = document.createElement("canvas");
      canvas.width = 320; 
      canvas.height = 240;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, 320, 240);
      
      const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg"));
      
      // (기존 코드와 동일)
      const response = await postImg2Chat(new File([blob], "ai.jpg"), PERSONA_SYSTEMS[personaId]);
      const rawText = typeof response === "string" ? response : JSON.stringify(response);
      const match = rawText.match(/\{[\s\S]*\}/);
      const result = match ? JSON.parse(match[0].replace(/'/g, '"')).result : rawText;

      if (result) {
        await sendMessage("", result);
      }
      
    } catch (e) {
      console.error("AI Error:", e);
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  }, [personaId, sendMessage]);

  // 4. [수정] 무한 재호출을 방지하는 독립 루프
  useEffect(() => {
    let timerId = null;

    const startAiLoop = async () => {
      // 이미 루프가 돌고 있다면 중복 실행 방지
      if (loopActiveRef.current || !isAutoMode) return;
      loopActiveRef.current = true;

      while (isAutoMode && loopActiveRef.current) {
        // 1. 작업을 수행 (sendMessage 끝날 때까지 여기서 await)
        await runAutoCapture();

        // 2. sendMessage가 끝난 "직후"부터 정확히 120초를 대기
        console.log("대기 시작: 120초 동안 멈춤");
        await new Promise(resolve => {
          timerId = setTimeout(resolve, AI_INTERVAL);
        });
        
        // 3. 120초가 지나면 while문 처음으로 돌아가서 다시 runAutoCapture 호출
        if (!isAutoMode) break;
      }
      
      loopActiveRef.current = false;
    };

    if (isAutoMode) {
      startAiLoop();
    }

    return () => {
      loopActiveRef.current = false;
      if (timerId) clearTimeout(timerId);
    };
    // 의존성 배열에 runAutoCapture를 빼거나, 최소화하여 재실행을 막습니다.
  }, [isAutoMode]);

useEffect(() => {
  if (isAutoMode || showVideoFeed) {
    navigator.mediaDevices.getUserMedia({ video: true }).then((s) => {
      const video = videoRef.current;
      if (video) {
        video.srcObject = s;
        // [추가] 메타데이터가 로드되면 재생을 시작하도록 보장
        video.onloadedmetadata = () => {
          video.play().catch(e => console.error("Video play failed:", e));
        };
      }
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
