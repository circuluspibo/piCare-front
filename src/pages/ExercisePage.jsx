import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Pose, POSE_CONNECTIONS } from "@mediapipe/pose";
import { Hands, HAND_CONNECTIONS } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { ArrowBigLeft, AlertCircle, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Dialog from "@/components/Dialog";
import { cn } from "@/lib/utils";
import FlagGame from "@/components/exercise/FlagGame";
import HeadGame from "@/components/exercise/HeadGame";
import GrabGame from "@/components/exercise/GrabGame";
import { fireInfoConfetti } from "@/components/magicui/connfetti";
import ModeSelectView from "@/components/ModelSelectView";

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
  FLAG: { title: "깃발 들기", value: "flag", idx: 0 },
  HEAD: { title: "손바닥 피하기", value: "head", idx: 1 },
  GRAB: { title: "사과 잡기", value: "grab", idx: 2 },
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
            setFinalTime(Math.round((Date.now() - initTimeRef.current) / 1000));
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

  const onLeavePresentGame = () => {
    setGameMode(null);
    setIsFinish(true);
    resetGame();
  };
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
        console.log(`[Camera is not alive : ${error}]`);
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

  const getFeedbackMsg = () => {
    const passCnt = totalScores.filter((s) => s.isPass).length;
    if (passCnt >= 8) return "정말 최고에요!";
    if (passCnt >= 4) return "아주 잘하셨어요!";
    return "움직임이 보약! 조금 더 해볼까요?";
  };
  useEffect(() => {
    if (isStart && !cameraError) music.play().catch(() => {});
    else music.pause();
    return () => {
      music.pause();
      music.currentTime = 0;
    };
  }, [isStart, music, cameraError]);

  useEffect(() => {
    if (isFinish) fireInfoConfetti();
  }, [isFinish]);

  return (
    <div className="flex flex-col h-full p-2 bg-gray-50 overflow-hidden relative font-extrabold text-[#2D3A5A]">
      {/* 카운트다운 */}
      {countdown && !cameraError && (
        <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center">
          <span className="text-[25rem] font-black text-white animate-in zoom-in duration-300">
            {countdown}
          </span>
        </div>
      )}

      {/* 헤더 */}
      <header className="flex flex-row items-center justify-between pb-2 border-b mb-4">
        <div
          className="flex items-center text-4xl font-black cursor-pointer"
          onClick={() => {
            resetGame();
            setGameMode(null);
          }}
        >
          <ArrowBigLeft
            className="size-14 mr-2"
            onClick={(e) => {
              if (!gameMode) {
                e.stopPropagation();
                navigation("/");
              }
            }}
          />
          <span>{gameMode ? GAME_INFO[gameMode].title : "오늘의 활동"}</span>
        </div>
        {gameMode && (
          <div
            className={cn(
              "px-10 py-3 rounded-full text-3xl",
              isPoseVisible && !cameraError
                ? "bg-green-500 text-white"
                : "bg-red-500 text-white animate-pulse"
            )}
          >
            {isPoseVisible && !cameraError ? "인식 중" : "인식 불가"}
          </div>
        )}
      </header>

      {/* 메인 영역 */}
      <main className="flex flex-grow overflow-hidden relative">
        {gameMode ? (
          /* 게임 진행 화면 */
          <div className="flex w-full h-full space-x-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-2/3 flex items-center gap-2 relative p-2">
              {!isPoseVisible && isStart && !cameraError && (
                <div className="absolute inset-0 z-10 bg-black/70 flex items-center justify-center rounded-2xl text-white text-7xl font-black text-center break-keep">
                  화면 정중앙에 위치해 주세요!
                </div>
              )}
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

            <aside className="w-1/3 flex flex-col space-y-2 p-2">
              <div className="bg-white p-2 rounded-xl shadow-inner border grid grid-cols-5 gap-1">
                {Array.from({ length: TOTAL_ATTEMPTS }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-[40px] aspect-square rounded-full flex items-center justify-center text-2xl transition-all",
                      i === currentCount
                        ? "bg-blue-500 text-white animate-pulse"
                        : totalScores[i]?.isPass
                        ? "bg-green-500 text-white"
                        : totalScores[i]
                        ? "bg-red-500 text-white"
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
          </div>
        ) : (
          /* 게임 선택 화면 */
          <ModeSelectView gameInfo={GAME_INFO} onSelect={runCountdown} />
        )}
      </main>

      {/* 공통 다이얼로그 */}
      <Dialog isOpen={cameraError} onClose={() => {}} title="카메라 연결 오류">
        <div className="flex flex-col items-center p-8 space-y-4">
          <AlertCircle className="size-24 text-red-500" />
          <p className="text-3xl font-bold">
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

      <Dialog
        isOpen={isFinish}
        onClose={() => setIsFinish(false)}
        title="훈련 결과"
      >
        <div className="text-center flex flex-col items-center gap-2">
          <h2 className="text-5xl font-black mb-10 break-keep leading-snug text-[#2D3A5A]">
            {getFeedbackMsg()}
          </h2>
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
            onClick={onLeavePresentGame}
            className="w-full py-6 bg-[#2D3A5A] text-white text-4xl font-black rounded-3xl hover:bg-slate-800 transition-all shadow-xl"
          >
            다른 활동 하러가기
          </button>
        </div>
      </Dialog>
    </div>
  );
}
