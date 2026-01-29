import { cn } from "@/lib/utils";
import { useOutletContext } from "react-router-dom";

export default function GrabGame() {
  // 엔진 상태 구독
  const { state } = useOutletContext();
  const { target, lastResult, totalScores } = state;
  const currentCount = totalScores.length; // 시도 횟수를 인덱스로 활용

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
    if (lastResult.target === null) return "bg-white border-gray-100 shadow-sm";
    const isTarget = side === lastResult.target;
    if (lastResult.isPass)
      return isTarget
        ? "bg-green-100 border-green-500 shadow-2xl scale-[1.03]"
        : "bg-white opacity-20";
    return !isTarget
      ? "bg-red-100 border-red-500 shadow-2xl scale-[1.03]"
      : "bg-white opacity-20";
  };

  return (
    <div className="w-full h-full flex gap-4 p-4">
      {["right", "left"].map((side) => (
        <div
          key={side}
          className={cn(
            "w-1/2 h-full rounded-2xl border-[5px] flex flex-col items-center justify-center transition-all duration-300",
            getBgClass(side),
          )}
        >
          <img
            className="w-3/4 object-contain"
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
