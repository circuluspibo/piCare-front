import { useState, useEffect, useCallback, useRef, useContext } from "react";

import {
  getHeartbeat,
  getStartCollection,
  getStopCollection,
} from "@/api/npuService";
import { postImg2Chat } from "@/api/gpuService";
import { PERSONA_SYSTEMS } from "@/utils/PersonaSystem";
import { GlobalContext } from "@/contexts/GlobalContext";

const AI_INTERVAL = 1000 * 120;
const HB_INTERVAL = 1000 * 90;

export function useMainLogic({
  personaId,
  updateHumanInfo,
  compareAndLog,
  sendMessage,
}) {
  const { isGpuLocked, setIsGpuLocked } = useContext(GlobalContext);

  const [humidity, setHumidity] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [air, setAir] = useState("");
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [showVideoFeed, setShowVideoFeed] = useState(false);
  const videoRef = useRef(null);
  const activeLocks = useRef(new Set());
  const isEngineRunning = useRef(false);
  const isTransitioning = useRef(false);
  const processingRef = useRef(false);
  const loopActiveRef = useRef(false);

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

  // NOTE: 하트비트 셋팅
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
  }, [updateHumanInfo, compareAndLog, controlEngine]);

  // 비디오 컨트롤러
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

  // AI 자동 캡처
  const runAutoCapture = useCallback(async () => {
    if (isGpuLocked || processingRef.current) {
      console.log("[Skip] GPU가 바빠서 자동 캡처를 건너뜁니다.");
      return;
    }

    if (processingRef.current) return;
    processingRef.current = true;
    setIsGpuLocked(true);

    try {
      const video = videoRef.current;

      // [수정 포인트] 비디오가 준비될 때까지 최대 3초간 대기 (0.5초 간격 체크)
      let retryCount = 0;
      while ((!video || video.readyState < 2) && retryCount < 6) {
        console.log("비디오 스트림 대기 중...");
        await new Promise((res) => setTimeout(res, 500));
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
      // Debug용
      // const link = document.createElement('a');
      // link.href = URL.createObjectURL(blob);
      // link.download = `test_${Date.now()}.jpg`;
      // link.click();용

      const response = await postImg2Chat(
        new File([blob], "ai.jpg"),
        PERSONA_SYSTEMS[personaId],
      );
      const rawText =
        typeof response === "string" ? response : JSON.stringify(response);
      const match = rawText.match(/\{[\s\S]*\}/);
      const result = match
        ? JSON.parse(match[0].replace(/'/g, '"')).result
        : rawText;

      if (result) {
        await sendMessage("", result, true);
      }
    } catch (e) {
      console.error("AI Error:", e);
    } finally {
      setIsGpuLocked(false);
      processingRef.current = false;
    }
  }, [personaId, sendMessage, setIsGpuLocked, isGpuLocked]);

  // NOTE: 비디오 제어
  useEffect(() => {
    if (isAutoMode || showVideoFeed) {
      navigator.mediaDevices.getUserMedia({ video: true }).then((s) => {
        const video = videoRef.current;
        if (video) {
          video.srcObject = s;
          video.onloadedmetadata = () => {
            video.play().catch((e) => console.error("Video play failed:", e));
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

  // NOTE: 무한 재호출을 방지하는 독립 루프
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
        await new Promise((resolve) => {
          timerId = setTimeout(resolve, AI_INTERVAL);
        });
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
  }, [isAutoMode, runAutoCapture]);

  // NOTE: Unmounted
  useEffect(() => {
    const currentLocks = activeLocks.current;
    const currentVideo = videoRef.current;

    return () => {
      console.log("[Cleanup] 자원을 해제합니다.");

      // 루프 중단 플래그
      loopActiveRef.current = false;

      // 엔진 점유 해제 및 정지
      if (currentLocks) currentLocks.clear();
      getStopCollection()
        .then(() => {
          isEngineRunning.current = false;
          console.log("[Cleanup] Engine STOP 성공");
        })
        .catch((e) => console.error("Engine STOP 실패", e));

      // 카메라 스트림 완전 종료
      if (currentVideo && currentVideo.srcObject) {
        const tracks = currentVideo.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
        currentVideo.srcObject = null;
        console.log("[Cleanup] Camera Stream 종료");
      }

      setIsGpuLocked(false);
    };
  }, [setIsGpuLocked]);

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
