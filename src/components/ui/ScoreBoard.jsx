import React from "react";
import { cn } from "@/lib/utils";

export default function ScoreBoard({ total = 5, scores = [], className }) {
  return (
    <div
      className={cn(
        "bg-slate-50 p-3 rounded-2xl shadow-sm border border-slate-100",
        className,
      )}
    >
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: total }).map((_, i) => {
          const isCurrent = i === scores.length;
          const result = scores[i];
          const isPassed = result?.isPass;

          return (
            <div
              key={i}
              className={cn(
                "aspect-square rounded-full flex items-center justify-center text-xl font-black transition-all border-b-4",
                // 1. 현재 진행 중인 라운드
                isCurrent
                  ? "bg-blue-500 text-white animate-pulse border-blue-700"
                  : // 2. 결과가 있는 경우 (성공/실패)
                    result
                    ? isPassed
                      ? "bg-emerald-500 text-white border-emerald-700" // 성공 (초록)
                      : "bg-rose-500 text-white border-rose-700" // 실패 (빨강)
                    : // 3. 아직 도달하지 않은 라운드
                      "bg-white text-slate-300 border-slate-100",
              )}
            >
              {i + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
}
