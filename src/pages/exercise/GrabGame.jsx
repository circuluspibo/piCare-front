import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";

export default function GrabGame() {
  // 엔진 상태 구독
  const { state } = useOutletContext();
  const { target, lastResult, totalScores } = state;
  const audioRef = useRef(null);

  const isShowingResult = lastResult.target !== null;
  const currentCount = isShowingResult
    ? totalScores.length - 1
    : totalScores.length;
  const BASE_IMAGE_PATH = "/images/exercise";
  const fruits = [
    "cherries",
    "grape",
    "kiwi",
    "orange",
    "peach",
    "pear",
    "strawberry",
  ];

  const getBgClass = (side) => {
    if (lastResult.target === null) return "bg-white border-gray-100 shadow-md";
    const isTarget = side === lastResult.target;
    if (lastResult.isPass)
      return isTarget
        ? "bg-green-100 border-green-500 shadow-md scale-[1.03]"
        : "bg-white opacity-20";
    return !isTarget
      ? "bg-red-100 border-red-500 shadow-md scale-[1.03]"
      : "bg-white opacity-20";
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
            "w-1/2 h-full rounded-2xl border-[5px] flex flex-col items-center justify-center transition-all duration-300",
            getBgClass(side),
          )}
        >
          <img
            className="w-[85%] object-contain aspect-sqare"
            src={`${BASE_IMAGE_PATH}/grab/${
              side === target ? "apple" : fruits[currentCount % fruits.length]
            }.png`}
            alt={side}
          />
        </div>
      ))}
    </div>
  );
}
