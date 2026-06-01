/* eslint-disable react-refresh/only-export-components */
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
    await postInteraction({
      type: data.currentPage,
      content: { ...data },
    });
  };

  return (
    <LogContext.Provider value={{ currentTrackerRef, saveLogToDB }}>
      {children}
    </LogContext.Provider>
  );
};

export const useLog = () => useContext(LogContext);
