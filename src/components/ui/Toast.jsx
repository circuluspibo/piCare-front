import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { Circle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Toast(props) {
  const { title, description, type } = props;
  const audioRef = useRef(null);
  useEffect(() => {
    // confetti의 떨어지는 시간(지속 시간)은 직접적으로 옵션으로 제공되지 않지만,
    // gravity 값을 조정하여 떨어지는 속도를 조절할 수 있습니다.
    // gravity가 작을수록 천천히 떨어집니다. (기본값: 1)
    if (type === "info") {
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min, max) => Math.random() * (max - min) + min;

      const interval = window.setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);
    }
    if (type === "success") {
      confetti({
        gravity: 2.5, // gravity 값을 높이면 더 빨리 사라집니다.
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
  }, []);

  // 오디오 재생
  useEffect(() => {
    const audioMap = {
      success: "/sound/pass.mp3",
      error: "/sound/fail.mp3",
    };

    const audioPath = audioMap[type];

    if (audioPath) {
      audioRef.current = new Audio(audioPath);

      audioRef.current.play().catch((err) => {
        console.log(`[FAILED] playing ${type}`, err);
      });
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, [type]);
  return (
    <div
      className={cn(
        `flex items-center rounded-xl w-full md:w-[calc(100vw/3)] lg:w-[calc(100vw/4)] shadow-2xl`,
        type === "success"
          ? "bg-emerald-50 text-emerald-500"
          : "bg-rose-50 text-rose-500",
      )}
    >
      <div
        className={`flex gap-4 items-center p-4 w-full rounded-lg shadow-lg `}
      >
        {type === "success" && (
          <Circle className="w-10 h-10 font-extrabold" strokeWidth={2.75} />
        )}
        {type === "error" && <X className="w-10 h-10" strokeWidth={2.75} />}
        {type === "info" && (
          <p className="mr-2 w-10 h-10 text-5xl font-extrabold">🎊</p>
        )}
        <div className="flex flex-col flex-1">
          <p className="mb-1 text-2xl font-extrabold">{title}</p>
          {typeof description === "string" ? (
            <p className="ml-1 text-lg">{description}</p>
          ) : (
            description.map((item, index) => (
              <p key={index} className="text-lg font-semibold">
                {item}
              </p>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
