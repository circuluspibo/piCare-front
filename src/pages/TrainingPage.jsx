import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowBigLeft, Palette, Hash, Music } from "lucide-react";
import Dialog from "@/components/Dialog";

import { cn } from "@/lib/utils";
import ColorTraining from "@/components/ColorTraining";
import NumberTraining from "@/components/NumberTraining";
import PianoTraining from "@/components/PianoTraining";
// import NumberTraining from "./components/NumberTraining";
// import PianoTraining from "./components/PianoTraining";

const TRAINING_MODES = {
  COLOR: {
    title: "색상 찾기",
    color: "bg-blue-500",
  },
  NUMBER: {
    title: "숫자 훈련",
    color: "bg-green-500",
  },
  PIANO: {
    title: "소리 훈련",
    color: "bg-purple-500",
  },
};

export default function TrainingPage() {
  const navigate = useNavigate();
  const [gameMode, setGameMode] = useState(null); // 현재 선택된 모드
  const [showSelectModal, setShowSelectModal] = useState(true); // 모드 선택창 유무

  const handleModeSelect = (mode) => {
    setGameMode(mode);
    setShowSelectModal(false);
  };

  const resetToMenu = useCallback(() => {
    setGameMode(null);
    setShowSelectModal(true);
  }, []);

  return (
    <div className="flex flex-col w-full h-full p-6 bg-slate-50 overflow-hidden">
      {/* 헤더: 타이틀 클릭 시 메뉴로 복귀 */}
      <header className="flex items-center pb-4 border-b-2 border-slate-200 mb-6 font-extrabold text-[#2D3A5A]">
        <div
          className="flex items-center cursor-pointer hover:opacity-70 transition-opacity"
          onClick={resetToMenu}
        >
          <ArrowBigLeft
            className="size-14 mr-2"
            onClick={(e) => {
              e.stopPropagation();
              navigate("/");
            }}
          />
          <h1 className="text-4xl tracking-tight">
            {gameMode ? TRAINING_MODES[gameMode].title : "인지 훈련 선택"}
          </h1>
        </div>
      </header>

      {/* 메인 게임 영역 */}
      <main className="flex-1 overflow-hidden relative">
        {gameMode === "COLOR" && <ColorTraining onComplete={resetToMenu} />}
        {gameMode === "NUMBER" && <NumberTraining onComplete={resetToMenu} />}
        {/* 아직 구현되지 않은 모드들 */}
        {gameMode === "PIANO" && <PianoTraining onComplete={resetToMenu} />}

        {/* 선택 전 대기 화면 (배경) */}
        {!gameMode && (
          <div className="flex items-center justify-center h-full text-slate-300 text-2xl">
            왼쪽 상단의 메뉴를 눌러 훈련을 선택하거나 아래 버튼을 누르세요.
          </div>
        )}
      </main>

      {/* 훈련 선택 다이얼로그 (ExercisePage 스타일) */}
      <Dialog
        isOpen={showSelectModal}
        onClose={() => {}}
        title="인지 훈련을 선택해주세요"
        titleStyle="text-3xl font-bold mb-2"
      >
        <div className="flex flex-col gap-6 p-2">
          {Object.entries(TRAINING_MODES).map(([key, info]) => {
            return (
              <button
                key={key}
                onClick={() => handleModeSelect(key)}
                className={cn(
                  "bg-sky-100/80",
                  "border-sky-200",
                  "hover:bg-sky-200",
                  "group flex items-center justify-between p-4 rounded-3xl border-4 transition-all",
                  "active:scale-95"
                )}
              >
                <span
                  className={cn(
                    "text-5xl font-black",
                    "text-sky-800",
                    "w-full",
                    "text-center"
                  )}
                >
                  {info.title}
                </span>
              </button>
            );
          })}
        </div>

        <div className="py-4 flex justify-center">
          <button
            onClick={() => navigate("/")}
            className="px-10 text-4xl font-bold text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-8 decoration-slate-200"
          >
            나중에 할래요
          </button>
        </div>
      </Dialog>
    </div>
  );
}
