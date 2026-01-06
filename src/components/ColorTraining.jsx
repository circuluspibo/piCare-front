import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import Dialog from "./Dialog";
import { fireInfoConfetti } from "./magicui/connfetti";

const COLORS = [
  "#79aad9",
  "#ee789d",
  "#a987d1",
  "#e4a6c7",
  "#f1d86f",
  "#d2c0a0",
  "#f5a35c",
  "#c47c6c",
  "#ff7e62",
  "#6dccb1",
];
const TOTAL_ROUNDS = 10;

const createGameData = () => {
  const newGrid = Array.from(
    { length: 9 },
    () => COLORS[Math.floor(Math.random() * COLORS.length)]
  );
  const counts = {};
  let maxCount = 0;
  let target = newGrid[0];
  newGrid.forEach((c) => {
    counts[c] = (counts[c] || 0) + 1;
    if (counts[c] > maxCount) {
      maxCount = counts[c];
      target = c;
    }
  });
  return { grid: newGrid, target };
};

export default function ColorTraining({ onComplete }) {
  const [gameData, setGameData] = useState(() => createGameData());
  const [scores, setScores] = useState([]);
  const [isFinish, setIsFinish] = useState(false);
  const [wrongIdx, setWrongIdx] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);

  const startTimeRef = useRef(null);
  const totalStartRef = useRef(Date.now());

  const audio = useMemo(
    () => ({
      pass: new Audio("/sound/pass.mp3"),
      fail: new Audio("/sound/fail.mp3"),
      complete: new Audio("/sound/complete.mp3"),
    }),
    []
  );

  // 라운드 전환 로직 (종료 판단 제외)
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

      // [핵심 수정] 새로운 스코어 배열을 직접 생성하여 즉시 판단
      const nextScores = [
        ...scores,
        { isPass: isCorrect, time: roundSpendTime },
      ];
      setScores(nextScores);

      if (nextScores.length >= TOTAL_ROUNDS) {
        // 10회 완료 시 즉시 종료 처리
        const duration = ((Date.now() - totalStartRef.current) / 1000).toFixed(
          0
        );
        setTotalElapsedTime(duration);

        // 약간의 지연 후 결과 팝업 (정답/오답 확인 시간)
        setTimeout(() => {
          setIsFinish(true);
          audio.complete.play().catch(() => {});
        }, 800);
      } else {
        // 다음 라운드 이동
        setTimeout(startNextRound, 800);
      }
    },
    [gameData.target, isFinish, isProcessing, scores, startNextRound, audio]
  ); // scores 의존성 추가

  useEffect(() => {
    startTimeRef.current = Date.now();
    totalStartRef.current = Date.now();
  }, []);
  useEffect(() => {
    if (isFinish) {
      fireInfoConfetti();
    }
  }, [isFinish]);
  return (
    <div className="flex h-full gap-6 animate-in fade-in duration-500 font-extrabold p-3">
      {/* LEFT: Game Grid */}
      <section className="w-2/3 h-full">
        <div className="h-full bg-white rounded-3xl p-2 grid grid-cols-3 gap-2 border place-items-center">
          {gameData.grid.map((color, i) => (
            <button
              key={`${scores.length}-${i}`}
              onClick={() => handleSelect(color, i)}
              style={{ backgroundColor: color }}
              disabled={isProcessing}
              className={cn(
                "w-32 h-32 border-4 border-white shadow-lg rounded-3xl transition-all",
                "active:scale-95",
                wrongIdx === i &&
                  "animate-shake border-red-500 ring-[10px] ring-red-50",
                isProcessing && "pointer-events-none opacity-80"
              )}
            />
          ))}
        </div>
      </section>

      {/* RIGHT: Status & Target */}
      <aside className="w-1/3 flex flex-col space-y-2">
        <div className="bg-white p-4 rounded-xl shadow-inner border grid grid-cols-5 gap-2">
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-full aspect-square rounded-full flex items-center justify-center text-2xl font-black transition-all",
                i === scores.length
                  ? "bg-blue-500 text-white animate-pulse"
                  : scores[i]?.isPass
                  ? "bg-green-500 text-white"
                  : scores[i]
                  ? "bg-red-400 text-white"
                  : "bg-gray-100 text-gray-300"
              )}
            >
              {i + 1}
            </div>
          ))}
        </div>

        <div className="flex-1 flex flex-col rounded-xl bg-white shadow-inner border items-center justify-center gap-4">
          <div
            className="w-36 h-36 rounded-3xl border-8 border-slate-50 shadow-2xl"
            style={{ backgroundColor: gameData.target }}
          />
          <h2 className="text-4xl font-black leading-tight text-slate-800 text-center">
            <span className="text-blue-600 underline underline-offset-8">
              같은 색
            </span>
            을<br />
            찾아주세요
          </h2>
        </div>
      </aside>
      <Dialog
        isOpen={isFinish}
        onClose={onComplete}
        title="훈련 종료"
        titleStyle="text-5xl font-bold mb-2"
      >
        <div className="text-center p-6 flex flex-col items-center gap-6">
          <h2 className="text-6xl font-black mb-10">정말 잘하셨어요!</h2>
          <div className="flex flex-row items-center gap-6 text-center">
            <div>
              <p className="text-gray-400 font-bold text-2xl">성공 횟수</p>
              <p className="text-6xl font-black text-green-600">
                {scores.filter((s) => s.isPass).length}개
              </p>
            </div>
            <div>
              <p className="text-gray-400 font-bold text-2xl">소요 시간</p>
              <p className="text-6xl font-black text-blue-600">
                {totalElapsedTime}초
              </p>
            </div>
          </div>
          <button
            onClick={onComplete}
            className="w-full py-4 bg-[#2D3A5A] text-white text-4xl font-black rounded-2xl shadow-2xl hover:bg-[#1a233a] active:scale-95 transition-all"
          >
            확인
          </button>
        </div>
      </Dialog>
    </div>
  );
}
