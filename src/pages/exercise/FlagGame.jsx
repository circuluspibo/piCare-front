import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom"; // context 추가

export default function FlagGame() {
  // 부모 Layout이 쏜 state를 직접 구독합니다.
  const { state } = useOutletContext();
  const { target, lastResult } = state;
  const audioRef = useRef(null);

  const BASE_IMAGE_PATH = "/images/exercise";

  const getBgClass = (side) => {
    // 아무 결과가 없을 때 (초기 상태)
    if (lastResult.target === null) return "bg-white border-gray-100 shadow-md";

    const isTarget = side === lastResult.target;

    // 정답을 맞혔을 때
    if (lastResult.isPass) {
      return isTarget
        ? "bg-green-100 border-green-500 shadow-md scale-[1.03] z-10"
        : "bg-white opacity-20 border-transparent";
    }

    // 틀렸을 때 (또는 타임아웃)
    return !isTarget
      ? "bg-red-100 border-red-500 shadow-md scale-[1.03] z-10"
      : "bg-white opacity-20 border-transparent";
  };

  useEffect(() => {
    const audioPath = "/sound/exercise.mp3";
    if (audioPath) {
      audioRef.current = new Audio(audioPath);
      audioRef.current.play().catch((error) => {
        console.log("[FAILED] playing exercise music", error);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []);
  return (
    <div className="w-full h-full flex gap-4">
      {["right", "left"].map((side) => (
        <div
          key={side}
          className={cn(
            "w-1/2 h-full rounded-3xl border-[5px] flex flex-col items-center justify-center transition-all duration-300 overflow-hidden",
            getBgClass(side),
          )}
        >
          <img
            className="w-[85%] object-contain aspect-sqare"
            src={`${BASE_IMAGE_PATH}/flag/${
              side !== target ? "shrug" : side === "left" ? "right" : "left"
            }.png`}
            alt={side}
          />
        </div>
      ))}
    </div>
  );
}
