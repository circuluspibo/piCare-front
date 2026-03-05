import { postInteraction } from "@/api/picareService";
import React, { createContext, useContext, useRef } from "react";

const LogContext = createContext(null);

export const LogProvider = ({ children }) => {
  // 현재 활성화된 훈련의 실시간 데이터
  const currentTrackerRef = useRef({
    currentPage: "",
    startTime: 0,
    idleCount: 0,
    touchCount: 0,
    exitCount: 0,
    scores: { total: 0, success: 0, time: 0 },
    speechLog: [],
    isComplete: false,
  });

  const saveLogToDB = async (data) => {
    console.log("프로그램 일지 전송 : ", data);
    const page = data.currentPage;
    let content = "";
    if (page === "/") {
      content = data.speechLog.join(" ");
    } else {
      content = JSON.stringify(JSON.parse(data));
    }
    await postInteraction({
      hwId: "697b07b3251e185c8626a8ad",
      type: page,
      content,
    });
  };

  return (
    <LogContext.Provider value={{ currentTrackerRef, saveLogToDB }}>
      {children}
    </LogContext.Provider>
  );
};

export const useLog = () => useContext(LogContext);
