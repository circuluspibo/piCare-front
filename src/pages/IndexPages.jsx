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
import useVoiceChat from "@/hooks/useVoiceChat";
import PERSONA_SYSTEMS from "@/utils/PersonaSystem";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function Main() {
  const { updatePersona, persona } = useContext(GlobalContext);
  const navigation = useNavigate();
  // useVoiceChat 훅 연결 (TTS 활성화 상태로 설정)
  const { sendMessage } = useVoiceChat({ enableTTS: true });
  // TODO: 선택된 Persona에 따른 Voice 값 받아함.
  const [selectedPersona, setSelectedPersona] = useState(PERSONAS[0]);
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
      default: {
        return;
      }
    }
  };

  useEffect(() => {
    updatePersona(selectedPersona.voice, selectedPersona.id);
  }, [setSelectedPersona, selectedPersona, updatePersona]);

  const [isAutoMode, setIsAutoMode] = useState(false);
  const autoTimerRef = useRef(null);
  const lastActionTimeRef = useRef(0); // 30초 쿨타임 체크용

  const isTemp = true;
  const runAutoCaptureProcess = useCallback(async () => {
    // NOTE:임시로 즉시 리턴
    if (isTemp) {
      return;
    }
    try {
      // 1. Heartbeat 상태 수집 (서버로부터 현재 사람 정보 가져오기)
      const hbResp = await fetch(`http://127.0.0.1:59531/heartbeat`);
      const hbResult = await hbResp.json();
      const hbData = hbResult.data;

      const now = Date.now();
      // 2. 조건 확인: 사람이 있고, 마지막 실행으로부터 30초가 지났을 때만 실행
      if (hbData.cnt_live > 0 && now - lastActionTimeRef.current > 30000) {
        lastActionTimeRef.current = now; // 즉시 쿨타임 적용

        // 3. 현재 카메라 화면 캡처
        // 2. 현재 카메라 화면 캡처
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

        // Blob으로 변환
        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/jpeg")
        );
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

        // FormData 생성
        const formData = new FormData();
        const currentSystem = PERSONA_SYSTEMS[persona];
        formData.append("file", file); // @app.post의 'file' 인자
        formData.append("prompt", `상황에 맞게 짧고 친절하게 인사해줘.`);
        formData.append("system", currentSystem);
        formData.append("lang", "ko"); // 한국어로 응답받으려면 'ko' 설정
        formData.append("isPlay", "0");

        const response = await fetch(`http://127.0.0.1:59532/v1/img2chat`, {
          method: "POST",
          body: formData, // JSON.stringify가 아닌 formData를 그대로 보냄
        });

        if (!response.ok) throw new Error("네트워크 응답 에러");

        // 5. 스트리밍 응답 처리
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
        }
        // TTS 실행
        sendMessage(fullText);
      }
    } catch (error) {
      console.error("Auto Mode 에러:", error);
    }
  }, [sendMessage, persona, isTemp]);

  // 동일 로직 테스트 용 함수
  // NOTE: 테스트용 1회성 실행 핸들러 ---
  const [isTesting, setIsTesting] = useState(false);
  const runTestCapture = useCallback(async () => {
    if (isTesting) return; // 이미 테스트 중이면 중복 클릭 방지
    setIsTesting(true); // 깜빡임 시작
    try {
      console.log("테스트 모드 실행: 즉시 캡처 및 분석 시작");

      // 1. 테스트용 가상 데이터 설정 (Heartbeat 생략)

      // 2. 현재 카메라 화면 캡처
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

      // Blob으로 변환
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg")
      );
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

      // FormData 생성
      const formData = new FormData();
      const currentSystem = PERSONA_SYSTEMS[persona];
      formData.append("file", file); // @app.post의 'file' 인자
      formData.append("prompt", `상황에 맞게 짧고 친절하게 인사해줘.`);
      formData.append("system", currentSystem);
      formData.append("lang", "ko"); // 한국어로 응답받으려면 'ko' 설정
      formData.append("isPlay", "0");

      const response = await fetch(`http://127.0.0.1:59532/v1/img2chat`, {
        method: "POST",
        body: formData, // JSON.stringify가 아닌 formData를 그대로 보냄
      });

      if (!response.ok) throw new Error("네트워크 응답 에러");

      // 5. 스트리밍 응답 처리
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
      }
      // TTS 실행
      sendMessage(fullText);
    } catch (error) {
      console.error("Test Mode Error:", error);
    } finally {
      setIsTesting(false); // 응답 완료 또는 에러 발생 시 깜빡임 중지
    }
  }, [sendMessage, persona, setIsTesting, isTesting]);

  // Auto Mode 루프 설정 (1초마다 상태 체크)
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
  return (
    <>
      <div className="flex w-full h-full mx-auto p-2 rounded-xl overflow-hidden">
        {/** SECTION:페르소나 (10%) */}
        <div
          className={`w-1/10 flex flex-col items-center justify-start rounded-l-xl m-1`}
        >
          <PersonaContainer>
            <div className="grid grid-cols-1 gap-1 overflow-hidden p-1 h-full">
              {PERSONAS.map((p) => (
                <PersonaThumbnail
                  key={p.id}
                  icon={p.icon}
                  gender={p.gender}
                  isSelected={selectedPersona.id === p.id}
                  onClick={() => setSelectedPersona(p)}
                />
              ))}
            </div>
          </PersonaContainer>
        </div>

        {/** SECTION: 프롬프트/챗봇 (65%) */}
        <div className="w-8/12 p-3 bg-white rounded-xl ">
          <div className="text-xl text-gray-600 h-full">
            <Prompt />
          </div>
        </div>

        {/** SECTION: 버튼 영역 (25%) */}
        <div className="w-1/4 flex flex-col h-full p-2 gap-4 rounded-r-2xl">
          {/** NOTE: 임시 테스트 버튼 */}
          <div className="flex flex-row w-full justify-between">
            <div className="flex items-center">
              <button
                onClick={runTestCapture}
                disabled={isTesting}
                className={cn(
                  "w-6 h-6 rounded-full transition-all duration-300 shadow-sm",
                  isTesting
                    ? "bg-yellow-400 animate-pulse scale-110 shadow-[0_0_10px_rgba(250,204,21,0.6)]"
                    : "bg-gray-400 active:scale-95"
                )}
                title="즉시 테스트"
              />
            </div>

            {/* 2. 자동 모드 스위치 및 라벨 (오른쪽) */}
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "text-xl font-bold tracking-tighter transition-colors",
                  isAutoMode ? "text-blue-600" : "text-gray-500"
                )}
              >
                {isAutoMode ? "자동 켜기" : "자동 끄기"}
              </span>
              <Switch
                checked={isAutoMode}
                onCheckedChange={(checked) => {
                  setIsAutoMode(checked);
                  if (checked) lastActionTimeRef.current = 0; // 켤 때 즉시 감지하도록 초기화
                }}
                className="scale-125 data-[state=checked]:bg-blue-500" // 스위치 크기를 살짝 키움
              />
            </div>
          </div>
          {buttonLabels.map((v, i) => (
            <Button
              key={i}
              onClick={() => handleClickEvent(v.value)}
              size="sm"
              className={cn(
                "flex flex-1 flex-col justify-center text-xl font-bold rounded-2xl text-center shadow-lg ",
                `bg-${v.color}-200 text-${v.color}-800`
              )}
            >
              <div className="flex flex row items-center gap-2">
                {/** FIXME: size 프롭스가 여기서만 왜 안 먹히는지 모르겠음. */}
                <IconRenderer icon={v.icon} style={{ width: 80, height: 80 }} />
                <p className="whitespace-normal text-center  text-6xl">
                  {v.label}
                </p>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </>
  );
}
