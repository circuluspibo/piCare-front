import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Music, PlayCircle, CheckCircle2 } from "lucide-react";
import Dialog from "@/components/Dialog";
import { cn } from "@/lib/utils";
import { fireInfoConfetti } from "./magicui/connfetti";

const TOTAL_ROUNDS = 10;
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

export default function PianoTraining({ onComplete }) {
  const [targetSequence, setTargetSequence] = useState([]);
  const [userSequence, setUserSequence] = useState([]);
  const [scores, setScores] = useState([]);
  const [isFinish, setIsFinish] = useState(false);
  const [isPlayingTarget, setIsPlayingTarget] = useState(false);
  const [activeKey, setActiveKey] = useState(null);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);

  const totalStartRef = useRef(Date.now());

  // 오디오 리소스 설정
  const sounds = useMemo(
    () => ({
      snd1: new Audio("/app/PIANO/sound/sound1.mp3"),
      snd2: new Audio("/app/PIANO/sound/sound2.mp3"),
      snd3: new Audio("/app/PIANO/sound/sound3.mp3"),
      snd4: new Audio("/app/PIANO/sound/sound4.mp3"),
      snd5: new Audio("/app/PIANO/sound/sound5.mp3"),
      snd6: new Audio("/app/PIANO/sound/sound6.mp3"),
      snd7: new Audio("/app/PIANO/sound/sound7.mp3"),
      snd8: new Audio("/app/PIANO/sound/sound8.mp3"),
      pass: new Audio("/app/COLOR/sound/pass.mp3"),
      fail: new Audio("/app/COLOR/sound/fail.mp3"),
      complete: new Audio("/app/COLOR/sound/complete.mp3"),
    }),
    []
  );

  // 새로운 문제 생성 및 재생
  const startNewRound = useCallback(async () => {
    const newSequence = Array.from(
      { length: 3 },
      () => Math.floor(Math.random() * 8) + 1
    );
    setTargetSequence(newSequence);
    setUserSequence([]);
    setIsPlayingTarget(true);

    // 순차적으로 음 재생 (시각적 피드백 포함)
    for (let i = 0; i < newSequence.length; i++) {
      const sndId = `snd${newSequence[i]}`;
      setActiveKey(sndId);
      sounds[sndId].currentTime = 0;
      await sounds[sndId].play();
      await new Promise((resolve) => setTimeout(resolve, 800));
      setActiveKey(null);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    setIsPlayingTarget(false);
  }, [sounds]);

  // 건반 클릭 핸들러
  const handleKeyClick = useCallback(
    (keyId) => {
      if (isPlayingTarget || isFinish) return;

      // 해당 건반 소리 재생
      sounds[keyId].currentTime = 0;
      sounds[keyId].play().catch(() => {});
      setActiveKey(keyId);
      setTimeout(() => setActiveKey(null), 300);

      const keyNum = parseInt(keyId.replace("snd", ""));
      const nextUserSeq = [...userSequence, keyNum];
      const currentIndex = userSequence.length;

      // 정답 체크
      if (keyNum === targetSequence[currentIndex]) {
        if (nextUserSeq.length === targetSequence.length) {
          // 라운드 성공
          sounds.pass.play().catch(() => {});
          const nextScores = [...scores, { isPass: true }];
          setScores(nextScores);

          if (nextScores.length >= TOTAL_ROUNDS) {
            setTotalElapsedTime(
              ((Date.now() - totalStartRef.current) / 1000).toFixed(0)
            );
            setTimeout(() => {
              setIsFinish(true);
              sounds.complete.play().catch(() => {});
            }, 1000);
          } else {
            setTimeout(startNewRound, 1200);
          }
        } else {
          setUserSequence(nextUserSeq);
        }
      } else {
        // 오답
        sounds.fail.play().catch(() => {});
        const nextScores = [...scores, { isPass: false }];
        setScores(nextScores);

        if (nextScores.length >= TOTAL_ROUNDS) {
          setTotalElapsedTime(
            ((Date.now() - totalStartRef.current) / 1000).toFixed(0)
          );
          setTimeout(() => setIsFinish(true), 1000);
        } else {
          setTimeout(startNewRound, 1200);
        }
      }
    },
    [
      userSequence,
      targetSequence,
      isPlayingTarget,
      isFinish,
      sounds,
      scores,
      startNewRound,
    ]
  );

  useEffect(() => {
    startNewRound();
  }, [startNewRound]);

  useEffect(() => {
    if (isFinish) {
      fireInfoConfetti();
    }
  }, [isFinish]);
  return (
    <div className="flex h-full gap-6 animate-in fade-in duration-500 font-extrabold text-[#2D3A5A] p-3">
      {/* 좌측: 피아노 건반 영역 */}
      <section className="w-3/4 h-full flex flex-col gap-6">
        <div className="flex-1 bg-slate-800 rounded-3xl p-12 flex items-stretch gap-2 shadow-2xl relative overflow-hidden">
          {/* 피아노 상단 장식 */}
          <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-black/50 to-transparent" />

          {PIANO_KEYS.map((key) => (
            <button
              key={key.id}
              onClick={() => handleKeyClick(key.id)}
              disabled={isPlayingTarget}
              className={cn(
                "flex-1 flex flex-col items-center justify-end pb-10 rounded-b-[2rem] transition-all duration-150 relative",
                "bg-white border-x border-slate-200 shadow-[0_10px_0_0_#e2e8f0]",
                "hover:bg-slate-50",
                activeKey === key.id && "translate-y-2 shadow-none bg-blue-50",
                isPlayingTarget && "cursor-default"
              )}
            >
              <span
                className={cn(
                  "text-4xl font-black mb-4",
                  activeKey === key.id
                    ? "text-blue-600 scale-125"
                    : "text-slate-400"
                )}
              >
                {key.label}
              </span>
              {/* 눌림 효과를 위한 내부 선 */}
              <div className="w-full h-1 bg-slate-100 absolute top-0" />
            </button>
          ))}
        </div>

        {/* 현재 입력 상태 표시 */}
        <div className="h-32 bg-white rounded-3xl border flex items-center justify-center gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "size-16 rounded-full flex items-center justify-center border-4",
                userSequence[i]
                  ? "bg-blue-600 border-blue-200 text-white animate-bounce"
                  : "bg-slate-50 border-slate-100"
              )}
            >
              {userSequence[i] && <CheckCircle2 className="size-10" />}
            </div>
          ))}
          <p className="ml-4 text-3xl font-black text-slate-400">
            {isPlayingTarget
              ? "소리를 잘 들어보세요..."
              : "기억한 건반을 누르세요!"}
          </p>
        </div>
      </section>

      {/* 우측: 가이드 및 진행상황 */}
      <aside className="w-1/4 flex flex-col space-y-2">
        <div className="bg-white p-4 rounded-xl shadow-inner border grid grid-cols-5 gap-2">
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-full aspect-square rounded-full flex items-center justify-center text-2xl font-black",
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

        <div className="flex-1 flex flex-col items-center justify-center text-center bg-white shaodow-inner border rounded-xl gap-4 p-2">
          <div
            className={cn(
              "size-28 rounded-xl flex items-center justify-center transition-all duration-500",
              isPlayingTarget
                ? "bg-blue-100 text-blue-600 scale-110"
                : "bg-slate-100 text-slate-400"
            )}
          >
            <Music
              className={cn("size-20", isPlayingTarget && "animate-spin-slow")}
            />
          </div>

          <div className="py-2">
            <p className="text-4xl font-black text-slate-800 break-keep">
              {isPlayingTarget ? "소리가 나옵니다" : "순서대로 누르세요"}
            </p>
          </div>

          {!isPlayingTarget && (
            <button
              onClick={startNewRound}
              className="flex items-center gap-3 px-8 py-4 bg-slate-800 text-white rounded-2xl hover:bg-black transition-colors"
            >
              <PlayCircle className="size-6" />
              <span className="text-2xl font-bold">다시 듣기</span>
            </button>
          )}
        </div>
      </aside>

      <Dialog
        isOpen={isFinish}
        onClose={onComplete}
        title="훈련 결과"
        titleStyle="text-5xl font-bold mb-2"
      >
        <div className="text-center p-4 flex flex-col items-center gap-4">
          <h2 className="text-6xl font-black mb-10">음악가 수준이에요!</h2>
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
            className="w-full py-2 bg-[#2D3A5A] text-white text-4xl font-black rounded-2xl shadow-2xl hover:bg-[#1a233a] active:scale-95 transition-all"
          >
            확인
          </button>
        </div>
      </Dialog>
    </div>
  );
}
