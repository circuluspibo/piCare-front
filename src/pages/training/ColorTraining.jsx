import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { cn } from "@/lib/utils";
import Dialog from "@/components/Dialog";
import { fireInfoConfetti } from "@/components/magicui/connfetti";
import { IconRenderer } from "@/components/ui/IconRenderer";
import { useOutletContext } from "react-router-dom";

const COLORS = [
  "#D32F2F",
  "#F57C00",
  "#FBC02D",
  "#388E3C",
  "#1976D2",
  "#7B1FA2",
  "#C2185B",
  "#00796B",
  "#5D4037",
  "#000000",
  "#263238",
  "#E64A19",
];

const TOTAL_ROUNDS = 10;

const createGameData = () => {
  const shuffled = [...COLORS].sort(() => Math.random() - 0.5);
  const newGrid = shuffled.slice(0, 9);
  const target = newGrid[Math.floor(Math.random() * 9)];
  return { grid: newGrid, target };
};

export default function ColorTraining() {
  const { onComplete } = useOutletContext();
  const [gameData, setGameData] = useState(() => createGameData());
  const [scores, setScores] = useState([]);
  const [isFinish, setIsFinish] = useState(false);
  const [wrongIdx, setWrongIdx] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);

  const startTimeRef = useRef(null);
  const totalStartRef = useRef(null);

  const audio = useMemo(
    () => ({
      pass: new Audio("/sound/pass.mp3"),
      fail: new Audio("/sound/fail.mp3"),
      complete: new Audio("/sound/complete.mp3"),
    }),
    [],
  );

  // [중요] 여기에서 메시지를 생성합니다.
  const getFeedbackMsg = () => {
    const passCnt = scores.filter((s) => s.isPass).length;
    if (passCnt >= 8) return "꽃사슴 같은 눈썰미네요!";
    if (passCnt >= 4) return "색깔을 정말 잘 구별하세요!";
    return "차근차근 다시 해봐요!";
  };

  const startNextRound = useCallback(() => {
    setGameData(createGameData());
    setWrongIdx(null);
    setIsProcessing(false);
    startTimeRef.current = Date.now();
  }, []);

  const handleSelect = useCallback(
    (selectedColor, idx) => {
      if (isProcessing || isFinish) return;
      setIsProcessing(true);
      const isCorrect = selectedColor === gameData.target;
      const roundSpendTime = Date.now() - (startTimeRef.current || Date.now());

      if (isCorrect) audio.pass.play().catch(() => {});
      else {
        audio.fail.play().catch(() => {});
        if (idx !== null) setWrongIdx(idx);
      }

      const nextScores = [
        ...scores,
        { isPass: isCorrect, time: roundSpendTime },
      ];
      setScores(nextScores);

      if (nextScores.length >= TOTAL_ROUNDS) {
        const duration = ((Date.now() - totalStartRef.current) / 1000).toFixed(
          0,
        );
        setTotalElapsedTime(duration);
        setTimeout(() => {
          setIsFinish(true);
          audio.complete.play().catch(() => {});
        }, 800);
      } else {
        setTimeout(startNextRound, 800);
      }
    },
    [gameData.target, isFinish, isProcessing, scores, startNextRound, audio],
  );

  useEffect(() => {
    startTimeRef.current = Date.now();
    if (totalStartRef.current === null) totalStartRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (isFinish) fireInfoConfetti();
  }, [isFinish]);

  return (
    <div className="flex h-full gap-4 animate-in fade-in duration-500 font-extrabold p-2 bg-white">
      {/* LEFT: 텍스처 팔레트 영역 */}
      <section className="w-2/3 flex-1 flex items-center justify-center relative overflow-hidden">
        <div className="relative w-full h-full bg-orange-100 rounded-[180px_250px_140px_300px] rotate-2 flex items-center justify-center">
          <div className="absolute top-14 left-16 w-16 h-20 rotate-[30deg] bg-white rounded-full shadow-[inset_4px_4px_10px_rgba(0,0,0,0.1)]" />
          <div className="relative w-full h-full">
            {gameData.grid.map((color, i) => {
              const angle = (i * (360 / 9) - 10) * (Math.PI / 180);
              const rx = 195;
              const ry = 135;
              const x = Math.cos(angle) * rx;
              const y = Math.sin(angle) * ry;

              return (
                <button
                  key={`${scores.length}-${i}`}
                  onClick={() => handleSelect(color, i)}
                  style={{
                    backgroundColor: color,
                    left: `calc(50% + ${x}px - 45px)`,
                    top: `calc(50% + ${y}px - 45px)`,
                    borderRadius: `${60 + (i % 3) * 10}% ${40 + (i % 2) * 20}% ${50 + (i % 4) * 10}% ${55 + (i % 2) * 15}%`,
                  }}
                  disabled={isProcessing}
                  className={cn(
                    "absolute w-[90px] h-[90px] transition-all duration-300 border-none shadow-[4px_8px_15px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(0,0,0,0.2)]",
                    "hover:scale-110 active:scale-95 before:absolute before:top-3 before:left-4 before:w-7 before:h-4 before:bg-white/30 before:rounded-full before:blur-[1px]",
                    wrongIdx === i &&
                      "animate-shake ring-[10px] ring-rose-200/50",
                    isProcessing && "opacity-90 pointer-events-none",
                  )}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* RIGHT: 정보창 */}
      <aside className="w-1/3 flex flex-col gap-4">
        <div className="bg-slate-50 p-3 rounded-2xl shadow-sm grid grid-cols-5 gap-2">
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "aspect-square rounded-full flex items-center justify-center text-xl transition-all border-b-4",
                i === scores.length
                  ? "bg-blue-500 text-white animate-pulse border-blue-700"
                  : scores[i]?.isPass
                    ? "bg-emerald-500 text-white border-emerald-700"
                    : scores[i]
                      ? "bg-rose-500 text-white border-rose-700"
                      : "bg-white text-slate-300 border-slate-100",
              )}
            >
              {i + 1}
            </div>
          ))}
        </div>
        <div className="flex-1 flex flex-col rounded-2xl bg-slate-50 items-center justify-center gap-6 p-6 shadow-inner">
          <div
            className="w-32 h-32 shadow-2xl"
            style={{
              backgroundColor: gameData.target,
              borderRadius: "40% 60% 70% 30% / 40% 50% 60% 70%",
            }}
          />
          <h2 className="text-4xl font-black text-slate-800 text-center break-keep">
            같은 <span className="text-blue-600">물감 색</span>을 찾아보세요
          </h2>
        </div>
      </aside>

      {/* 결과 다이얼로그에서 getFeedbackMsg() 호출 */}
      <Dialog isOpen={isFinish} onClose={onComplete} title="훈련 종료">
        <div className="text-center flex flex-col items-center gap-4">
          <h2 className="text-5xl font-black mb-8 text-slate-900 leading-tight">
            {getFeedbackMsg()}
          </h2>
          <div className="flex w-full gap-4 mb-6">
            <div className="flex-1 bg-emerald-50 p-6 rounded-3xl">
              <p className="text-emerald-600 font-bold text-xl mb-1">성공</p>
              <p className="text-6xl font-black text-emerald-700">
                {scores.filter((s) => s.isPass).length}
              </p>
            </div>
            <div className="flex-1 bg-blue-50 p-6 rounded-3xl">
              <p className="text-blue-600 font-bold text-xl mb-1">시간</p>
              <p className="text-6xl font-black text-blue-700">
                {totalElapsedTime}초
              </p>
            </div>
          </div>
          <button
            onClick={onComplete}
            className="w-full py-6 bg-slate-900 text-white text-4xl font-black rounded-3xl hover:bg-black shadow-xl"
          >
            확인
          </button>
        </div>
      </Dialog>
    </div>
  );
}
