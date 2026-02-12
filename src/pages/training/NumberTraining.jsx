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
import { useOutletContext } from "react-router-dom";
import ScoreBoard from "@/components/ui/ScoreBoard";
import ResultDialog from "@/components/ResultDialog";

const TOTAL_ROUNDS = 5;
const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const createGameData = () => {
  const shuffled = [...NUMBERS].sort(() => Math.random() - 0.5);
  const isUp = Math.random() > 0.5;
  return { grid: shuffled, isUp };
};

export default function NumberTraining() {
  const { onComplete } = useOutletContext();
  const [gameData, setGameData] = useState(() => createGameData());
  const [userSequence, setUserSequence] = useState([]);
  const [scores, setScores] = useState([]);
  const [isFinish, setIsFinish] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);

  const totalStartRef = useRef(null);
  const audio = useMemo(
    () => ({
      pass: new Audio("/sound/pass.mp3"),
      fail: new Audio("/sound/fail.mp3"),
      complete: new Audio("/sound/complete.mp3"),
    }),
    [],
  );

  const startNextRound = useCallback(() => {
    setGameData(createGameData());
    setUserSequence([]);
    setIsEvaluating(false);
  }, []);

  const handleSelect = (idx) => {
    if (isEvaluating || userSequence.includes(idx)) return;
    const nextSeq = [...userSequence, idx];
    setUserSequence(nextSeq);

    if (nextSeq.length === 9) {
      setIsEvaluating(true);
      checkResult(nextSeq);
    }
  };

  const checkResult = (finalSeq) => {
    const resultNumbers = finalSeq.map((idx) => gameData.grid[idx]);
    const correctSeq = gameData.isUp
      ? [...NUMBERS].sort((a, b) => a - b)
      : [...NUMBERS].sort((a, b) => b - a);

    const isAllCorrect = resultNumbers.every((num, i) => num === correctSeq[i]);

    setTimeout(() => {
      if (isAllCorrect) audio.pass.play().catch(() => {});
      else audio.fail.play().catch(() => {});

      const nextScores = [...scores, { isPass: isAllCorrect }];
      setScores(nextScores);

      if (nextScores.length >= TOTAL_ROUNDS) {
        setTotalElapsedTime(
          ((Date.now() - totalStartRef.current) / 1000).toFixed(0),
        );
        setTimeout(() => {
          setIsFinish(true);
          audio.complete.play().catch(() => {});
        }, 800);
      } else {
        setTimeout(startNextRound, 1200);
      }
    }, 600);
  };

  const getFeedbackMsg = () => {
    const passCnt = scores.filter((s) => s.isPass).length;
    return passCnt >= 3 ? "집중력이 대단하세요!" : "조금만 더 힘내볼까요?";
  };

  useEffect(() => {
    if (totalStartRef.current === null) totalStartRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (isFinish) fireInfoConfetti();
  }, [isFinish]);

  return (
    <div className="flex w-full h-full gap-4 animate-in fade-in duration-500 font-extrabold p-3 bg-white">
      {/* 1. 좌측: 쿨톤 계산기 본체 (Piano 스타일 통일) */}
      <section className="flex-[2.8] flex flex-col items-stretch justify-center p-6 bg-slate-100 rounded-[40px] shadow-inner border-[8px] border-slate-200/50">
        {/* 대형 전광판: 시니어를 위한 큰 글씨와 충분한 공간 */}
        <div className="flex-[0.3] w-full bg-slate-800 mb-6 rounded-3xl shadow-2xl border-4 border-slate-700 flex items-center justify-center px-8 relative overflow-hidden">
          {/* 배경 격자 패턴 (계산기 느낌) */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[grid:20px_20px_white]" />
          <span
            className={cn(
              "font-mono text-emerald-400 tracking-[0.75rem] transition-all duration-300",
              userSequence.length > 7 ? "text-5xl" : "text-6xl",
            )}
          >
            {userSequence.map((idx) => gameData.grid[idx]).join("")}
            {userSequence.length < 9 && (
              <span className="animate-pulse text-slate-500">_</span>
            )}
          </span>
        </div>

        {/* 숫자 버튼 그리드 */}
        <div className="flex-1 grid grid-cols-3 gap-4">
          {gameData.grid.map((num, i) => {
            const isSelected = userSequence.includes(i);
            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                className={cn(
                  "relative text-5xl font-black transition-all duration-100 flex items-center justify-center",
                  "rounded-[28px] border-b-[10px] shadow-lg",
                  isSelected
                    ? "bg-slate-300 border-slate-400 translate-y-2 border-b-0 text-slate-100 shadow-none"
                    : "bg-white border-slate-200 text-slate-700 active:translate-y-1 active:border-b-[4px]",
                  isEvaluating && "pointer-events-none opacity-50",
                )}
              >
                {num}
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. 우측: 정보 및 가이드 영역 (aside) */}
      <aside className="flex-1 flex flex-col gap-2">
        {/* SECTION: 진행판 */}
        <ScoreBoard total={5} scores={scores} />
        {/* 미션 안내 카드 (Color/Piano 레이아웃 통일) */}
        <div className="flex-1 flex flex-col rounded-[40px] bg-slate-50 items-center justify-center gap-2 p-2 shadow-inner border border-slate-100">
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl font-bold text-slate-400 uppercase tracking-tighter">
              입력 가이드
            </span>
            <div
              className={cn(
                "w-36 h-36 rounded-full flex flex-col items-center justify-center shadow-xl border-[10px] border-white transition-colors duration-500",
                gameData.isUp
                  ? "bg-blue-500 text-white"
                  : "bg-indigo-600 text-white",
              )}
            >
              <span className="text-6xl mb-1">{gameData.isUp ? "↑" : "↓"}</span>
              <span className="text-xl font-black">
                {gameData.isUp ? "커지는 순" : "작아지는 순"}
              </span>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-black text-slate-800 break-keep leading-tight">
              {gameData.isUp ? (
                <>
                  <strong>1</strong>에서 <strong>9</strong>까지
                  <br />
                  <span className="text-blue-600 underline underline-offset-8">
                    올라가는 순서
                  </span>
                </>
              ) : (
                <>
                  <strong>9</strong>에서 <strong>1</strong>까지
                  <br />
                  <span className="text-indigo-600 underline underline-offset-8">
                    내려가는 순서
                  </span>
                </>
              )}
            </h2>
          </div>

          <div className="bg-slate-900 text-white px-8 py-3 rounded-2xl shadow-lg mt-auto">
            <span className="text-2xl font-black italic">
              {userSequence.length} / 9
            </span>
          </div>
        </div>
      </aside>

      {/* 결과 다이얼로그에서 getFeedbackMsg() 호출 */}
      {isFinish && (
        <ResultDialog
          isOpen={isFinish}
          onClose={onComplete}
          feedbackMsg={getFeedbackMsg}
          successCount={scores.filter((s) => s.isPass).length}
          time={totalElapsedTime}
          onConfirm={onComplete}
        />
      )}
    </div>
  );
}
