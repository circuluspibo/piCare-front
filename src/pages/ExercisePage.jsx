import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Pose, POSE_CONNECTIONS } from "@mediapipe/pose";
import { Hands, HAND_CONNECTIONS } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { ArrowBigLeft, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Dialog from "@/components/Dialog";
import { cn } from "@/lib/utils";

// 게임 감지 로직
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

const BASE_IMAGE_PATH = "/images/exercise";

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
  const fruits = [
    "cherries",
    "grape",
    "kiwi",
    "orange",
    "peach",
    "pear",
    "strawberry",
  ];

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
        // 1. 인스턴스 생성
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

        // 2. Ref를 사용하여 최신 onResults를 호출 (인스턴스 재생성 방지)
        instance.onResults((results) => {
          if (isAlive && onResultsRef.current) {
            onResultsRef.current(results);
          }
        });

        // 3. 카메라 설정
        camera = new Camera(videoEl, {
          onFrame: async () => {
            if (isAlive && instance) {
              try {
                await instance.send({ image: videoEl });
              } catch (err) {
                // 이미 close된 경우 에러 무시
              }
            }
          },
          width: 1280,
          height: 720,
        });

        await camera.start();
        console.log(`${gameMode} Camera Started`);
      } catch (error) {
        console.error("Init Error:", error);
        if (isAlive) setCameraError(true);
      }
    };

    initMediaPipe();

    return () => {
      console.log("Cleaning up...");
      isAlive = false;
      if (camera) camera.stop();
      if (instance) instance.close();
    };
    // 의존성 배열에서 onResults를 제거하고 gameMode에만 반응하게 합니다.
  }, [gameMode, isStart]);

  useEffect(() => {
    if (isStart && !cameraError) music.play().catch(() => {});
    else music.pause();
  }, [isStart, music, cameraError]);

  const getBgClass = (side) => {
    if (lastResult.target === null) return "bg-white border-gray-100 shadow-sm";
    const isTarget = side === lastResult.target;
    if (lastResult.isPass)
      return isTarget
        ? "bg-green-100 border-green-500 shadow-2xl scale-[1.03]"
        : "bg-white opacity-20";
    return !isTarget
      ? "bg-red-100 border-red-500 shadow-2xl scale-[1.03]"
      : "bg-white opacity-20";
  };

  const getImgSrc = (side) => {
    const isT = side === target;
    if (gameMode === "FLAG")
      return `${BASE_IMAGE_PATH}/flag/${
        side !== target ? "shrug" : side === "left" ? "right" : "left"
      }.png`;
    if (gameMode === "HEAD")
      return `${BASE_IMAGE_PATH}/head/${isT ? "check" : "hand"}.png`;
    return `${BASE_IMAGE_PATH}/grab/${
      isT ? "apple" : fruits[currentCount % fruits.length]
    }.png`;
  };

  return (
    <div className="flex flex-col h-full p-4 bg-gray-50 overflow-hidden relative">
      {/* 카운트다운 UI: 에러가 없을 때만 표시되도록 안전장치 */}
      {countdown && !cameraError && (
        <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center">
          <span className="text-[25rem] font-black text-white animate-in zoom-in duration-300">
            {countdown}
          </span>
        </div>
      )}

      {/* 카메라 오류 안내 Dialog */}
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
          className="flex items-center text-4xl font-black cursor-pointer text-[#2D3A5A]"
          onClick={() => {
            resetGame();
            setShowModeSelect(true);
            setGameMode(null);
          }}
        >
          <ArrowBigLeft
            className="size-14 mr-2 "
            onClick={(e) => {
              e.stopPropagation();
              navigation("/");
            }}
          />
          <span>{gameMode ? GAME_INFO[gameMode].title : "활동 선택"}</span>
        </div>
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
          {["right", "left"].map((side) => (
            <div
              key={side}
              className={cn(
                "w-1/2 h-full rounded-2xl border-[5px] flex flex-col items-center justify-center transition-all duration-300",
                getBgClass(side)
              )}
            >
              {gameMode && (
                <img
                  className="w-3/4 object-contain"
                  src={getImgSrc(side)}
                  alt={side}
                />
              )}
            </div>
          ))}
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
                    ? "bg-green-500 text-white"
                    : totalScores[i]
                    ? "bg-red-200 text-white"
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
      >
        <div className="flex flex-col gap-2 p-3">
          {Object.entries(GAME_INFO).map(([key, info]) => (
            <button
              key={key}
              onClick={() => runCountdown(key)}
              className="py-4 text-4xl font-black bg-white border-4 border-gray-100 rounded-3xl"
            >
              {info.title}
            </button>
          ))}
        </div>
      </Dialog>

      <Dialog
        isOpen={isFinish}
        onClose={() => setIsFinish(false)}
        title="게임 결과"
        actions={[
          {
            text: "다시하기",
            onClick: () => runCountdown(gameMode),
            style:
              "bg-blue-600 text-white w-full py-4 text-4xl font-black rounded-2xl",
          },
        ]}
      >
        <div className="flex flex-col items-center py-6 space-y-8 text-center">
          <div>
            <p className="text-gray-400 font-bold text-2xl">성공 횟수</p>
            <p className="text-7xl font-black text-green-600">
              {totalScores.filter((s) => s.isPass).length}회
            </p>
          </div>
          <div>
            <p className="text-gray-400 font-bold text-2xl">소요 시간</p>
            <p className="text-7xl font-black text-blue-600">{finalTime}초</p>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
