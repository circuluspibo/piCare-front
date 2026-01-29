import { usePageAnalyze, useTouchAnalyze } from "@/hooks/useAnalyze";

import { Outlet } from "react-router-dom";

export default function IndexLayout() {
  // 데이터 수집 함수
  usePageAnalyze();
  useTouchAnalyze();

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-red-500 overflow-hidden caret-transparent">
      <div
        className="w-full h-full bg-white shadow-2xl overflow-auto"
        style={{
          transformOrigin: "center",
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}
