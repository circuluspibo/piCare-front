import React, { useState, useEffect, useCallback, useRef } from "react";
import { Music, PlayCircle, CheckCircle2, XCircle } from "lucide-react"; // XCircle 추가
import Dialog from "@/components/Dialog";
import { cn } from "@/lib/utils";
import { fireInfoConfetti } from "@/components/magicui/connfetti";
import { useOutletContext } from "react-router-dom";

const TOTAL_ROUNDS = 5;
const PIANO_KEYS = [
  { id: "snd1", label: "도", color: "bg-white" },
  { id: "snd2", label: "레", color: "bg-white" },
  { id: "snd3", label: "미", color: "bg-white" },
  { id: "snd4", label: "파", color: "bg-white" },
  { id: "snd5", label: "솔", color: "bg-white" },
  { id: "snd6", label: "라", color: "bg-white" },
  { id: "snd7", label: "시", color: "bg-white" },
  { id: "snd8", label: "도", color: "bg-white" },
];

export default function PianoTraining() {
  const { onComplete } = useOutletContext();
  const [targetSequence, setTargetSequence] = useState([]);
  const [userSequence, setUserSequence] = useState([]); // {val: 숫자, isCorrect: boolean} 형태
  const [scores, setScores] = useState([]);
  const [isFinish, setIsFinish] = useState(false);
  const [isPlayingTarget, setIsPlayingTarget] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false); // 판정 중 입력 방지
  const [activeKey, setActiveKey] = useState(null);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);

  const totalStartRef = useRef(null);
  const soundsRef = useRef(null);

  if (soundsRef.current === null) {
    soundsRef.current = {
      snd1: new Audio("/sound/piano/sound1.mp3"),
      snd2: new Audio("/sound/piano/sound2.mp3"),
      snd3: new Audio("/sound/piano/sound3.mp3"),
      snd4: new Audio("/sound/piano/sound4.mp3"),
      snd5: new Audio("/sound/piano/sound5.mp3"),
      snd6: new Audio("/sound/piano/sound6.mp3"),
      snd7: new Audio("/sound/piano/sound7.mp3"),
      snd8: new Audio("/sound/piano/sound8.mp3"),
      pass: new Audio("/sound/pass.mp3"),
      fail: new Audio("/sound/fail.mp3"),
      complete: new Audio("/sound/complete.mp3"),
    };
  }
  const playSequence = useCallback(async (sequence) => {
    if (!sequence || sequence.length === 0) return;

    setIsPlayingTarget(true);
    setUserSequence([]);

    for (let i = 0; i < sequence.length; i++) {
      const sndId = `snd${sequence[i]}`;
      setActiveKey(sndId);

      const sound = soundsRef.current[sndId];
      sound.pause();
      sound.currentTime = 0;
      sound.volume = 0.5;
      await sound.play();
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setActiveKey(null);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    setIsPlayingTarget(false);
  }, []);

  const startNewRound = useCallback(async () => {
    const newSequence = Array.from(
      { length: 3 },
      () => Math.floor(Math.random() * 8) + 1,
    );
    setTargetSequence(newSequence);
    setIsEvaluating(false);

    await playSequence(newSequence);
  }, [playSequence]);

  const handleKeyClick = useCallback(
    (keyId) => {
      // 재생 중이거나, 판정 중이거나, 종료 상태면 클릭 무시
      if (isPlayingTarget || isFinish || isEvaluating) return;

      const sound = soundsRef.current[keyId];
      if (sound) {
        sound.pause();
        sound.currentTime = 0;
        sound.volume = 0.5;
        sound.play().catch(() => {});
      }
      setActiveKey(keyId);
      setTimeout(() => setActiveKey(null), 200);

      const keyNum = parseInt(keyId.replace("snd", ""));
      const currentIndex = userSequence.length;

      // 개별 입력에 대한 정답 여부 판단 (UI 표시용)
      const isCorrect = keyNum === targetSequence[currentIndex];
      const nextUserSeq = [...userSequence, { val: keyNum, isCorrect }];

      setUserSequence(nextUserSeq);

      // 3개를 모두 입력했을 때
      if (nextUserSeq.length === 3) {
        setIsEvaluating(true); // 추가 입력 방지

        // 전체 시퀀스가 모두 맞는지 확인
        const isAllCorrect = nextUserSeq.every((item) => item.isCorrect);

        setTimeout(() => {
          if (isAllCorrect) {
            soundsRef.current.pass.play().catch(() => {});
          } else {
            soundsRef.current.fail.play().catch(() => {});
          }

          const nextScores = [...scores, { isPass: isAllCorrect }];
          setScores(nextScores);

          if (nextScores.length >= TOTAL_ROUNDS) {
            setTotalElapsedTime(
              ((Date.now() - totalStartRef.current) / 1000).toFixed(0),
            );
            setTimeout(() => {
              setIsFinish(true);
              soundsRef.current.complete.play().catch(() => {});
            }, 1000);
          } else {
            setTimeout(startNewRound, 1200);
          }
        }, 500); // 마지막 건반 소리가 들릴 시간을 준 후 판정음 재생
      }
    },
    [
      userSequence,
      targetSequence,
      isPlayingTarget,
      isFinish,
      isEvaluating,
      soundsRef,
      scores,
      startNewRound,
    ],
  );

  const handleReplay = useCallback(() => {
    if (isPlayingTarget || isEvaluating || isFinish) return;
    playSequence(targetSequence); // 기존 문제 리플레이
  }, [isPlayingTarget, isEvaluating, isFinish, playSequence, targetSequence]);
  const getFeedbackMsg = () => {
    const passCnt = scores.filter((s) => s.isPass).length;
    if (passCnt >= 8) return "음악가 수준이에요!";
    if (passCnt >= 4) return "리듬감이 대단하세요!";
    return "조금 더 연습해 볼까요?";
  };

  useEffect(() => {
    if (totalStartRef.current === null) {
      totalStartRef.current = Date.now();
    }
  }, []);

  useEffect(() => {
    const initTimer = setTimeout(() => {
      startNewRound();
    }, 100);
    return () => clearTimeout(initTimer);
  }, [startNewRound]);

  useEffect(() => {
    return () => {
      if (soundsRef.current) {
        Object.values(soundsRef.current).forEach((audio) => {
          audio.pause();
          audio.currentTime = 0;
        });
      }
    };
  }, []);

  useEffect(() => {
    if (isFinish) fireInfoConfetti();
  }, [isFinish]);
  return (
    <div className="flex h-full gap-4 animate-in fade-in duration-500 font-extrabold p-2">
      <section className="flex-[3] h-full flex flex-col gap-6">
        <div className="flex-1 bg-slate-800 rounded-xl p-12 flex items-stretch gap-2 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-black/50 to-transparent" />
          {PIANO_KEYS.map((key) => (
            <button
              key={key.id}
              onClick={() => handleKeyClick(key.id)}
              disabled={isPlayingTarget || isEvaluating}
              className={cn(
                "flex-1 flex flex-col items-center justify-end pb-10 rounded-b-[2rem] transition-all duration-150 relative",
                "bg-white border-x border-slate-200 shadow-[0_10px_0_0_#e2e8f0]",
                "hover:bg-slate-50",
                activeKey === key.id && "translate-y-2 shadow-none bg-blue-50",
                (isPlayingTarget || isEvaluating) &&
                  "cursor-default active:translate-y-0 shadow-[0_10px_0_0_#e2e8f0]",
              )}
            >
              <span
                className={cn(
                  "text-4xl font-black mb-4",
                  activeKey === key.id
                    ? "text-blue-600 scale-125"
                    : "text-slate-400",
                )}
              >
                {key.label}
              </span>
              <div className="w-full h-1 bg-slate-100 absolute top-0" />
            </button>
          ))}
        </div>

        {/* 현재 입력 상태 표시 (수정됨: 색상 로직 반영) */}
        <div className="h-32 bg-white rounded-3xl shadow-md flex items-center justify-center gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "size-20 rounded-2xl flex items-center justify-center border-4 transition-all duration-300",
                userSequence[i]
                  ? userSequence[i].isCorrect
                    ? "bg-green-500 border-green-200 text-white shadow-lg shadow-green-200" // 정답: 초록
                    : "bg-red-500 border-red-200 text-white shadow-lg shadow-red-200" // 오답: 빨간
                  : "bg-slate-50 border-slate-100",
              )}
            >
              {userSequence[i] ? (
                userSequence[i].isCorrect ? (
                  <CheckCircle2 className="size-12" />
                ) : (
                  <XCircle className="size-12" />
                )
              ) : null}
            </div>
          ))}
          <p className="ml-4 text-3xl font-black text-slate-400">
            {isPlayingTarget
              ? "소리를 잘 들어보세요..."
              : isEvaluating
                ? "결과를 확인합니다!"
                : "기억한 건반을 누르세요!"}
          </p>
        </div>
      </section>

      {/* 우측 영역 생략 (기존과 동일하므로 유지) */}
      <aside className="flex-1 flex flex-col gap-4">
        {/* 상단 라운드 진행도 */}
        <div className="bg-slate-50 p-3 rounded-2xl shadow-sm grid grid-cols-5 gap-2">
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "aspect-square rounded-full flex items-center justify-center text-xl transition-all border-b-4",
                i === scores.length
                  ? "bg-blue-500 text-white animate-pulse border-blue-700"
                  : scores[i]?.isPass
                    ? "bg-red-400 text-white border-red-600"
                    : "bg-slate-100 text-slate-300 border-slate-200",
              )}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* 중앙 미션 카드 (ColorTraining 스타일) */}
        <div className="flex-1 flex flex-col rounded-2xl bg-slate-50 items-center justify-center text-center gap-4 p-2 shadow-inner border border-slate-100">
          <div
            className={cn(
              "size-36 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl bg-white",
              isPlayingTarget
                ? "scale-110 ring-[12px] ring-blue-100"
                : "scale-100",
            )}
          >
            <Music
              className={cn(
                "size-20",
                isPlayingTarget
                  ? "text-blue-600 animate-bounce"
                  : "text-slate-300",
              )}
            />
          </div>

          <div>
            <h2 className="text-4xl font-black text-slate-800 break-keep leading-tight">
              {isPlayingTarget ? (
                <span className="text-blue-600 underline underline-offset-8">
                  연주 소리
                </span>
              ) : (
                "순서대로"
              )}
              <br />
              {isPlayingTarget ? "감상 중입니다" : "연주해 주세요"}
            </h2>
          </div>

          {/* 다시 듣기 버튼 - ColorTraining의 하단 가이드 박스 위치 */}
          {!isPlayingTarget && !isEvaluating && (
            <button
              onClick={handleReplay}
              className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95"
            >
              <PlayCircle className="size-6" />
              <span className="text-2xl font-black">다시 듣기</span>
            </button>
          )}
        </div>
      </aside>

      <Dialog isOpen={isFinish} onClose={onComplete} title="훈련 결과">
        <div className="text-center flex flex-col items-center gap-3">
          <h2 className="text-5xl font-black mb-10 break-keep leading-snug text-slate-900">
            {getFeedbackMsg()}
          </h2>
          <div className="flex flex-row items-center gap-6 text-center">
            <div>
              <p className="text-gray-400 font-bold text-2xl">성공 횟수</p>
              <p className="text-6xl font-black text-green-600">
                {scores.filter((s) => s.isPass).length}회
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
            className="w-[80%] py-4 bg-[#2D3A5A] text-white text-5xl font-black rounded-2xl hover:bg-slate-800 transition-all shadow-xl"
          >
            확인
          </button>
        </div>
      </Dialog>
    </div>
  );
}
