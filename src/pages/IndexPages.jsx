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
import { getHeartbeat } from "@/api/npuService";
import { postImg2Chat } from "@/api/gpuService";
import { getWeatherStatus } from "@/utils/weatherUtils";
import Dialog from "@/components/Dialog";

import { useHeartbeatLog } from "@/hooks/useHeartbeatLog";
import { useCollectionControl } from "@/hooks/useCollectionControl";

const SCAN_INTERVAL = 1000 * 150;
const HEARTBEAT_INTERVAL = 1000 * 90;

export default function Main() {
  const { updatePersona, personaId } = useContext(GlobalContext);
  const { setEnableTTS, sendMessage, playTtsSentence } = useVoiceChat();
  const navigation = useNavigate();
  const [selectedPersona, setSelectedPersona] = useState(PERSONAS[0]);

  const [showVideoFeed, setShowVideoFeed] = useState(false);
  const [humidity, setHumidity] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [air, setAir] = useState("");
  const [isWeatherDialogOpen, setIsWeatherDialogOpen] = useState(false);

  const { compareAndLog } = useHeartbeatLog();
  const { requestStart, requestStop } = useCollectionControl();

  const weatherStatus = useMemo(() => {
    if (!air)
      return {
        label: "날씨 없음",
        icon: "Info",
        color: "gray",
        desc: "정보 없음",
      };
    return getWeatherStatus(temperature, humidity, air);
  }, [temperature, humidity, air]);

  const [isAutoMode, setIsAutoMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const autoTimerRef = useRef(null);
  const videoRef = useRef(null);

  // 하트비트 주기 실행 및 엔진 점유 로직
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
        console.log("[FAILED] Heatbeat Sequence ERROR MSG: ", error);
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
  }, [compareAndLog, requestStart, requestStop]);

  const toggleVideoFeed = async () => {
    if (!showVideoFeed) {
      const isOk = await requestStart("VIDEO_UI");
      if (isOk) setShowVideoFeed(true);
    } else {
      requestStop("VIDEO_UI");
      setShowVideoFeed(false);
    }
  };

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
      console.log("[FAILED] RunAutoCaptureProcess MSG: ", e);
    } finally {
      setIsProcessing(false);
    }
  }, [sendMessage, personaId, isProcessing]);

  useEffect(() => {
    if (isAutoMode && !isProcessing) {
      autoTimerRef.current = setTimeout(runAutoCaptureProcess, SCAN_INTERVAL);
    }
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [isAutoMode, isProcessing, runAutoCaptureProcess]);

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

  useEffect(() => {
    setEnableTTS(true);
  }, [setEnableTTS]);

  const personaHandler = (p) => {
    setSelectedPersona(p);
    updatePersona(p);
    playTtsSentence(PERSONA_INTRODUCE[p.id], p.voice);
  };

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: "fixed",
          left: "-9999px",
          top: "-9999px",
          width: "320px",
          height: "240px",
        }}
      />
      <div className="flex w-full h-full mx-auto p-2 rounded-xl overflow-hidden">
        <div className="w-4/12 flex flex-col items-center justify-between h-full">
          <div className="w-full flex-[3] flex items-center justify-center overflow-hidden relative cursor-pointer p-3">
            {!showVideoFeed ? (
              <img
                src={`/images/persona/${selectedPersona.id}.png`}
                alt={selectedPersona.name}
                className="w-full h-full object-cover rounded-3xl"
                onClick={toggleVideoFeed}
              />
            ) : (
              <div className="w-full h-full" onClick={toggleVideoFeed}>
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

        <div className="w-6/12 bg-white overflow-hidden">
          <div className="text-xl text-gray-600 h-full px-4">
            <Prompt />
          </div>
        </div>

        <div className="w-2/12 flex flex-col h-full gap-4">
          <div
            onClick={() => setIsWeatherDialogOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center p-2 rounded-2xl cursor-pointer transition-all",
              `bg-${weatherStatus.color}-200`,
            )}
          >
            <div className="flex items-center gap-2">
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
            {[
              {
                label: "현재 온도",
                val: `${temperature}°C`,
                bg: "orange",
                icon: "Thermometer",
              },
              {
                label: "현재 습도",
                val: `${humidity}%`,
                bg: "blue",
                icon: "Droplets",
              },
              {
                label: "공기 상태",
                val:
                  air === "VG"
                    ? "매우 좋음"
                    : air === "G"
                      ? "좋음"
                      : air === "N"
                        ? "보통"
                        : "나쁨",
                bg: "emerald",
                icon: "Wind",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className={`bg-${item.bg}-50 px-4 py-2 rounded-2xl flex items-center justify-between shadow-sm border border-${item.bg}-100`}
              >
                <div className="flex items-center gap-2">
                  <IconRenderer
                    icon={item.icon}
                    className={`w-6 h-6 text-${item.bg}-400`}
                  />
                  <span className={`text-${item.bg}-500 font-bold text-xl`}>
                    {item.label}
                  </span>
                </div>
                <span className={`text-2xl font-black text-${item.bg}-600`}>
                  {item.val}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="my-4 bg-gray-50 p-3 rounded-2xl border border-gray-100">
          <p className="text-lg font-bold text-center leading-tight break-keep">
            {weatherStatus.desc}
          </p>
        </div>
      </Dialog>
    </>
  );
}
