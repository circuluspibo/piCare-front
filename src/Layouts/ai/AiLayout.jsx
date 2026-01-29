import React from "react";
import { ArrowBigLeft } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const GAME_INFO = {
  DRAW: { title: "말하는 대로 그림 그리기" },
  MIRROR: { title: "젊어지는 거울" },
  VOICE: { title: "AI 음성 변조" },
};

export default function AiLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pathParts = pathname.split("/").filter(Boolean);
  const currentPath = pathParts[pathParts.length - 1];

  // 2. 메뉴 여부 판단
  const isMenu = pathname === "/ai";
  const modeKey = isMenu ? null : currentPath.toUpperCase();

  return (
    <div className="flex flex-col w-full h-full p-4 bg-[#f8f5f0] overflow-hidden font-extrabold text-[#2D3A5A]">
      <header className="flex flex-col items-start pb-4 border-b border-stone-200 mb-4">
        <div className="flex items-center text-4xl font-black cursor-pointer">
          <ArrowBigLeft
            className="size-14 mr-2 cursor-pointer hover:scale-110 transition-transform"
            onClick={(e) => {
              e.stopPropagation();
              isMenu ? navigate("/") : navigate("/ai");
            }}
          />
          <h1>
            {isMenu ? "오늘의 AI 훈련" : GAME_INFO[modeKey]?.title || "훈련 중"}
          </h1>
        </div>
      </header>

      <main className="flex-grow overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
