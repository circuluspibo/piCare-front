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

      <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-8 w-full max-w-6xl px-6">
        {Object.entries(gameInfo).map(([key, info]) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={cn(
              // 고정 너비와 유동 너비의 조화 (최소 280px, 최대 420px)
              "group relative flex flex-col items-center justify-center p-4 rounded-3xl transition-all duration-300 shadow-xl hover:shadow-2xl active:scale-95 border-4",
              info.idx === 0
                ? "bg-amber-50 border-amber-200 hover:bg-amber-500"
                : info.idx === 1
                ? "bg-sky-50 border-sky-200 hover:bg-sky-500"
                : "bg-lime-50 border-lime-200 hover:bg-lime-500"
            )}
          >
            <img
              className="object-fit mb-2 max-w-40 h-40" // 이미지 크기 및 비율 최적화
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
