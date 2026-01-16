import React, { useCallback, useState } from "react";
import { ArrowBigLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ModeSelectView from "@/components/ModelSelectView";
import DrawByVoice from "@/components/ai/DrawByVoice";
import MagicMirror from "@/components/ai/MagicMirror";
import VoiceReplication from "@/components/ai/VoiceReplication";

const DRAWING_MODES = {
  DRAW: {
    title: "말하는대로 그리기",
    value: "draw",
    idx: 0,
  },
  MIRROR: {
    title: "젊어지는 거울",
    value: "mirror",
    idx: 1,
  },
  VOICE: {
    title: "AI 음성 재현",
    value: "voice",
    idx: 2,
  },
};

export default function DrawPage() {
  const navigate = useNavigate();
  const [drawMode, setDrawMode] = useState(null);

  const resetToMenu = useCallback(() => {
    setDrawMode(null);
  }, []);
  return (
    <div className="flex flex-col w-full h-full p-4 bg-[#f8f5f0] overflow-hidden font-extrabold text-[#2D3A5A]">
      <header className="flex flex-col items-start pb-4 border-b border-stone-200 mb-4">
        <div
          className="flex items-center text-4xl font-black"
          onClick={resetToMenu}
        >
          <ArrowBigLeft
            className="size-14 mr-2 cursor-pointer hover:scale-110 transition-transform"
            onClick={(e) => {
              if (!drawMode) {
                e.stopPropagation();
                navigate("/");
              }
            }}
          />
          <h1 className="text-4xl tracking-tight font-black">
            {drawMode ? DRAWING_MODES[drawMode].title : "AI 생성 선택"}
          </h1>
        </div>
      </header>

      <main className="flex-grow overflow-hidden">
        {drawMode ? (
          <div className="w-full h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {drawMode === "DRAW" && <DrawByVoice />}
            {drawMode === "MIRROR" && <MagicMirror />}
            {drawMode === "VOICE" && <VoiceReplication />}
          </div>
        ) : (
          <ModeSelectView
            title="어떤 그림을 그릴까요?"
            gameInfo={DRAWING_MODES}
            onSelect={(key) => setDrawMode(key)}
          />
        )}
      </main>
    </div>
  );
}
