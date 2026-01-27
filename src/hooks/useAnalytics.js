import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export const sendAnalytics = (path, startTime) => {
  const duration = Math.floor((Date.now() - startTime) / 1000);
  const logData = {
    path,
    duration,
    timestamp: new Date().toISOString(),
  };
  console.log("logData = ", logData);
  // TODO: url 영역 /endpoint로 변경
  //   if (typeof navigator !== "undefined" && navigator.sendBeacon) {
  //     const blob = new Blob(JSON.stringify(logData), {
  //       type: "application/json",
  //     });
  //     navigator.sendBeacon("url", blob);
  //   } else {
  //     fetch("url", {
  //       method: "POST",
  //       headers: { "Content-type": "application/json" },
  //       body: JSON.stringify(logData),
  //       keepalive: true,
  //     });
  //   }
};

export const useAnalytics = () => {
  const location = useLocation();
  const startTimeRef = useRef();
  const currentPathRef = useRef();

  useEffect(() => {
    const pathAtEntry = location.pathname;
    startTimeRef.current = Date.now();
    currentPathRef.current = pathAtEntry;

    return () => {
      sendAnalytics(pathAtEntry, startTimeRef.current);
    };
  }, [location.pathname]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      sendAnalytics(currentPathRef.current, startTimeRef.current);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);
};
