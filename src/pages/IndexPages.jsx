import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { GlobalContext } from "@/contexts/GlobalContext";
import { useVoiceChat } from "@/contexts/VoiceChatContext";
import { PERSONAS } from "@/assets/data/personaData";
import { PERSONA_INTRODUCE } from "@/utils/PersonaSystem";
import { getWeatherStatus } from "@/utils/weatherUtils";
import { useHeartbeatLog } from "@/hooks/useHeartbeatLog";
import { useCollectionControl } from "@/hooks/useCollectionControl";
import { useMainLogic } from "@/hooks/useMainLogic";

import Prompt from "@/components/Prompt";
import Dialog from "@/components/Dialog";
import { IconRenderer } from "@/components/ui/IconRenderer";
import { PersonaContainer, PersonaThumbnail } from "@/components/ui/persona";
import ActionSidebar from "@/components/ActionSidebar";

export default function Main() {
  const { updatePersona, updateHumanInfo, personaId } =
    useContext(GlobalContext);
  const { setEnableTTS, sendMessage, playTtsSentence } = useVoiceChat();
  const navigation = useNavigate();

  const { compareAndLog } = useHeartbeatLog();
  const { requestStart, requestStop } = useCollectionControl();

  // 커스텀 훅으로 모든 비즈니스 로직 호출
  const { humidity, temperature, air, isAutoMode, setIsAutoMode, videoRef } =
    useMainLogic({
      personaId,
      updateHumanInfo,
      compareAndLog,
      requestStart,
      requestStop,
      sendMessage,
    });

  const [selectedPersona, setSelectedPersona] = useState(PERSONAS[0]);
  const [showVideoFeed, setShowVideoFeed] = useState(false);
  const [isWeatherDialogOpen, setIsWeatherDialogOpen] = useState(false);

  const weatherStatus = useMemo(() => {
    if (!air)
      return {
        label: "정보 없음",
        icon: "Info",
        color: "gray",
        desc: "정보 없음",
      };
    return getWeatherStatus(temperature, humidity, air);
  }, [temperature, humidity, air]);

  useEffect(() => {
    setEnableTTS(true);
  }, [setEnableTTS]);

  const toggleVideoFeed = async () => {
    if (!showVideoFeed) {
      const isOk = await requestStart("VIDEO_UI");
      if (isOk) setShowVideoFeed(true);
    } else {
      requestStop("VIDEO_UI");
      setShowVideoFeed(false);
    }
  };

  const personaHandler = (p) => {
    setSelectedPersona(p);
    updatePersona(p);
    playTtsSentence(PERSONA_INTRODUCE[p.id], p.voice);
  };

  return (
    <>
      {/* 캡처용 숨겨진 비디오 */}
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
        {/* [좌측] 페르소나 영역 */}
        <div className="w-4/12 flex flex-col items-center justify-between h-full">
          <div
            className="w-full flex-[3] flex items-center justify-center overflow-hidden relative cursor-pointer p-3"
            onClick={toggleVideoFeed}
          >
            <img
              src={
                showVideoFeed
                  ? "http://127.0.0.1:59531/video_feed"
                  : `/images/persona/${selectedPersona.id}.png`
              }
              alt="Persona"
              className="w-full h-full object-cover rounded-3xl"
              style={showVideoFeed ? { transform: "scaleX(-1)" } : {}}
            />
          </div>
          <div className="w-full flex-[1] pt-3 px-3">
            <PersonaContainer className="w-full">
              <div className="grid grid-cols-3 gap-4 w-full">
                {PERSONAS.map((p) => (
                  <PersonaThumbnail
                    key={p.id}
                    imageSrc={`/images/persona/${p.id}.png`}
                    isSelected={selectedPersona.id === p.id}
                    onClick={() => personaHandler(p)}
                  />
                ))}
              </div>
            </PersonaContainer>
          </div>
        </div>

        {/* [중앙] 대화 영역 */}
        <div className="w-6/12 h-full bg-white overflow-hidden px-4">
          <Prompt />
        </div>

        {/* [우측] 사이드바 영역 */}
        <ActionSidebar
          weatherStatus={weatherStatus}
          temperature={temperature}
          isAutoMode={isAutoMode}
          setIsAutoMode={setIsAutoMode}
          onWeatherClick={() => setIsWeatherDialogOpen(true)}
          onMenuClick={(v) =>
            v.value === "language"
              ? (window.location.href = import.meta.env.VITE_HANI_URL)
              : navigation(`/${v.value}`)
          }
        />
      </div>

      {/* 날씨 상세 다이얼로그 */}
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
                "text-3xl font-black text-center",
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
        <div className="my-4 bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
          <p className="text-lg font-bold leading-tight break-keep">
            {weatherStatus.desc}
          </p>
        </div>
      </Dialog>
    </>
  );
}
