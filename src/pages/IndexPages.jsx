import Prompt from "@/components/Prompt";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PersonaContainer, PersonaThumbnail } from "@/components/ui/persona";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { getWeatherStatus } from "@/utils/weatherUtils";
import Dialog from "@/components/Dialog"; // 직접 만든 Dialog 컴포넌트 임포트

const SCAN_INTERVAL = 1000 * 60;

export default function Main() {
  const { updatePersona, personaId } = useContext(GlobalContext);
  const { setEnableTTS, sendMessage, playTtsSentence } = useVoiceChat();

  const navigation = useNavigate();
  const [selectedPersona, setSelectedPersona] = useState(PERSONAS[0]);

  const hasStartedCollection = useRef(false);
  const [showVideoFeed, setShowVideoFeed] = useState(false);

  // 날씨 전용 상태
  const [isWeatherDialogOpen, setIsWeatherDialogOpen] = useState(false);
  const [humidity, setHumidity] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [air, setAir] = useState("");

  const weatherStatus = useMemo(() => {
    if (!air) {
      return {
        label: "날씨 없음",
        icon: "Info",
        color: "gray",
        desc: "날씨 정보가 없습니다.",
      };
    }
    return getWeatherStatus(temperature, humidity, air);
  }, [temperature, humidity, air]);

  // AUTO 제어
  const [isAutoMode, setIsAutoMode] = useState(false);
  const autoTimerRef = useRef(null);

  const runAutoCaptureProcess = useCallback(async () => {
    try {
      const hbResp = await getHeartbeat();
      const hbResult = await hbResp.json();
      const hbData = hbResult.data;

      // 날씨/센서 데이터는 5초마다 동기화됨
      setHumidity(hbData.humidity);
      setTemperature(hbData.temp);
      setAir(hbData.air);

      // 사람이 감지되었을 때만 AI 분석 실행
      if (hbData.cnt_live > 0) {
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
        }

        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/jpeg")
        );
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

        const response = await postImg2Chat(file, PERSONA_SYSTEMS[personaId]);

        if (response.ok) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let fullText = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fullText += decoder.decode(value, { stream: true });
          }
          sendMessage(fullText);
        }
      }
    } catch (error) {
      console.error("Auto Mode 에러:", error);
    }
  }, [sendMessage, personaId]);

  useEffect(() => {
    if (isAutoMode) {
      autoTimerRef.current = setInterval(runAutoCaptureProcess, SCAN_INTERVAL);
    } else {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    }
    return () => clearInterval(autoTimerRef.current);
  }, [isAutoMode, runAutoCaptureProcess]);

  useEffect(() => {
    setEnableTTS(true);
  }, [setEnableTTS]);

  const personaHandler = (p) => {
    setSelectedPersona(p);
    updatePersona(p);
    playTtsSentence(PERSONA_INTRODUCE[p.id], p.voice);
  };

  const mainImageClickHandler = async () => {
    if (!hasStartedCollection.current) {
      await getStartCollection().catch(console.error);
      hasStartedCollection.current = true;
    }
    setShowVideoFeed(true);
  };

  return (
    <>
      <div className="flex w-full h-full mx-auto p-2 rounded-xl overflow-hidden">
        {/* SECTION: PERSONA */}
        <div className="w-4/12 flex flex-col items-center justify-between h-full">
          <div className="w-full flex-[3] flex items-center justify-center overflow-hidden relative cursor-pointer p-3">
            {!showVideoFeed ? (
              <img
                src={`/images/persona/${selectedPersona.id}.png`}
                alt={selectedPersona.name}
                className="w-full h-full object-cover rounded-3xl"
                onClick={mainImageClickHandler}
              />
            ) : (
              <div
                className="w-full h-full"
                onClick={() => setShowVideoFeed(false)}
              >
                <img
                  src="http://127.0.0.1:59531/video_feed"
                  alt="Video Feed"
                  style={{ transform: "scaleX(-1)" }}
                  className="w-full h-full object-cover rounded-3xl"
                />
              </div>
            )}
          </div>
          <div className="w-full flex-[1] p-3">
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

        {/* SECTION: PROMPT */}
        <div className="w-6/12 bg-white overflow-hidden">
          <div className="text-xl text-gray-600 h-full px-4">
            <Prompt />
          </div>
        </div>

        {/* SECTION: BUTTONS */}
        <div className="w-2/12 flex flex-col h-full gap-4">
          {/* SECTION: Weather */}
          <div
            onClick={() => setIsWeatherDialogOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center p-2 rounded-2xl cursor-pointer transition-all",
              `bg-${weatherStatus.color}-200`
            )}
          >
            <div className="flex items-center gap-2">
              <IconRenderer
                icon={weatherStatus.icon}
                style={{}}
                className={cn("w-10 h-10", `text-${weatherStatus.color}-800`)}
              />
              <span
                className={cn(
                  "text-3xl font-black tracking-tighter",
                  `text-${weatherStatus.color}-800`
                )}
              >
                {temperature}°
              </span>
            </div>
            <span
              className={cn(
                "text-sm font-black mt-1 uppercase",
                `text-${weatherStatus.color}-800`
              )}
            >
              {weatherStatus.label}
            </span>
          </div>

          {/* SECITON: AI SWITCH */}
          <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
            <span
              className={cn(
                "text-lg font-black",
                isAutoMode ? "text-blue-600" : "text-gray-400"
              )}
            >
              AI 모드
            </span>
            <Switch checked={isAutoMode} onCheckedChange={setIsAutoMode} />
          </div>

          {/* SECTION: BUTTONS */}
          {buttonLabels.map((v, i) => (
            <Button
              key={i}
              onClick={() =>
                v.value === "language"
                  ? (window.location.href = import.meta.env.VITE_HANI_URL)
                  : navigation(`/${v.value}`)
              }
              className={cn(
                "flex flex-1 flex-col justify-center text-xl font-black rounded-2xl border-b-[8px] active:border-b-0 active:translate-y-1 shadow-sm transition-all",
                `bg-${v.color}-200 text-${v.color}-800 border-${v.color}-300 hover:bg-${v.color}-300`
              )}
            >
              <IconRenderer icon={v.icon} style={{ width: 60, height: 60 }} />
            </Button>
          ))}
        </div>
      </div>

      {/* SECTION: 날씨 상세 정보 Dialog */}
      <Dialog
        isOpen={isWeatherDialogOpen}
        onClose={() => setIsWeatherDialogOpen(false)}
        title="실시간 날씨 정보"
        // 540px 높이를 고려하여 상단 여백 최소화
        titleStyle="text-2xl font-black text-center text-gray-800 mb-3"
        actions={[
          {
            text: "확인",
            onClick: () => {},
            style: "bg-gray-800 text-white text-lg px-12 py-2 rounded-xl",
          },
        ]}
      >
        <div className="flex flex-row items-stretch gap-4">
          {/* 왼쪽: 메인 날씨 상태 (강조 영역) */}
          <div
            className={cn(
              "flex-[0.8] flex flex-col items-center justify-center p-4 rounded-3xl shadow-inner border border-white/50",
              weatherStatus.color
            )}
          >
            <IconRenderer
              icon={weatherStatus.icon}
              className={cn("w-24 h-24 mb-2", weatherStatus.color)}
            />
            <span
              className={cn(
                "text-3xl font-black break-keep text-center",
                weatherStatus.color
              )}
            >
              {weatherStatus.label}
            </span>
          </div>

          <div className="flex-[1.2] grid grid-cols-1 gap-2">
            <div className="bg-orange-50 px-4 py-2 rounded-2xl flex items-center justify-between shadow-sm border border-orange-100">
              <div className="flex items-center gap-2">
                <IconRenderer
                  icon={weatherStatus.icon}
                  className="w-6 h-6 text-orange-400"
                />
                <span className="text-orange-500 font-bold text-xl">
                  현재 온도
                </span>
              </div>
              <span className="text-2xl font-black text-orange-600">
                {temperature}°C
              </span>
            </div>

            <div className="bg-blue-50 px-4 py-2 rounded-2xl flex items-center justify-between shadow-sm border border-blue-100">
              <div className="flex items-center gap-2">
                <IconRenderer
                  icon={weatherStatus.icon}
                  className="w-6 h-6 text-blue-400"
                />
                <span className="text-blue-500 font-bold text-xl">
                  현재 습도
                </span>
              </div>
              <span className="text-2xl font-black text-blue-600">
                {humidity}%
              </span>
            </div>

            <div className="bg-emerald-50 px-4 py-2 rounded-2xl flex items-center justify-between shadow-sm border border-emerald-100">
              <div className="flex items-center gap-2">
                <IconRenderer
                  icon={weatherStatus.icon}
                  className="w-6 h-6 text-emerald-400"
                />
                <span className="text-emerald-500 font-bold text-xl">
                  공기 상태
                </span>
              </div>
              <span className="text-2xl font-black text-emerald-600">
                {air === "VG"
                  ? "매우 좋음"
                  : air === "G"
                  ? "좋음"
                  : air === "N"
                  ? "보통"
                  : "나쁨"}
              </span>
            </div>
          </div>
        </div>

        <div className="my-4 bg-gray-50 p-3 rounded-2xl border border-gray-100">
          <p className="text-gray-600 text-lg font-bold text-center leading-tight">
            <IconRenderer
              icon={weatherStatus.icon}
              className="w-8 h-8 inline-block mr-2 mb-1 opacity-50"
            />
            {weatherStatus.desc}
          </p>
        </div>
      </Dialog>
    </>
  );
}
