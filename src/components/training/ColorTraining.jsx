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

const COLORS = [
  // 1. 따뜻한 계열 (서로 다른 3종)
  "#E57373", // [부드러운 레드] 토마토색
  "#FFB74D", // [부드러운 오렌지] 귤색
  "#FFF176", // [부드러운 노랑] 바나나색

  // 2. 초록 계열 (서로 다른 3종)
  "#81C784", // [부드러운 초록] 숲색
  "#DCE775", // [부드러운 연두] 라임색
  "#4DB6AC", // [부드러운 청록] 민트바다색

  // 3. 파랑/보라 계열 (서로 다른 3종)
  "#64B5F6", // [부드러운 파랑] 맑은 하늘색
  "#7986CB", // [부드러운 남색] 제비꽃색
  "#BA68C8", // [부드러운 보라] 라벤더색

  // 4. 무채색/대비 계열 (서로 다른 3종)
  "#A1887F", // [부드러운 갈색] 커피색
  "#90A4AE", // [부드러운 회색] 바다회색
  "#455A64", // [짙은 먹색] 깊은 밤색
];

const TOTAL_ROUNDS = 10;

const createGameData = () => {
  // 2. 색상 중복 방지 로직: 셔플 후 앞에서 9개 선택
  const shuffled = [...COLORS].sort(() => Math.random() - 0.5);
  const newGrid = shuffled.slice(0, 9);

  // 9개 중 무작위로 하나를 타겟으로 지정 (중복 없음)
  const target = newGrid[Math.floor(Math.random() * 9)];

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
  const totalStartRef = useRef(null);

  const audio = useMemo(
    () => ({
      pass: new Audio("/sound/pass.mp3"),
      fail: new Audio("/sound/fail.mp3"),
      complete: new Audio("/sound/complete.mp3"),
    }),
    [],
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
          0,
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
    [gameData.target, isFinish, isProcessing, scores, startNextRound, audio],
  ); // scores 의존성 추가

  const getFeedbackMsg = () => {
    const passCnt = scores.filter((s) => s.isPass).length;
    if (passCnt >= 8) return "꽃사슴 같은 눈썰미네요!";
    if (passCnt >= 4) return "색깔을 정말 잘 구별하세요!";
    return "차근차근 다시 해봐요!";
  };

  useEffect(() => {
    startTimeRef.current = Date.now();
    if (totalStartRef.current === null) {
      totalStartRef.current = Date.now();
    }
  }, []);

  useEffect(() => {
    if (isFinish) {
      fireInfoConfetti();
    }
  }, [isFinish]);
  return (
    <div className="flex h-full gap-6 animate-in fade-in duration-500 font-extrabold">
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
                "w-28 h-28 border-4 border-white shadow-lg rounded-3xl transition-all",
                "active:scale-95",
                wrongIdx === i &&
                  "animate-shake border-red-500 ring-[10px] ring-red-50",
                isProcessing && "pointer-events-none opacity-80",
              )}
            />
          ))}
        </div>
      </section>

      {/* RIGHT: Status & Target */}
      <aside className="w-1/3 flex flex-col space-y-2">
        <div className="bg-white p-2 rounded-xl shadow-inner border grid grid-cols-5 gap-1">
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
                      : "bg-gray-100 text-gray-300",
              )}
            >
              {i + 1}
            </div>
          ))}
        </div>

        <div className="flex-1 flex flex-col rounded-xl bg-white shadow-inner border items-center justify-center gap-2 p-4">
          <div
            className="w-28 h-28 rounded-3xl border-8 border-slate-50 shadow-2xl"
            style={{ backgroundColor: gameData.target }}
          />
          <h2 className="text-3xl font-black leading-relaxed text-slate-800 text-center">
            <span className="text-blue-600 underline underline-offset-8">
              같은 색
            </span>
            을<br />
            찾아주세요
          </h2>
        </div>
      </aside>
      <Dialog isOpen={isFinish} onClose={onComplete} title="훈련 종료">
        <div className="text-center flex flex-col items-center gap-3">
          <h2 className="text-5xl font-black mb-10 break-keep leading-snug text-[#2D3A5A]">
            {getFeedbackMsg()}
          </h2>
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
            className="w-[80%] py-4 bg-[#2D3A5A] text-white text-4xl font-black rounded-2xl hover:bg-slate-800 transition-all shadow-xl"
          >
            확인
          </button>
        </div>
      </Dialog>
    </div>
  );
}
