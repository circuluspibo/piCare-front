import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Pose, POSE_CONNECTIONS } from "@mediapipe/pose";
import { Hands, HAND_CONNECTIONS } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { ArrowBigLeft, AlertCircle, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Dialog from "@/components/Dialog";
import { cn } from "@/lib/utils";
import FlagGame from "@/components/FlagGame";
import HeadGame from "@/components/HeadGame";
import GrabGame from "@/components/GrabGame";
import { fireInfoConfetti } from "@/components/magicui/connfetti";

const DETECTORS = {
  FLAG: (marks) => {
    const leftHand = marks[15],
      rightHand = marks[16];
    if (leftHand?.visibility > 0.8) return "right";
    if (rightHand?.visibility > 0.8) return "left";
    return null;
  },
  HEAD: (marks) => {
    const lEye1 = marks[2],
      rEye0 = marks[4];
    if (lEye1.x < 0.45) return "left";
    if (rEye0.x > 0.55) return "right";
    return null;
  },
  GRAB: (multiHandMarks) => {
    if (!multiHandMarks || multiHandMarks.length === 0) return null;
    for (const marks of multiHandMarks) {
      const isClosed =
        marks[8].y > marks[5].y &&
        marks[12].y > marks[9].y &&
        marks[16].y > marks[13].y &&
        marks[20].y > marks[17].y;
      if (isClosed) return marks[0].x < 0.5 ? "left" : "right";
    }
    return null;
  },
};

const GAME_INFO = {
  FLAG: { title: "깃발 들기" },
  HEAD: { title: "손바닥 피하기" },
  GRAB: { title: "사과 잡기" },
};

export default function ExercisePage() {
  const navigation = useNavigate();

  // --- States ---
  const [gameMode, setGameMode] = useState(null);
  const [isStart, setIsStart] = useState(false);
  const [isFinish, setIsFinish] = useState(false);
  const [isPoseVisible, setIsPoseVisible] = useState(false);
  const [target, setTarget] = useState("");
  const [totalScores, setTotalScores] = useState([]);
  const [lastResult, setLastResult] = useState({ target: null, isPass: null });
  const [showModeSelect, setShowModeSelect] = useState(true);
  const [countdown, setCountdown] = useState(null);
  const [cameraError, setCameraError] = useState(false);
  const [finalTime, setFinalTime] = useState(0);

  // --- Refs ---
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intvRef = useRef(null);
  const startTimeRef = useRef(null);
  const initTimeRef = useRef(null);
  const isPoseDetectedRef = useRef(false);
  const lastFrameTimeRef = useRef(null);
  const startNextTrialRef = useRef(null);

  const currentCount = totalScores.length;
  const TOTAL_ATTEMPTS = 20;
  const FIXED_LIMIT = 10;

  const passAudio = useMemo(() => new Audio("/sound/pass.mp3"), []);
  const failAudio = useMemo(() => new Audio("/sound/fail.mp3"), []);
  const music = useMemo(() => {
    const audio = new Audio("/sound/exercise.mp3");
    audio.volume = 0.5;
    audio.loop = true;
    return audio;
  }, []);

  const resetGame = useCallback(() => {
    setIsStart(false);
    setIsFinish(false);
    setTarget("");
    setTotalScores([]);
    setLastResult({ target: null, isPass: null });
    setCameraError(false);
    setFinalTime(0);
    if (intvRef.current) clearInterval(intvRef.current);
    initTimeRef.current = null;
    isPoseDetectedRef.current = false;
  }, []);

  const calc = useCallback(
    (side) => {
      if (cameraError || (isPoseDetectedRef.current && side !== "timeout"))
        return;
      isPoseDetectedRef.current = true;
      if (intvRef.current) clearInterval(intvRef.current);

      const isPass = target === side;
      setLastResult({ target, isPass });

      if (isPass) passAudio.play().catch(() => {});
      else failAudio.play().catch(() => {});

      setTotalScores((prev) => {
        const updated = [
          ...prev,
          { isPass, spendTime: Date.now() - startTimeRef.current },
        ];
        setTimeout(() => {
          setLastResult({ target: null, isPass: null });
          if (updated.length >= TOTAL_ATTEMPTS) {
            const timeSpent = Math.round(
              (Date.now() - initTimeRef.current) / 1000
            );
            setFinalTime(timeSpent);
            setIsFinish(true);
          } else {
            if (startNextTrialRef.current) startNextTrialRef.current();
          }
        }, 1000);
        return updated;
      });
    },
    [target, passAudio, failAudio, cameraError]
  );

  const startNextTrial = useCallback(() => {
    if (cameraError) return;
    isPoseDetectedRef.current = false;
    startTimeRef.current = Date.now();
    if (intvRef.current) clearInterval(intvRef.current);

    let trialTime = FIXED_LIMIT;
    intvRef.current = setInterval(() => {
      if (isPoseVisible && !cameraError) {
        trialTime -= 1;
        if (trialTime <= 0) {
          clearInterval(intvRef.current);
          calc("timeout");
        }
      }
    }, 1000);
    setTarget(Math.random() < 0.5 ? "left" : "right");
  }, [isPoseVisible, calc, cameraError]);

  useEffect(() => {
    startNextTrialRef.current = startNextTrial;
  }, [startNextTrial]);

  const runCountdown = useCallback(
    (mode) => {
      if (cameraError) return;
      setGameMode(mode);
      setShowModeSelect(false);
      resetGame();
      setCountdown(3);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsStart(true);
            initTimeRef.current = Date.now();
            startNextTrial();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [resetGame, startNextTrial, cameraError]
  );

  const onResults = useCallback(
    (results) => {
      lastFrameTimeRef.current = Date.now();
      setCameraError(false);
      const marks =
        gameMode === "GRAB"
          ? results.multiHandLandmarks
          : results.poseLandmarks;
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;

      setIsPoseVisible(!!marks);
      const canvasCtx = canvasEl.getContext("2d");
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      canvasCtx.translate(canvasEl.width, 0);
      canvasCtx.scale(-1, 1);
      canvasCtx.drawImage(results.image, 0, 0, canvasEl.width, canvasEl.height);

      if (marks) {
        if (gameMode === "GRAB") {
          marks.forEach((m) => {
            drawConnectors(canvasCtx, m, HAND_CONNECTIONS, {
              color: "#00FF00",
              lineWidth: 3,
            });
            drawLandmarks(canvasCtx, m, { color: "#FF0000", lineWidth: 1 });
          });
        } else {
          drawConnectors(canvasCtx, marks, POSE_CONNECTIONS, {
            color: "#00FF00",
            lineWidth: 4,
          });
          drawLandmarks(canvasCtx, marks, { color: "#FF0000", lineWidth: 2 });
        }
      }
      canvasCtx.restore();

      if (
        !isStart ||
        isFinish ||
        isPoseDetectedRef.current ||
        !marks ||
        cameraError
      )
        return;
      const detectedSide = DETECTORS[gameMode](marks);
      if (detectedSide) calc(detectedSide);
    },
    [isStart, isFinish, gameMode, calc, cameraError]
  );

  const onResultsRef = useRef(onResults);
  useEffect(() => {
    onResultsRef.current = onResults;
  }, [onResults]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !gameMode || !isStart) return;
    let isAlive = true;
    let instance = null;
    let camera = null;

    const initMediaPipe = async () => {
      try {
        instance =
          gameMode === "GRAB"
            ? new Hands({
                locateFile: (f) =>
                  `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
              })
            : new Pose({
                locateFile: (f) =>
                  `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`,
              });

        instance.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        instance.onResults((results) => {
          if (isAlive && onResultsRef.current) onResultsRef.current(results);
        });

        camera = new Camera(videoEl, {
          onFrame: async () => {
            if (isAlive && instance) await instance.send({ image: videoEl });
          },
          width: 1280,
          height: 720,
        });
        await camera.start();
      } catch (error) {
        if (isAlive) setCameraError(true);
      }
    };
    initMediaPipe();
    return () => {
      isAlive = false;
      if (camera) camera.stop();
      if (instance) instance.close();
    };
  }, [gameMode, isStart]);

  useEffect(() => {
    if (isStart && !cameraError) music.play().catch(() => {});
    else music.pause();
    return () => {
      music.pause();
      passAudio.pause();
      failAudio.pause();
      
      music.currentTime = 0;
      passAudio.currentTime = 0;
      failAudio.currentTime = 0;
    }
  }, [isStart, music, cameraError, passAudio, failAudio]);

  useEffect(() => {
    if (isFinish) {
      fireInfoConfetti();
    }
  }, [isFinish]);
  return (
    <div className="flex flex-col h-full p-4 bg-gray-50 overflow-hidden relative font-extrabold text-[#2D3A5A]">
      {countdown && !cameraError && (
        <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center">
          <span className="text-[25rem] font-black text-white animate-in zoom-in duration-300">
            {countdown}
          </span>
        </div>
      )}

      <Dialog isOpen={cameraError} onClose={() => {}} title="카메라 연결 오류">
        <div className="flex flex-col items-center p-8 space-y-4">
          <AlertCircle className="size-24 text-red-500" />
          <p className="text-3xl font-bold text-center break-keep">
            카메라 연결 상태를 확인해 주세요.
          </p>
          <button
            onClick={() => navigation("/")}
            className="mt-4 px-8 py-3 bg-blue-600 text-white rounded-xl text-2xl font-bold"
          >
            처음으로
          </button>
        </div>
      </Dialog>

      <header className="flex flex-row items-center justify-between pb-2 border-b mb-4 font-extrabold">
        <div
          className="flex items-center text-4xl font-black cursor-pointer"
          onClick={() => {
            resetGame();
            setShowModeSelect(true);
            setGameMode(null);
          }}
        >
          <ArrowBigLeft
            className="size-14 mr-2"
            onClick={(e) => {
              e.stopPropagation();
              navigation("/");
            }}
          />
          <span>{gameMode ? GAME_INFO[gameMode].title : "활동 선택"}</span>
        </div>
        {gameMode && (
          <div
            className={cn(
              "px-10 py-3 rounded-full text-3xl",
              isPoseVisible && !cameraError
                ? "bg-green-500"
                : "bg-red-500 animate-pulse"
            )}
          >
            {isPoseVisible && !cameraError ? "인식 중" : "인식 불가"}
          </div>
        )}
      </header>

      <main className="flex flex-grow space-x-6 overflow-hidden">
        <div className="w-2/3 flex items-center gap-2 relative p-2">
          {!isPoseVisible && isStart && !cameraError && (
            <div className="absolute inset-0 z-10 bg-black/70 flex items-center justify-center rounded-2xl text-white text-7xl font-black text-center break-keep">
              화면 정중앙에
              <br />
              위치해 주세요!
            </div>
          )}

          {/* 게임별 컴포넌트 호출 */}
          {gameMode === "FLAG" && (
            <FlagGame target={target} lastResult={lastResult} />
          )}
          {gameMode === "HEAD" && (
            <HeadGame target={target} lastResult={lastResult} />
          )}
          {gameMode === "GRAB" && (
            <GrabGame
              target={target}
              lastResult={lastResult}
              currentCount={currentCount}
            />
          )}
        </div>

        <aside className="w-1/3 flex flex-col space-y-2">
          <div className="bg-white p-4 rounded-xl shadow-inner border grid grid-cols-5 gap-2">
            {Array.from({ length: TOTAL_ATTEMPTS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold",
                  i === currentCount
                    ? "bg-blue-500 text-white animate-pulse"
                    : totalScores[i]?.isPass
                    ? "bg-green-500 border-green-200 text-white shadow-lg shadow-green-200"
                    : totalScores[i]
                    ? "bg-red-500 border-red-200 text-white shadow-lg shadow-red-200"
                    : "bg-gray-100 text-gray-300"
                )}
              >
                {i + 1}
              </div>
            ))}
          </div>
          <div className="flex-1 relative bg-black rounded-xl overflow-hidden border-[2px]">
            <video ref={videoRef} autoPlay playsInline className="hidden" />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover aspect-video"
            />
          </div>
        </aside>
      </main>
      <Dialog
        isOpen={showModeSelect}
        onClose={() => {}}
        title="게임을 선택하세요"
        titleStyle="text-4xl font-bold mb-2"
      >
        <div className="flex flex-col gap-4 p-2">
          {Object.entries(GAME_INFO).map(([key, info]) => (
            <button
              key={key}
              onClick={() => runCountdown(key)}
              className="bg-lime-100/80 border-lime-200 hover:bg-lime-200 group flex items-center justify-between p-4 rounded-3xl border-4"
            >
              <span className="text-5xl font-black text-lime-800 w-full text-center">
                {info.title}
              </span>
            </button>
          ))}
        </div>
        <div className="py-4 flex justify-center">
          <button
            onClick={() => navigation("/")}
            className="px-10 text-4xl font-bold text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-8 decoration-slate-200"
          >
            나중에 할래요
          </button>
        </div>
      </Dialog>

      <Dialog
        isOpen={isFinish}
        onClose={() => setIsFinish(false)}
        title="게임 종료"
        titleStyle="text-5xl font-bold mb-2"
      >
        <div className="text-center p-2 flex flex-col items-center gap-6">
          <div className="flex flex-row items-center gap-2">
            <h2 className="text-5xl font-black mb-10 break-keep leading-snug text-[#2D3A5A]">잘하셨어요!</h2>
          </div>
          <div className="flex flex-row items-center gap-6 text-center">
            <div>
              <p className="text-gray-400 font-bold text-2xl">성공 횟수</p>
              <p className="text-6xl font-black text-green-600">
                {totalScores.filter((s) => s.isPass).length}회
              </p>
            </div>
            <div>
              <p className="text-gray-400 font-bold text-2xl">소요 시간</p>
              <p className="text-6xl font-black text-blue-600">{finalTime}초</p>
            </div>
          </div>
          <button
            onClick={() => runCountdown(gameMode)}
            className="w-full py-4 bg-[#2D3A5A] text-white text-3xl font-black rounded-2xl hover:bg-slate-800 transition-all"
          >
            다시하기
          </button>
        </div>
      </Dialog>
    </div>
  );
}
