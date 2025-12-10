import { createContext, useCallback, useState } from "react";

// Context 생성
export const GlobalContext = createContext({
  currentLang: "ko", // 기본값을 실제 사용하려는 초기값으로 설정하거나, 빈 값으로 설정합니다.
  personaVoice: 0,
  updatePersona: () => {},
});

// Provider 컴포넌트 생성 (오타 수정됨)
export const GlobalContextProvider = ({ children }) => {
  const [currentLang, setCurrentLang] = useState("ko");
  const [personaVoice, setPersonaVoice] = useState(33);

  // 공유할 함수는 useCallback으로 메모이제이션
  const updatePersona = useCallback((number) => {
    setCurrentLang("ko");
    setPersonaVoice(number);
  }, []);

  // Context를 통해 공유할 최종 값 객체
  const contextValue = {
    currentLang,
    personaVoice,
    updatePersona,
  };

  return (
    <GlobalContext.Provider value={contextValue}>
      {children}
    </GlobalContext.Provider>
  );
};
