import {
  AI_OPTIONS,
  EXERCISE_OPTIONS,
  TRAINING_OPTIONS,
} from "@/assets/data/selectOptions";
import { cn } from "@/lib/utils";
import { ArrowBigLeft } from "lucide-react";
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
    <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 justify-between gap-4 py-2">
      {/* 1. 상단 헤더 섹션: 배경색과 테두리를 주어 하나의 '바'처럼 인식시킵니다. */}
      <div className="w-full bg-slate-50 border-2 border-slate-100 border-b-[8px] rounded-2xl p-6 flex items-center justify-between shadow-sm">
        {/* 타이틀: 앞에 아이콘 하나만 둬도 훨씬 풍성해집니다. */}
        <div className="flex items-center gap-4">
          <span className="text-5xl">🎯</span>
          <h2 className="text-5xl font-black text-slate-900 tracking-tight">
            {config.title}
          </h2>
        </div>

        {/* 뒤로가기 버튼: 이제 이 버튼은 상단 바의 일부가 되어 이질감이 줄어듭니다. */}
        <button
          onClick={() => navigate("/")}
          className={cn(
            "bg-white rounded-2xl border-2 border-slate-200 border-b-[6px]", // 좀 더 확실한 입체감
            "flex items-center gap-2 px-8 py-3",
            "active:translate-y-1 active:border-b-[2px] transition-all group shadow-md",
          )}
        >
          <ArrowBigLeft
            className="size-12 text-blue-500 transition-transform"
            fill="currentColor"
          />
          <span className="text-3xl font-black text-slate-700">뒤로가기</span>
        </button>
      </div>

      <div className="w-full h-full grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-8 px-6 max-h-[360px]">
        {Object.entries(config.options).map(([key, info]) => (
          <button
            key={key}
            onClick={() => handleOptionClick(info)}
            className={cn(
              // 고정 너비와 유동 너비의 조화 (최소 280px, 최대 420px)
              "group relative flex flex-col items-center justify-center p-4 rounded-3xl transition-all duration-300 shadow-xl active:scale-95 border-4",
              info.idx === 0
                ? "bg-amber-50 border-amber-200"
                : info.idx === 1
                  ? "bg-sky-50 border-sky-200"
                  : "bg-lime-50 border-lime-200",
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
                  ? "text-amber-700"
                  : info.idx === 1
                    ? "text-sky-700"
                    : "text-lime-700",
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
