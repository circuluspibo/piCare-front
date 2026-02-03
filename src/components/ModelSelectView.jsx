import {
  AI_OPTIONS,
  EXERCISE_OPTIONS,
  TRAINING_OPTIONS,
} from "@/assets/data/selectOptions";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";

export default function ModeSelectView() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const outletContext = useOutletContext();
  const actions = outletContext?.actions;

  const config = useMemo(() => {
    switch (pathname) {
      case "/exercise":
        return {
          title: "어떤 신체훈련을 시작할까요?",
          options: EXERCISE_OPTIONS,
        };
      case "/ai":
        return { title: "어떤 AI 훈련을 시작해볼까요?", options: AI_OPTIONS };

      case "/training":
        return {
          title: "어떤 인지 훈련을 시작할까요?",
          options: TRAINING_OPTIONS,
        };
      default:
        return null;
    }
  }, [pathname]);

  // 버튼 클릭 핸들러
  const handleOptionClick = (info) => {
    // 1. 해당 게임 경로로 이동 (예: /exercise/flag)
    navigate(`${pathname}/${info.value}`);

    // 2. 엔진이 존재하고, 훈련 모드(/exercise)인 경우에만 카운트다운 트리거
    if (actions && pathname === "/exercise") {
      actions.runCountdown();
    }
  };

  if (!config) {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
      <div className="mb-10 text-center">
        <h2 className="text-6xl font-black text-slate-900">{config.title}</h2>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-8 w-full max-w-6xl px-6">
        {Object.entries(config.options).map(([key, info]) => (
          <button
            key={key}
            onClick={() => handleOptionClick(info)}
            className={cn(
              // 고정 너비와 유동 너비의 조화 (최소 280px, 최대 420px)
              "group relative flex flex-col items-center justify-center p-4 rounded-3xl transition-all duration-300 shadow-xl hover:shadow-2xl active:scale-95 border-4",
              info.idx === 0
                ? "bg-amber-50 border-amber-200 hover:bg-amber-500"
                : info.idx === 1
                  ? "bg-sky-50 border-sky-200 hover:bg-sky-500"
                  : "bg-lime-50 border-lime-200 hover:bg-lime-500",
            )}
          >
            <img
              className="object-fit mb-2 max-w-36 h-36" // 이미지 크기 및 비율 최적화
              alt={info.title}
              src={`/images/${info.value}.png`}
            />
            <span
              className={cn(
                "text-5xl font-black transition-colors duration-300 break-keep leading-tight",
                info.idx === 0
                  ? "text-amber-700 group-hover:text-white"
                  : info.idx === 1
                    ? "text-sky-700 group-hover:text-white"
                    : "text-lime-700 group-hover:text-white",
              )}
            >
              {info.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
