import useVoiceChatHook from "@/hooks/useVoiceChat";
import { createContext, useContext, useState } from "react";

// 컨텍스트 생성
const VoiceChatContext = createContext(null);

// 프로바이더 생성
export const VoiceChatProvider = ({ children }) => {
  const [enableTTS, setEnableTTS] = useState(true);

  const voiceChat = useVoiceChatHook({ enableTTS });

  const value = {
    ...voiceChat,
    enableTTS,
    setEnableTTS,
  };

  return (
    <VoiceChatContext.Provider value={value}>
      {children}
    </VoiceChatContext.Provider>
  );
};

// 커스텀 훅
export const useVoiceChat = () => {
  const context = useContext(VoiceChatContext);
  if (!context) {
    throw new Error("useVoiceChat must be used within a VoiceChatProvider");
  }
  return context;
};
