import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Pose } from "@mediapipe/pose";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { POSE_CONNECTIONS } from "@mediapipe/pose";
import { HAND_CONNECTIONS } from "@mediapipe/hands";
import { ArrowBigLeft, RefreshCcw, Headset } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Dialog from "@/components/Dialog";

// 판정 로직 전략 패턴
const DETECTORS = {
  FLAG: (marks) => {
    const leftHand = marks[15];
    const rightHand = marks[16];
    if (leftHand?.visibility > 0.8) return "right";
    if (rightHand?.visibility > 0.8) return "left";
    return null;
  },
  HEAD: (marks) => {
    const lEye0 = marks[1];
    const lEye1 = marks[2];
    const rEye0 = marks[4];
    const rEye1 = marks[5];
    if (lEye1.x - lEye0.x < 0.005) return "right";
    if (rEye0.x - rEye1.x < 0.005) return "left";
    return null;
  },
  GRAB: (multiHandMarks) => {
    if (!multiHandMarks || multiHandMarks.length === 0) return null;
    for (const marks of multiHandMarks) {
      // 8,12,16,20번(끝)이 5,9,13,17번(마디)보다 아래(y값이 큼)에 있으면 주먹
      const isClosed =
        marks[8].y > marks[5].y &&
        marks[12].y > marks[9].y &&
        marks[16].y > marks[13].y &&
        marks[20].y > marks[17].y;
      if (isClosed) return marks[0].x < 0.5 ? "right" : "left";
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

  // States
  const [gameMode, setGameMode] = useState(null);
  const [isStart, setIsStart] = useState(false);
  const [isFinish, setIsFinish] = useState(false);
  const [count, setCount] = useState(0);
  const [isPoseVisible, setIsPoseVisible] = useState(false);
  const [target, setTarget] = useState("");
  const [wrong, setWrong] = useState("");
  const [totalScores, setTotalScores] = useState([]);
  const [lastResultTarget, setLastResultTarget] = useState(null);
  const [lastResultIsPass, setLastResultIsPass] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showModeSelect, setShowModeSelect] = useState(true);
  const [countdown, setCountdown] = useState(null);
  const [finalResult, setFinalResult] = useState({
    passCount: 0,
    totalTime: 0,
  });

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intvRef = useRef(null);
  const startTimeRef = useRef(null);
  const initTimeRef = useRef(null);
  const isPoseDetectedRef = useRef(false);
  const lastTimeRef = useRef(0);
  const startNextTrialRef = useRef(null);

  // Constants
  const BASE_IMAGE_PATH = "/images/exercise";
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
  const pass = useMemo(() => new Audio("/sound/pass.mp3"), []);
  const fail = useMemo(() => new Audio("/sound/fail.mp3"), []);
  const music = useMemo(() => {
    const audio = new Audio("/sound/exercise.mp3");
    audio.volume = 0.5;
    audio.loop = true;
    return audio;
  }, []);

  // Functions

  // NOTE: 초기화 함수
  const resetGame = useCallback(() => {
    setIsStart(false);
    setIsFinish(false);
    setShowDialog(false);
    setCount(0);
    setTarget("");
    setWrong("");
    setTotalScores([]);
    setLastResultTarget(null);
    setLastResultIsPass(null);
    if (intvRef.current) clearInterval(intvRef.current);
    initTimeRef.current = null;
    isPoseDetectedRef.current = false;
  }, []);

  const calc = useCallback(
    (side) => {
      if (isPoseDetectedRef.current && side !== "timeout") return;
      isPoseDetectedRef.current = true;
      if (intvRef.current) clearInterval(intvRef.current);

      const isPass = target === side;
      setLastResultTarget(target);
      setLastResultIsPass(isPass);

      if (isPass) pass.play().catch(() => {});
      else fail.play().catch(() => {});

      setTotalScores((prev) => {
        const updated = [
          ...prev,
          { isPass, spendTime: Date.now() - startTimeRef.current },
        ];

        setTimeout(() => {
          setLastResultTarget(null);
          setLastResultIsPass(null);

          if (updated.length >= TOTAL_ATTEMPTS) {
            setFinalResult({
              passCount: updated.filter((s) => s.isPass).length,
              totalTime: Date.now() - initTimeRef.current,
            });
            setIsFinish(true);
            setShowDialog(true);
          } else {
            setCount(updated.length);
            if (startNextTrialRef.current) startNextTrialRef.current();
          }
        }, 1000);
        return updated;
      });
    },
    [target, pass, fail]
  );

  // NOTE: 다음 문제 시작 함수
  const startNextTrial = useCallback(() => {
    isPoseDetectedRef.current = false;
    startTimeRef.current = Date.now();
    if (intvRef.current) clearInterval(intvRef.current);

    let trialTime = FIXED_LIMIT;
    intvRef.current = setInterval(() => {
      if (isPoseVisible) {
        trialTime -= 1;
        if (trialTime <= 0) {
          clearInterval(intvRef.current);
          calc("timeout");
        }
      }
    }, 1000);

    const isLeftTarget = Math.random() < 0.5;
    setTarget(isLeftTarget ? "left" : "right");
    setWrong(isLeftTarget ? "right" : "left");
  }, [isPoseVisible, FIXED_LIMIT, calc]);

  // NOTE: 최신 함수 할당
  useEffect(() => {
    startNextTrialRef.current = startNextTrial;
  }, [startNextTrial]);

  const runCountdown = useCallback(
    (mode) => {
      setGameMode(mode);
      setShowModeSelect(false);
      resetGame();
      setCountdown(3);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCountdown(null);
            setIsStart(true);
            initTimeRef.current = Date.now();
            startNextTrial();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [resetGame, startNextTrial]
  );

  // NOTE: Mediapipe 결과 처리
  const onResults = useCallback(
    (results) => {
      const marks =
        gameMode === "GRAB" ? results.multiHandMarks : results.poseLandmarks;
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

      if (!isStart || isFinish || isPoseDetectedRef.current || !marks) return;
      if (Date.now() - lastTimeRef.current < 1000) return;

      const detectedSide = DETECTORS[gameMode](marks);
      if (detectedSide) {
        lastTimeRef.current = Date.now();
        calc(detectedSide);
      }
    },
    [isStart, isFinish, gameMode, calc]
  );

  // Effects
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const instance =
      gameMode === "GRAB"
        ? new Hands({
            locateFile: (file) =>
              `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
          })
        : new Pose({
            locateFile: (file) =>
              `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
          });
    instance.setOptions(
      gameMode === "GRAB"
        ? { maxNumHands: 2, minDetectionConfidence: 0.7 }
        : {
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
          }
    );
    instance.onResults(onResults);

    const camera = new Camera(videoEl, {
      onFrame: async () => {
        await instance.send({ image: videoEl });
      },
      width: 1280,
      height: 720,
    });
    camera.start();

    return () => {
      instance.close();
      camera.stop();
      if (intvRef.current) clearInterval(intvRef.current);
    };
  }, [onResults, gameMode]);

  useEffect(() => {
    if (isStart) music.play().catch(() => {});
    else music.pause();
  }, [isStart, music]);

  // UI Helpers ---
  const getBgClass = (side) => {
    if (lastResultTarget === null) return "bg-white border-gray-100 shadow-sm";
    const isTarget = side === lastResultTarget;
    if (lastResultIsPass) {
      return isTarget
        ? "bg-green-100 border-green-500 shadow-2xl scale-[1.03]"
        : "bg-white opacity-20";
    }
    return !isTarget
      ? "bg-red-100 border-red-500 shadow-2xl scale-[1.03]"
      : "bg-white opacity-20";
  };
  const getImgSrc = (side) => {
    const isT = side === target;
    if (gameMode === "FLAG")
      return `${BASE_IMAGE_PATH}${
        side === wrong
          ? "/flag/shrug.png"
          : side === "left"
          ? "/flag/right.png"
          : "/flag/left.png"
      }`;
    if (gameMode === "HEAD")
      return `${BASE_IMAGE_PATH}${isT ? "/head/check.png" : "/head/hand.png"}`;
    return `${BASE_IMAGE_PATH}${
      isT ? "/grab/apple.png" : `/grab/${fruits[count % fruits.length]}.png`
    }`;
  };

  return (
    <div className="flex flex-col h-full p-4 bg-gray-50 overflow-hidden font-sans">
      {countdown && (
        <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center">
          <span className="text-[25rem] font-black text-white animate-ping">
            {countdown}
          </span>
        </div>
      )}
      <header className="flex flex-row items-center justify-between pb-2 border-b mb-4">
        <div
          className="flex items-center text-4xl font-black cursor-pointer hover:opacity-70 transition-all"
          onClick={() => {
            resetGame();
            setShowModeSelect(true);
          }}
        >
          <ArrowBigLeft
            className="size-12 mr-4"
            onClick={(e) => {
              e.stopPropagation();
              navigation("/");
            }}
          />
          <span>{gameMode ? GAME_INFO[gameMode].title : "활동 선택"}</span>
        </div>
        <div
          className={`px-10 py-3 rounded-full text-3xl font-black text-white ${
            isPoseVisible ? "bg-green-500" : "bg-red-500 animate-pulse"
          }`}
        >
          {isPoseVisible ? "인식 중" : "인식 불가"}
        </div>
      </header>

      <main className="flex flex-grow space-x-6 overflow-hidden">
        <div className="w-2/3 flex items-center gap-2 relative p-2">
          {!isPoseVisible && isStart && (
            <div className="absolute inset-0 z-10 bg-black/70 backdrop-blur-md flex items-center justify-center rounded-2xl">
              <p className="text-white text-7xl font-black text-center leading-tight">
                화면 정중앙에
                <br />
                위치해 주세요!
              </p>
            </div>
          )}
          {["right", "left"].map((side) => (
            <div
              key={side}
              className={`w-1/2 h-full rounded-2xl border-[5px] flex flex-col items-center justify-center transition-all duration-300 ${getBgClass(
                side
              )}`}
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
                className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                  i === count
                    ? "bg-blue-500 text-white animate-pulse"
                    : totalScores[i]?.isPass
                    ? "bg-green-500 text-white"
                    : totalScores[i]
                    ? "bg-red-200 text-white"
                    : "bg-gray-100 text-gray-300"
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
          <div className="flex-1 relative bg-black rounded-xl overflow-hidden shadow-2xl border-[2px]">
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
        <div className="flex flex-col gap-4 p-6">
          {Object.entries(GAME_INFO).map(([key, info]) => (
            <button
              key={key}
              onClick={() => runCountdown(key)}
              className="py-8 text-4xl font-black bg-white border-4 border-gray-100 rounded-3xl hover:border-blue-500 hover:bg-blue-50 transition-all shadow-sm"
            >
              {info.title}
            </button>
          ))}
        </div>
      </Dialog>

      <Dialog
        isOpen={showDialog && isFinish}
        onClose={() => setShowDialog(false)}
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
        <div className="flex flex-col items-center py-6 space-y-8">
          <div className="text-center">
            <p className="text-gray-400 font-bold text-2xl">성공 횟수</p>
            <p className="text-7xl font-black text-green-600">
              {finalResult.passCount}회
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 font-bold text-2xl">소요 시간</p>
            <p className="text-7xl font-black text-blue-600">
              {Math.round(finalResult.totalTime / 1000)}초
            </p>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
