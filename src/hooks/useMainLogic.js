import { useState, useEffect, useCallback, useRef } from "react";
import { getHeartbeat } from "@/api/npuService";
import { postImg2Chat } from "@/api/gpuService";
import { PERSONA_SYSTEMS } from "@/utils/PersonaSystem";

const SCAN_INTERVAL = 1000 * 150;
const HEARTBEAT_INTERVAL = 1000 * 90;

export function useMainLogic({
  personaId,
  updateHumanInfo,
  compareAndLog,
  requestStart,
  requestStop,
  sendMessage,
}) {
  const [humidity, setHumidity] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [air, setAir] = useState("");
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef(null);
  const autoTimerRef = useRef(null);

  // 1. 하트비트 시퀀스 (NPU 점유 및 환경 데이터 업데이트)
  useEffect(() => {
    let isMounted = true;
    const fetchHeartbeatSequence = async () => {
      if (!isMounted) return;
      const hasStarted = await requestStart("HB_POLLING");
      if (!hasStarted) return;

      try {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const hbResp = await getHeartbeat();
        const { data } = hbResp;
        updateHumanInfo(data.human);

        if (isMounted) {
          setHumidity(
            data.env.humidity ? parseFloat(data.env.humidity).toFixed(1) : 0,
          );
          setTemperature(
            data.env.temp ? parseFloat(data.env.temp).toFixed(1) : 0,
          );
          setAir(data.env.air);
          compareAndLog(data);
        }
      } catch (error) {
        console.log("[FAILED] Heartbeat Error: ", error);
      } finally {
        if (isMounted) await requestStop("HB_POLLING");
      }
    };

    fetchHeartbeatSequence();
    const timer = setInterval(fetchHeartbeatSequence, HEARTBEAT_INTERVAL);

    return () => {
      isMounted = false;
      clearInterval(timer);
      requestStop("HB_POLLING");
    };
  }, [compareAndLog, requestStart, requestStop, updateHumanInfo]);

  // 2. AI 자동 캡처 프로세스
  const runAutoCaptureProcess = useCallback(async () => {
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 240;
        const ctx = canvas.getContext("2d");
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.4),
        );
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        const response = await postImg2Chat(file, PERSONA_SYSTEMS[personaId]);

        const rawText =
          typeof response === "string" ? response : JSON.stringify(response);
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          let jsonString = jsonMatch[0].replace(/'/g, '"');
          const parsedData = JSON.parse(jsonString);
          if (parsedData.result) await sendMessage("", parsedData.result);
        } else {
          await sendMessage("", rawText.trim());
        }
      }
    } catch (e) {
      console.log("[FAILED] Capture Error: ", e);
    } finally {
      setIsProcessing(false);
    }
  }, [sendMessage, personaId, isProcessing]);

  // 3. 자동 모드 타이머 관리
  useEffect(() => {
    if (isAutoMode && !isProcessing) {
      autoTimerRef.current = setTimeout(runAutoCaptureProcess, SCAN_INTERVAL);
    }
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [isAutoMode, isProcessing, runAutoCaptureProcess]);

  // 4. 카메라 스트림 제어
  useEffect(() => {
    let stream = null;
    const startAI = async () => {
      if (isAutoMode) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240 },
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setTimeout(runAutoCaptureProcess, 1000);
          }
        } catch (error) {
          console.log("[FAILED] Start AI", error);
          setIsAutoMode(false);
        }
      } else {
        if (videoRef.current?.srcObject) {
          videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
          videoRef.current.srcObject = null;
        }
        setIsProcessing(false);
      }
    };
    startAI();
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [isAutoMode, runAutoCaptureProcess]);

  return {
    humidity,
    temperature,
    air,
    isAutoMode,
    setIsAutoMode,
    videoRef,
    isProcessing,
  };
}
