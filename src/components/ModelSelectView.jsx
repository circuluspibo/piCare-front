import { cn } from "@/lib/utils";

export default function ModeSelectView({
  onSelect,
  gameInfo,
  title = "무엇을 시작할까요?",
}) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
      <div className="mb-10 text-center">
        <h2 className="text-6xl font-black text-[#2D3A5A]">{title}</h2>
      </div>

      <div className="flex flex-wrap justify-center items-center w-full min-h-[320px] px-6 gap-8">
        {Object.entries(gameInfo).map(([key, info]) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={cn(
              // 고정 너비와 유동 너비의 조화 (최소 280px, 최대 420px)
              "flex-1 min-w-[280px] max-w-[420px] min-h-[340px] group relative flex flex-col items-center justify-center px-6 rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl active:scale-95 border-4",
              info.idx === 0
                ? "bg-amber-50 border-amber-200 hover:bg-amber-500"
                : info.idx === 1
                ? "bg-sky-50 border-sky-200 hover:bg-sky-500"
                : "bg-lime-50 border-lime-200 hover:bg-lime-500"
            )}
          >
            <img
              className="w-48 h-48 object-contain mb-4" // 이미지 크기 및 비율 최적화
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
                  : "text-lime-700 group-hover:text-white"
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
