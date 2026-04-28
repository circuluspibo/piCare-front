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
    console.log("프로그램 일지 전송 : ", data);
    const page = data.currentPage;
    let content = "";
    if (page === "main") {
      // main일 때는 마지막 speechLog만 추출해서 객체화
      const lastLog = Array.isArray(data.speechLog)
        ? data.speechLog[data.speechLog.length - 1]
        : data.speechLog;

      content = { content: lastLog };
    } else {
      // main이 아닐 때는 data 전체를 content로 넘기되,
      // 불필요한 중복을 피하기 위해 복사본을 만드는 것이 안전합니다.
      content = { ...data };
    }
    await postInteraction({
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
