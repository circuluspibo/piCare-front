import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowBigLeft } from "lucide-react";

import ColorTraining from "@/components/training/ColorTraining";
import NumberTraining from "@/components/training/NumberTraining";
import PianoTraining from "@/components/training/PianoTraining";
import ModeSelectView from "@/components/ModelSelectView";

const TRAINING_MODES = {
  COLOR: {
    title: "색상 찾기",
    value: "color",
    idx: 0,
  },
  NUMBER: {
    title: "숫자 훈련",
    value: "number",
    idx: 1,
  },
  PIANO: {
    title: "소리 훈련",
    value: "piano",
    idx: 2,
  },
};

export default function TrainingPage() {
  const navigate = useNavigate();
  const [gameMode, setGameMode] = useState(null);

  const resetToMenu = useCallback(() => {
    setGameMode(null);
  }, []);

  return (
    <div className="flex flex-col w-full h-full p-6 bg-slate-50 overflow-hidden font-extrabold text-[#2D3A5A]">
      {/* 헤더 */}
      <header className="flex items-center pb-4 border-b-2 border-slate-200 mb-6">
        <div
          className="flex items-center cursor-pointer hover:opacity-70 transition-opacity"
          onClick={resetToMenu}
        >
          <ArrowBigLeft
            className="size-14 mr-2"
            onClick={(e) => {
              if (!gameMode) {
                e.stopPropagation();
                navigate("/");
              }
            }}
          />
          <h1 className="text-4xl tracking-tight font-black">
            {gameMode ? TRAINING_MODES[gameMode].title : "인지 훈련 선택"}
          </h1>
        </div>
      </header>

      {/* 메인 영역 */}
      <main className="flex-1 overflow-hidden relative">
        {gameMode ? (
          <div className="w-full h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {gameMode === "COLOR" && <ColorTraining onComplete={resetToMenu} />}
            {gameMode === "NUMBER" && (
              <NumberTraining onComplete={resetToMenu} />
            )}
            {gameMode === "PIANO" && <PianoTraining onComplete={resetToMenu} />}
          </div>
        ) : (
          <ModeSelectView
            title="어떤 훈련을 시작할까요?"
            gameInfo={TRAINING_MODES}
            onSelect={(key) => setGameMode(key)}
          />
        )}
      </main>
    </div>
  );
}
