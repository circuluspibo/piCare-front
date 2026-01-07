import Prompt from "@/components/Prompt";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PersonaContainer, PersonaThumbnail } from "@/components/ui/persona";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { PERSONAS } from "@/assets/data/personaData";
import { buttonLabels } from "@/assets/data/buttonLabels";
import { IconRenderer } from "@/components/ui/IconRenderer";
import { useNavigate } from "react-router-dom";
import { GlobalContext } from "@/contexts/GlobalContext";
import { useVoiceChat } from "@/contexts/VoiceChatContext";
import { PERSONA_SYSTEMS, PERSONA_INTRODUCE } from "@/utils/PersonaSystem";
import { Switch } from "@/components/ui/switch";
import { getHeartbeat, getStartCollection } from "@/api/npuService";
import { postImg2Chat } from "@/api/gpuService";

export default function Main() {
  const { updatePersona, personaId } = useContext(GlobalContext);
  const { setEnableTTS, sendMessage, playTtsSentence } = useVoiceChat();
  const navigation = useNavigate();
  const [selectedPersona, setSelectedPersona] = useState(PERSONAS[0]);

  // --- 추가된 상태 및 Ref ---
  const hasStartedCollection = useRef(false); // 최초 1회 실행 체크용
  const [showVideoFeed, setShowVideoFeed] = useState(false); // 화면 전환 상태

  // 버튼 이벤트 헨들러
  const handleClickEvent = (value) => {
    switch (value) {
      case "language": {
        const url = import.meta.env.VITE_HANI_URL;
        return (window.location.href = url);
      }
      case "excercise": {
        return navigation("/exercise");
      }
      case "draw": {
        return navigation("/draw");
      }
      case "training": {
        return navigation("/training");
      }
      default: {
        return;
      }
    }
  };

  // 하단 썸네일 클릭 시: 페르소나 데이터만 변경 (기존 로직 유지)
  const personaHandler = (persona) => {
    setSelectedPersona(persona);
    updatePersona(persona);
    playTtsSentence(PERSONA_INTRODUCE[persona.id], persona.voice);
  };

  // --- 메인 이미지 클릭 핸들러 (요청하신 핵심 기능) ---
  const mainImageClickHandler = async () => {
    // 1. 최초 1회만 /start_collection 호출
    if (!hasStartedCollection.current) {
      try {
        console.log("최초 클릭: /start_collection 호출 중...");
        await getStartCollection();
        hasStartedCollection.current = true; // 이후 실행 방지
      } catch (error) {
        console.error("start_collection 호출 에러:", error);
      }
    }

    // 2. 비디오 피드 화면으로 전환
    setShowVideoFeed(true);
  };

  const [isAutoMode, setIsAutoMode] = useState(false);
  const autoTimerRef = useRef(null);
  const lastActionTimeRef = useRef(0);

  const isTemp = true;
  const runAutoCaptureProcess = useCallback(async () => {
    if (isTemp) return;
    try {
      const hbResp = await getHeartbeat();
      const hbResult = await hbResp.json();
      const hbData = hbResult.data;

      const now = Date.now();
      if (hbData.cnt_live > 0 && now - lastActionTimeRef.current > 30000) {
        lastActionTimeRef.current = now;

        const video = document.querySelector("video");
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext("2d");

        if (video && video.videoWidth > 0) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        } else {
          ctx.fillStyle = "blue";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = "white";
          ctx.font = "30px Arial";
          ctx.fillText("VIDEO TEST SOURCE", 150, 240);
        }

        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/jpeg")
        );
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        const currentSystem = PERSONA_SYSTEMS[personaId];

        const response = await postImg2Chat(file, currentSystem);

        if (!response.ok) throw new Error("네트워크 응답 에러");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
        }
        sendMessage(fullText);
      }
    } catch (error) {
      console.error("Auto Mode 에러:", error);
    }
  }, [sendMessage, personaId, isTemp]);

  // NOTE: TEST이후 삭제
  const [isTesting, setIsTesting] = useState(false);
  const runTestCapture = useCallback(async () => {
    if (isTesting) return;
    setIsTesting(true);

    try {
      const video = document.querySelector("video");
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");

      if (video && video.videoWidth > 0) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = "blue";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "30px Arial";
        ctx.fillText("VIDEO TEST SOURCE", 150, 240);
      }

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg")
      );
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
      const currentSystem = PERSONA_SYSTEMS[personaId];

      const response = await postImg2Chat(file, currentSystem);
      if (!response.ok) throw new Error("네트워크 응답 에러");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
      }
      sendMessage(fullText);
    } catch (error) {
      console.error("Test Mode Error:", error);
    } finally {
      setIsTesting(false);
    }
  }, [sendMessage, personaId, isTesting]);

  useEffect(() => {
    if (isAutoMode) {
      autoTimerRef.current = setInterval(runAutoCaptureProcess, 1000);
    } else {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    }
    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
  }, [isAutoMode, runAutoCaptureProcess]);

  useEffect(() => {
    setEnableTTS(true);
  }, [setEnableTTS]);

  return (
    <>
      <div className="flex w-full h-full mx-auto p-2 rounded-xl overflow-hidden">
        <div className="w-4/12 flex flex-col items-center justify-between h-full">
          {/* 메인 이미지/비디오 전환 영역 */}
          <div className="w-full flex-[3] flex items-center justify-center overflow-hidden relative cursor-pointer p-3">
            {!showVideoFeed ? (
              // 페르소나 메인 이미지: 클릭 시 start_collection 호출 및 화면 전환
              <img
                src={`/images/persona/${selectedPersona.id}.png`}
                alt={selectedPersona.name}
                className="w-full h-full object-cover rounded-xl"
                onClick={mainImageClickHandler}
              />
            ) : (
              // 비디오 피드: 클릭 시 다시 페르소나 이미지로 전환
              <div
                className="w-full h-full"
                onClick={() => setShowVideoFeed(false)}
              >
                <img
                  src="http://127.0.0.1:59531/video_feed"
                  alt="Video Feed"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="w-full flex-[1] flex flex-col items-center justify-center p-3">
            <PersonaContainer className="w-full">
              <div className="grid grid-cols-3 gap-4 w-full">
                {PERSONAS.map((p) => (
                  <PersonaThumbnail
                    key={p.id}
                    imageSrc={`/images/persona/${p.id}.png`}
                    gender={p.gender}
                    isSelected={selectedPersona.id === p.id}
                    onClick={() => personaHandler(p)}
                  />
                ))}
              </div>
            </PersonaContainer>
          </div>
        </div>

        <div className="w-8/12 bg-white rounded-xl ">
          <div className="text-xl text-gray-600 h-full">
            <Prompt />
          </div>
        </div>

        <div className="w-2/12 flex flex-col h-full p-3 gap-4">
          <div className="flex flex-row w-full justify-between">
            <div className="flex items-center">
              <button
                onClick={runTestCapture}
                disabled={isTesting}
                className={cn(
                  "w-6 h-6 rounded-full transition-all duration-300 shadow-sm",
                  isTesting
                    ? "bg-yellow-400 animate-pulse scale-110"
                    : "bg-gray-400"
                )}
              />
            </div>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "text-xl font-bold tracking-tighter",
                  isAutoMode ? "text-blue-600" : "text-gray-500"
                )}
              >
                {isAutoMode ? "켜기" : "끄기"}
              </span>
              <Switch
                checked={isAutoMode}
                onCheckedChange={(checked) => {
                  setIsAutoMode(checked);
                  if (checked) lastActionTimeRef.current = 0;
                }}
                className="scale-125 data-[state=checked]:bg-blue-500"
              />
            </div>
          </div>
          {buttonLabels.map((v, i) => (
            <Button
              key={i}
              onClick={() => handleClickEvent(v.value)}
              size="sm"
              className={cn(
                "flex flex-1 flex-col justify-center text-xl font-bold rounded-2xl text-center border-b-8",
                `bg-${v.color}-200 text-${v.color}-800 border-${v.color}-300 active:border-b-0 active:translate-y-1`
              )}
            >
              <div className="flex flex row items-center gap-2">
                <IconRenderer icon={v.icon} style={{ width: 80, height: 80 }} />
              </div>
            </Button>
          ))}
        </div>
      </div>
    </>
  );
}
