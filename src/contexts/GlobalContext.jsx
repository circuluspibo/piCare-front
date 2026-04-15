/* eslint-disable react-refresh/only-export-components */
import { PERSONAS } from "@/assets/data/personaData";
import { getDeviceUuid } from "@/api/cpuService";
import { createContext, useCallback, useEffect, useRef, useState } from "react";

const DEFAULT = PERSONAS[0];

const IDLE_TIME = 5 * 60 * 1000; // 5분

// 세션 ID 생성기
const generateSid = () =>
  `${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.random().toString(36).substring(2, 8)}`;
// Context 생성
export const GlobalContext = createContext({
  currentLang: "ko",
  personaId: "grandpa",
  personaVoice: 0,
  sId: "",
  hwId: null,
  humanInfo: null,
  isGpuLocked: false,
  updatePersona: () => {},
  updateHumanInfo: () => {},
  setIsGpuLocked: () => {},
});

export const GlobalContextProvider = ({ children }) => {
  const [personaId, setPersonaId] = useState(DEFAULT.id);
  const [currentLang] = useState("ko");
  const [personaVoice, setPersonaVoice] = useState(DEFAULT.voice);
  const [sId, setSid] = useState(generateSid());
  const [humanInfo, setHumanInfo] = useState(null);
  const [hwId, setHwId] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    getDeviceUuid().then((uuid) => {
      if (uuid) setHwId(uuid);
    });
  }, []);

  // GPU 관리
  const [isGpuLocked, setIsGpuLocked] = useState(false);
  // 타이머를 리셋하고 5분 뒤에 sid를 새로 발급하는 함수
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const newSid = generateSid();
      setSid(newSid);
      console.log("[SESSION EXPIRED] New SID: ", newSid);
    }, IDLE_TIME);
  }, []);
  useEffect(() => {
    // sid가 변경되었다는 것은 5분이 지나 세션이 종료되었다는 뜻!
    if (sId) {
      console.log("[SESSION START] SID: ", sId);
      // 예: localStorage.removeItem('pending_logs');
    }
  }, [sId]);

  // 사용자 활동 감지 (마우스, 터치 등 클릭 시 세션 유지)
  useEffect(() => {
    const handleActivity = () => resetTimer();

    window.addEventListener("mousedown", handleActivity);
    window.addEventListener("touchstart", handleActivity);

    resetTimer(); // 컴포넌트 마운트 시 타이머 시작

    return () => {
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  // 공유할 함수는 useCallback으로 메모이제이션
  const updatePersona = useCallback((persona) => {
    setPersonaId(persona.id);
    setPersonaVoice(persona.voice);
  }, []);
  const updateHumanInfo = useCallback((payload) => {
    setHumanInfo(payload);
  }, []);
  // Context를 통해 공유할 최종 값 객체
  const contextValue = {
    currentLang,
    personaId,
    personaVoice,
    humanInfo,
    sId,
    hwId,
    updatePersona,
    updateHumanInfo,
    isGpuLocked,
    setIsGpuLocked,
  };

  return (
    <GlobalContext.Provider value={contextValue}>
      {children}
    </GlobalContext.Provider>
  );
};
