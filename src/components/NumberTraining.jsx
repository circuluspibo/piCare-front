import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import Dialog from "@/components/Dialog";
import { cn } from "@/lib/utils";
import { fireInfoConfetti } from "@/components/magicui/connfetti";

const TOTAL_ROUNDS = 5;
const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const createGameData = () => {
  const shuffled = [...NUMBERS].sort(() => Math.random() - 0.5);
  const isUp = Math.random() > 0.5;
  return {
    grid: shuffled,
    isUp,
    currentTarget: isUp ? 1 : 9,
  };
};

export default function NumberTraining({ onComplete }) {
  const [gameData, setGameData] = useState(() => createGameData());
  const [scores, setScores] = useState([]);
  const [isFinish, setIsFinish] = useState(false);
  const [wrongIdx, setWrongIdx] = useState(null);
  const [correctIdx, setCorrectIdx] = useState(null); // 정답 효과용 추가
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
    []
  );

  const startNextRound = useCallback(() => {
    setGameData(createGameData());
    setWrongIdx(null);
    setCorrectIdx(null);
    setIsProcessing(false);
    startTimeRef.current = Date.now();
  }, []);

  const handleSelect = useCallback(
    (value, idx) => {
      if (isProcessing || isFinish || wrongIdx !== null || correctIdx !== null)
        return;

      const isCorrect = value === gameData.currentTarget;

      if (isCorrect) {
        setCorrectIdx(idx); // 정답 하이라이트 시작
        audio.pass.play().catch(() => {});

        setTimeout(() => {
          setCorrectIdx(null); // 하이라이트 종료
          const nextTarget = gameData.isUp
            ? gameData.currentTarget + 1
            : gameData.currentTarget - 1;

          if (
            (gameData.isUp && nextTarget > 9) ||
            (!gameData.isUp && nextTarget < 1)
          ) {
            setIsProcessing(true);
            const roundSpendTime =
              Date.now() - (startTimeRef.current || Date.now());
            const nextScores = [
              ...scores,
              { isPass: true, time: roundSpendTime },
            ];
            setScores(nextScores);

            if (nextScores.length >= TOTAL_ROUNDS) {
              setTotalElapsedTime(
                ((Date.now() - totalStartRef.current) / 1000).toFixed(0)
              );
              setTimeout(() => {
                setIsFinish(true);
                audio.complete.play().catch(() => {});
              }, 500);
            } else {
              setTimeout(startNextRound, 500);
            }
          } else {
            setGameData((prev) => ({ ...prev, currentTarget: nextTarget }));
          }
        }, 200); // 정답 색상을 보여줄 아주 짧은 대기시간
      } else {
        audio.fail.play().catch(() => {});
        setWrongIdx(idx);
        setTimeout(() => setWrongIdx(null), 400);
      }
    },
    [
      gameData,
      isFinish,
      isProcessing,
      scores,
      startNextRound,
      audio,
      wrongIdx,
      correctIdx,
    ]
  );

  const getFeedbackMsg = () => {
    const passCnt = scores.length;
    if (passCnt >= 8) return "정말 잘했어요!";
    if (passCnt >= 4) return "집중력이 대단해요!";
    return "천천히 다시 해봐요!";
  };
  useEffect(() => {
    if (totalStartRef.current === null) {
      totalStartRef.current = Date.now();
    }
    startTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (isFinish) fireInfoConfetti();
  }, [isFinish]);

  return (
    <div className="flex h-full w-full gap-6 bg-[#F8FAFC] font-extrabold text-[#2D3A5A] overflow-hidden">
      {/* 1. 좌측: 메인 숫자 패드 영역 (70%) */}
      <section className="flex-[7] h-full flex flex-col">
        <div className="flex-1 bg-white p-4 rounded-xl shadow-inner border grid grid-cols-3 gap-6">
          {gameData.grid.map((num, i) => (
            <button
              key={`${scores.length}-${num}`}
              onClick={() => handleSelect(num, i)}
              disabled={isProcessing}
              className={cn(
                "relative text-7xl font-black rounded-[32px] transition-all duration-100",
                "border-b-[12px] active:border-b-0 active:translate-y-[12px]", // 물리적인 눌림 효과
                "flex items-center justify-center",
                // 기본 상태
                "bg-gray-100 border-gray-300 text-gray-700 shadow-lg",
                // 정답 상태 (Green)
                correctIdx === i &&
                  "bg-green-500 border-green-700 text-white scale-95",
                // 오답 상태 (Red)
                wrongIdx === i &&
                  "bg-red-500 border-red-700 text-white animate-shake",
                isProcessing && "opacity-50"
              )}
            >
              {num}
            </button>
          ))}
        </div>
      </section>

      {/* 2. 우측: 정보 및 가이드 영역 (30%) */}
      <aside className="flex-[3] h-full flex flex-col gap-2">
        {/* 라운드 진행도 카드 */}
        <div className="bg-white p-2 rounded-xl shadow-inner border grid grid-cols-5 gap-1">
            {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-full aspect-square rounded-full flex items-center justify-center text-2xl transition-all",
                  i === scores.length
                    ? "bg-blue-500 text-white animate-pulse"
                    : scores[i]?.isPass
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-300"
                )}
              >
                {i + 1}
              </div>
            ))}
        </div>

        {/* 현재 타겟 숫자 안내 카드 (가장 시각적으로 강조됨) */}
        <div className="flex-1 bg-white rounded-xl shadow-md border flex flex-col items-center justify-center p-4 gap-4">
          <div className="flex flex-col items-center">
            <h3 className="text-3xl text-gray-400 mb-2">찾아야 할 숫자</h3>
            <div className="relative">
              <span className="text-7xl leading-none font-black text-blue-600 drop-shadow-md">
                {gameData.currentTarget}
              </span>
            </div>
          </div>
          <div
            className={cn(
              "w-full py-4 px-2 rounded-xl text-center",
              gameData.isUp ? "bg-orange-50" : "bg-purple-50"
            )}
          >
            <p className="text-2xl break-keep leading-snug">
              {gameData.isUp ? (
                <>
                  <strong>1</strong>부터 커지는 순서로
                </>
              ) : (
                <>
                  <strong>9</strong>부터 작아지는 순서로
                </>
              )}
              <br />
              누르세요!
            </p>
          </div>
        </div>
      </aside>

      {/* 결과 다이얼로그 (일관된 스타일) */}
      <Dialog
        isOpen={isFinish}
        onClose={onComplete}
        title="훈련 결과"
        titleStyle="text-5xl font-bold mb-2"
      >
        <div className="text-center p-4 flex flex-col items-center gap-4">
          <h2 className="text-5xl font-black mb-10 break-keep leading-snug text-[#2D3A5A]">
            {getFeedbackMsg()}
          </h2>

          <div className="flex flex-row items-center gap-6 text-center">
            <div>
              <p className="text-gray-400 font-bold text-2xl">성공 횟수</p>
              <p className="text-6xl font-black text-green-600">
                {scores.length}회
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
            className="w-full py-2 bg-[#2D3A5A] text-white text-4xl font-black rounded-2xl shadow-2xl hover:bg-[#1a233a] active:scale-95 transition-all"
          >
            확인
          </button>
        </div>
      </Dialog>
    </div>
  );
}
