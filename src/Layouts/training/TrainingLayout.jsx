import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ArrowBigLeft } from "lucide-react";

export default function TrainingLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const GAME_INFO = {
    COLOR: { title: "색상 찾기 훈련" },
    NUMBER: { title: "숫자 맞추기 훈련" },
    PIANO: { title: "소리 맞추기 훈련" },
  };

  const pathParts = pathname.split("/").filter(Boolean);
  const currentPath = pathParts[pathParts.length - 1];

  // 2. 메뉴 여부 판단 (경로가 정확히 /exercise 일 때)
  const isMenu = pathname === "/training";
  const modeKey = isMenu ? null : currentPath.toUpperCase();
  return (
    <div className="flex flex-col w-full h-full p-6 bg-slate-50 overflow-hidden font-extrabold text-[#2D3A5A]">
      {/* 헤더 */}
      <header className="flex items-center pb-4 border-b-2 border-slate-200 mb-6">
        <div className="flex items-center text-4xl font-black cursor-pointer">
          <ArrowBigLeft
            className="size-14 mr-2 cursor-pointer hover:scale-110 transition-transform"
            onClick={(e) => {
              e.stopPropagation();
              isMenu ? navigate("/") : navigate("/training");
            }}
          />
          <h1>
            {isMenu
              ? "오늘의 인지 훈련"
              : GAME_INFO[modeKey]?.title || "훈련 중"}
          </h1>
        </div>
      </header>

      {/* 메인 영역 */}
      <main className="flex-1 overflow-hidden relative">
        <Outlet />
      </main>
    </div>
  );
}
