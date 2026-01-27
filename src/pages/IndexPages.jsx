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
import Dialog from "@/components/Dialog";

const SCAN_INTERVAL = 1000 * 80;

export default function Main() {
  const { updatePersona, personaId } = useContext(GlobalContext);
  const { setEnableTTS, sendMessage, playTtsSentence } = useVoiceChat();
  const navigation = useNavigate();
  const [selectedPersona, setSelectedPersona] = useState(PERSONAS[0]);

  const hasStartedCollection = useRef(false);
  const [showVideoFeed, setShowVideoFeed] = useState(false);

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

  const [isAutoMode, setIsAutoMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // 처리 중 방지 플래그
  const autoTimerRef = useRef(null);
  const lastStateRef = useRef({ cnt_live: 0 });

  // 1. heartbeat 상시 동작 (30초 간격)
  useEffect(() => {
    const fetchHeartbeat = async () => {
      try {
        const hbResp = await getHeartbeat();
        const { data } = hbResp;
        const humidity = data.env.humidity
          ? parseFloat(data.env).toFixed(1)
          : 0;
        const temp = data.env.temp ? parseFloat(data.env.temp).toFixed(1) : 0;
        setHumidity(humidity);
        setTemperature(temp);
        setAir(data.env.air);
        lastStateRef.current.cnt_live = data.cnt_live; // 인원수 업데이트
      } catch (error) {
        console.error("Heartbeat 에러:", error);
      }
    };

    fetchHeartbeat();
    const timer = setInterval(fetchHeartbeat, 1000 * 30);
    return () => clearInterval(timer);
  }, []);

  // 2. AI 모드
  const runAutoCaptureProcess = useCallback(async () => {
    // 말하고 있거나(isProcessing) 사람이 없으면 스킵
    if (isProcessing || lastStateRef.current.cnt_live === 0) return;

    try {
      setIsProcessing(true);
      const sourceElement = document.querySelector(
        "img[alt='Hidden Capture Source']",
      );

      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");

      if (sourceElement && sourceElement.naturalWidth > 0) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(sourceElement, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.9),
        );
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

        const response = await postImg2Chat(file, PERSONA_SYSTEMS[personaId]);
        const rawText =
          typeof response === "string" ? response : JSON.stringify(response);

        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let jsonString = jsonMatch[0].replace(/'/g, '"');
          const parsedData = JSON.parse(jsonString);
          if (parsedData.result) sendMessage(parsedData.result);
        } else {
          sendMessage(rawText.trim());
        }
      }
    } catch (error) {
      console.error("Auto Mode 에러:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [sendMessage, personaId, isProcessing]);

  // 3. AI 모드 스위치에 따른 타이머 제어
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
      <div style={{ display: "none" }}>
        <img
          src="http://127.0.0.1:59531/video_feed"
          alt="Hidden Capture Source"
          crossOrigin="anonymous"
        />
      </div>
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
              `bg-${weatherStatus.color}-200`,
            )}
          >
            <div className={cn("flex items-center gap-2")}>
              <IconRenderer
                icon={weatherStatus.icon}
                className={cn("w-10 h-10", `text-${weatherStatus.color}-600`)}
              />
              <span
                className={cn(
                  "text-3xl font-black tracking-tighter",
                  `text-${weatherStatus.color}-800`,
                )}
              >
                {temperature}°
              </span>
            </div>
            <span
              className={cn(
                "text-sm font-black mt-1 uppercase",
                `text-${weatherStatus.color}-800`,
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
                isAutoMode ? "text-blue-600" : "text-gray-400",
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
                `bg-${v.color}-200 text-${v.color}-800 border-${v.color}-300 hover:bg-${v.color}-300`,
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
        title="실내 날씨 정보"
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
              `bg-${weatherStatus.color}-200`,
            )}
          >
            <IconRenderer
              icon={weatherStatus.icon}
              className={cn(
                "w-24 h-24 mb-2",
                `text-${weatherStatus.color}-600`,
              )}
            />
            <span
              className={cn(
                "text-3xl font-black break-keep text-center",
                `text-${weatherStatus.color}`,
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
          <p className="text-lg font-bold text-center leading-tight">
            <IconRenderer
              icon={weatherStatus.icon}
              className={cn(
                "w-8 h-8 inline-block mr-2 mb-1 opacity-50",
                `text-${weatherStatus.color}-600`,
              )}
            />
            {weatherStatus.desc}
          </p>
        </div>
      </Dialog>
    </>
  );
}
