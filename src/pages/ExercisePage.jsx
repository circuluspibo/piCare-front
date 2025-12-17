import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Pose } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { POSE_CONNECTIONS } from "@mediapipe/pose";
import { ArrowBigLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Dialog from "@/components/Dialog";

export default function ExercisePage() {
  const navigation = useNavigate();

  // --- State and Refs ---
  const [isStart, setIsStart] = useState(false);
  const [isFinish, setIsFinish] = useState(false);
  const [count, setCount] = useState(0);
  const [isPoseVisible, setIsPoseVisible] = useState(false);

  const [target, setTarget] = useState("");
  const [wrong, setWrong] = useState("");
  const [totalScores, setTotalScores] = useState([]);

  const [showDialog, setShowDialog] = useState(false);
  const [finalResult, setFinalResult] = useState({
    passCount: 0,
    totalTime: 0,
  });
  const [showCameraErrorDialog, setShowCameraErrorDialog] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [lastResultTarget, setLastResultTarget] = useState(null);
  const [lastResultIsPass, setLastResultIsPass] = useState(null);

  const initTimeRef = useRef(null);
  const intvRef = useRef(null);
  const startTimeRef = useRef(null);
  const timeOutRef = useRef(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const lastTimeRef = useRef(0);
  const isPoseDetectedRef = useRef(false);

  const startRef = useRef(null);
  const calcRef = useRef(null);
  const nextRef = useRef(null);
  const finishRef = useRef(null);
  const totalScoresRef = useRef([]);

  // --- Constants & Sounds ---
  const BASE_IMAGE_PATH = "/images/exercise";
  const TOTAL_ATTEMPTS = 20;
  const FIXED_LIMIT = 10;

  const pass = useMemo(() => new Audio("/sound/pass.mp3"), []);
  const fail = useMemo(() => new Audio("/sound/fail.mp3"), []);
  const music = useMemo(() => {
    const audio = new Audio("/sound/exercise.mp3");
    audio.volume = 0.5;
    return audio;
  }, []);

  // --- Logic Functions ---
  const resetGame = useCallback(() => {
    setIsStart(false);
    setIsFinish(false);
    setShowDialog(false);
    setCount(0);
    setTarget("");
    setWrong("");
    setTotalScores([]);
    setFinalResult({ passCount: 0, totalTime: 0 });
    clearInterval(intvRef.current);
    clearTimeout(timeOutRef.current);
    initTimeRef.current = null;
    lastTimeRef.current = 0;
    totalScoresRef.current = [];
    isPoseDetectedRef.current = false;
  }, []);

  const finish = useCallback(
    (data) => {
      if (isFinish || showDialog) return;
      const passCount = data.scores.filter((s) => s.isPass).length;
      const totalTime = Date.now() - initTimeRef.current;
      setFinalResult({ passCount, totalTime });
      setIsFinish(true);
      timeOutRef.current = setTimeout(() => setShowDialog(true), 1000);
    },
    [isFinish, showDialog]
  );

  const calc = useCallback(
    (side) => {
      isPoseDetectedRef.current = true;
      clearInterval(intvRef.current);
      const spendTime = Date.now() - startTimeRef.current;
      const isPass = target === side;
      setLastResultTarget(target);
      setLastResultIsPass(isPass);
      if (isPass) pass.play();
      else fail.play();
      setTotalScores((prev) => [...prev, { isPass, spendTime }]);
      timeOutRef.current = setTimeout(() => {
        setLastResultTarget(null);
        setLastResultIsPass(null);
        nextRef.current();
      }, 1000);
    },
    [target, pass, fail]
  );

  const start = useCallback(() => {
    isPoseDetectedRef.current = false;
    startTimeRef.current = Date.now();
    clearInterval(intvRef.current);
    let trialTime = FIXED_LIMIT;
    intvRef.current = setInterval(() => {
      trialTime -= 1;
      if (trialTime <= 0) {
        clearInterval(intvRef.current);
        if (!isPoseDetectedRef.current) calcRef.current("timeout");
      }
    }, 1000);
    const isLeftTarget = Math.random() < 0.5;
    setTarget(isLeftTarget ? "left" : "right");
    setWrong(isLeftTarget ? "right" : "left");
  }, []);

  const next = useCallback(() => {
    setCount((prev) => {
      const newCount = prev + 1;
      if (newCount === TOTAL_ATTEMPTS) {
        finishRef.current({ scores: totalScoresRef.current });
      } else {
        startRef.current();
      }
      return newCount;
    });
  }, []);

  const onResults = useCallback(
    (results) => {
      const marks = results.poseLandmarks;
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
        drawConnectors(canvasCtx, marks, POSE_CONNECTIONS, {
          color: "#00FF00",
          lineWidth: 6,
        });
        drawLandmarks(canvasCtx, marks, { color: "#FF0000", lineWidth: 2 });
      }
      canvasCtx.restore();

      if (!isStart) {
        initTimeRef.current = Date.now();
        setIsStart(true);
      }
      if (isPoseDetectedRef.current || !isStart || isFinish) return;
      if (Date.now() - lastTimeRef.current < 1000) return;
      if (!marks) return;

      const leftHand = marks[15],
        rightHand = marks[16];
      let side = null;
      if (leftHand?.visibility > 0.8) side = "right";
      else if (rightHand?.visibility > 0.8) side = "left";

      if (side) {
        isPoseDetectedRef.current = true;
        lastTimeRef.current = Date.now();
        calcRef.current(side);
      }
    },
    [isStart, isFinish]
  );

  useEffect(() => {
    finishRef.current = finish;
    calcRef.current = calc;
    startRef.current = start;
    nextRef.current = next;
    totalScoresRef.current = totalScores;
  }, [finish, calc, start, next, totalScores]);

  useEffect(() => {
    const videoEl = videoRef.current;
    let poseInstance = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });
    poseInstance.setOptions({
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
    });
    poseInstance.onResults(onResults);
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        stream.getTracks().forEach((track) => track.stop());
        const camera = new Camera(videoEl, {
          onFrame: async () => {
            await poseInstance.send({ image: videoEl });
          },
          width: 1280,
          height: 720,
        });
        camera.start();
      })
      .catch(() => {
        setCameraError("카메라를 확인해주세요.");
        setShowCameraErrorDialog(true);
      });
    return () => {
      poseInstance.close();
      clearInterval(intvRef.current);
    };
  }, [onResults]);

  useEffect(() => {
    music.play().catch(() => {});
    return () => music.pause();
  }, [music]);
  useEffect(() => {
    if (isStart) startRef.current();
  }, [isStart]);

  const getBgClass = (flagSide) => {
    if (lastResultTarget === null) return "bg-white border-gray-100 shadow-sm";
    const isTargetFlag = flagSide === lastResultTarget;
    if (lastResultIsPass)
      return isTargetFlag
        ? "bg-green-100 border-green-500 shadow-2xl scale-[1.03]"
        : "bg-white opacity-20";
    return flagSide !== lastResultTarget
      ? "bg-red-100 border-red-500 shadow-2xl scale-[1.03]"
      : "bg-white opacity-20";
  };

  return (
    <div className="flex flex-col h-full p-4 bg-gray-50 overflow-hidden font-sans">
      <header className="flex flex-row items-center justify-between pb-2 border-b mb-4">
        <div className="flex items-center text-4xl font-black">
          <ArrowBigLeft
            className="size-12 mr-4 cursor-pointer hover:text-blue-600"
            onClick={() => navigation("/")}
          />
          <span>청기 백기 게임</span>
        </div>
        <div
          className={`px-10 py-3 rounded-full text-3xl font-black text-white shadow-xl transition-all ${
            isPoseVisible ? "bg-green-500" : "bg-red-500 animate-pulse"
          }`}
        >
          {isPoseVisible ? "인식 중" : "인식 불가"}
        </div>
      </header>

      <main className="flex flex-grow space-x-6 overflow-hidden">
        {/* SECTION: 메인 게임판 */}
        <div className="w-[70%] flex items-center gap-2">
          <div
            className={`w-1/2 h-full rounded-2xl border-[5px] flex flex-col items-center justify-center transition-all duration-300 ${getBgClass(
              "right"
            )}`}
          >
            <span className="text-6xl font-black mb-10 text-blue-600">
              청기
            </span>
            <img
              className="w-3/4 object-contain"
              src={`${BASE_IMAGE_PATH}${
                wrong === "right" ? "/shrug.png" : "/left.png"
              }`}
              alt="B"
            />
          </div>
          <div
            className={`w-1/2 h-full rounded-2xl border-[5px] flex flex-col items-center justify-center transition-all duration-300 ${getBgClass(
              "left"
            )}`}
          >
            <span className="text-6xl font-black mb-10 text-red-600">백기</span>
            <img
              className="w-3/4 object-contain"
              src={`${BASE_IMAGE_PATH}${
                wrong === "left" ? "/shrug.png" : "/right.png"
              }`}
              alt="W"
            />
          </div>
        </div>

        {/* SECTION: 사이드 바 (압축형 진행상황 + 거대 카메라) */}
        <aside className="w-[30%] flex flex-col space-y-4">
          {/* 1. 진행 상황 (최소화) */}
          <div className="bg-white p-2 rounded-xl border-4 border-blue-500">
            <div className="flex flex-wrap gap-1 justify-center">
              {Array.from({ length: TOTAL_ATTEMPTS }).map((_, i) => (
                <div
                  key={i}
                  className={`w-10 h-10 rounded-sm flex items-center justify-center text-[22px] font-bold ${
                    i < count
                      ? totalScores[i]?.isPass
                        ? "bg-green-500 text-white"
                        : "bg-red-500 text-white"
                      : "bg-gray-100 text-gray-300"
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* 2. 실시간 카메라 (90% 차지) */}
          <div
            className="flex-1 relative bg-black rounded-xl overflow-hidden shadow-2xl border-[2px] transition-all duration-300"
            style={{ borderColor: isPoseVisible ? "#22c55e" : "#ef4444" }}
          >
            <video ref={videoRef} autoPlay playsInline className="hidden" />
            <canvas
              ref={canvasRef}
              className="w-full h-full object-cover transform scale-x-[-1]"
            />

            {!isPoseVisible && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-8 text-center pointer-events-none">
                <p className="text-white text-4xl font-black leading-tight">
                  몸이 전체적으로 나오게 서주세요!
                </p>
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* 결과 다이얼로그 (텍스트 극대화, 내용 최소화) */}
      <Dialog
        isOpen={showDialog && isFinish}
        onClose={() => setShowDialog(false)}
        title="축하합니다!"
        actions={[
          {
            text: "다시하기",
            onClick: resetGame,
            style:
              "bg-blue-600 text-white w-full py-8 text-5xl font-black rounded-[2rem] hover:scale-105 transition-transform shadow-2xl",
          },
        ]}
      >
        <div className="flex flex-col items-center py-10 space-y-12">
          <div className="text-center">
            <p className="text-4xl font-bold text-gray-400 mb-4">성공 횟수</p>
            <p className="text-[10rem] leading-none font-black text-green-600">
              {finalResult.passCount}
              <span className="text-5xl">회</span>
            </p>
          </div>
          <div className="text-center border-t-2 w-full pt-10 border-dashed">
            <p className="text-4xl font-bold text-gray-400 mb-4">걸린 시간</p>
            <p className="text-8xl font-black text-blue-600">
              {Math.round(finalResult.totalTime / 1000)}
              <span className="text-4xl">초</span>
            </p>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
