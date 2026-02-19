import React from "react";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowBigLeft } from "lucide-react";

export default function ScoreBoard({ total = 5, scores = [], className }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pathParts = pathname.split("/").filter(Boolean);
  const previous = pathParts[0];
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* 1. 뒤로가기 버튼 (추가된 스타일) */}
      <button
        onClick={() => navigate(`/${previous}`)}
        className={cn(
          "w-full bg-slate-50 rounded-2xl",
          "flex items-center justify-center py-3 shadow-md",
          "active:translate-y-1 active:border-b-[2px] transition-all group",
        )}
      >
        <ArrowBigLeft
          className="size-12 text-blue-500 transition-transform"
          fill="currentColor"
        />
        <span className="text-3xl font-black text-slate-700 ml-2">
          뒤로가기
        </span>
      </button>

      {/* 2. 기존 점수판 스타일 (그대로 보존) */}
      <div
        className={cn(
          "bg-slate-50 p-3 rounded-2xl shadow-sm border border-slate-100",
          // className은 전체 컨테이너에 적용했으므로 여기서는 생략하거나 필요시 유지
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
    </div>
  );
}
