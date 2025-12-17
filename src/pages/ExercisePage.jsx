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
  const [isPoseVisible, setIsPoseVisible] = useState(false); // 포즈 인식 여부 상태

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
      const totalTime = Date.now() - initTimeRef.current; // 여기서 최종 시간 계산
      setFinalResult({ passCount, totalTime });
      setIsFinish(true);
      timeOutRef.current = setTimeout(() => setShowDialog(true), 1500);
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

      setIsPoseVisible(!!marks); // 인식 상태 업데이트

      const canvasCtx = canvasEl.getContext("2d");
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);

      // 캔버스 크기 동적 맞춤
      if (
        canvasEl.width !== canvasEl.clientWidth ||
        canvasEl.height !== canvasEl.clientHeight
      ) {
        canvasEl.width = canvasEl.clientWidth;
        canvasEl.height = canvasEl.clientHeight;
      }

      canvasCtx.translate(canvasEl.width, 0);
      canvasCtx.scale(-1, 1);
      canvasCtx.drawImage(results.image, 0, 0, canvasEl.width, canvasEl.height);

      if (marks) {
        drawConnectors(canvasCtx, marks, POSE_CONNECTIONS, {
          color: "#00FF00",
          lineWidth: 4,
        });
        drawLandmarks(canvasCtx, marks, { color: "#0000FF", lineWidth: 2 });
      }
      canvasCtx.restore();

      if (!isStart) {
        initTimeRef.current = Date.now();
        setIsStart(true);
      }

      if (isPoseDetectedRef.current || !isStart || isFinish) return;
      if (Date.now() - lastTimeRef.current < 1000) return;
      if (!marks) return;

      const leftHand = marks[15];
      const rightHand = marks[16];
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

  // --- Effects ---
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
          width: 640,
          height: 480,
        });
        camera.start();
      })
      .catch((err) => {
        setCameraError("카메라를 사용할 수 없습니다. 권한을 확인해주세요.");
        setShowCameraErrorDialog(true);
      });

    return () => {
      poseInstance.close();
      clearInterval(intvRef.current);
      clearTimeout(timeOutRef.current);
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
    if (lastResultTarget === null) return "bg-white border-gray-100";
    const isTargetFlag = flagSide === lastResultTarget;
    if (lastResultIsPass)
      return isTargetFlag
        ? "bg-green-100 border-green-500 scale-[1.02]"
        : "bg-white opacity-50";
    return flagSide !== lastResultTarget
      ? "bg-red-100 border-red-500 scale-[1.02]"
      : "bg-white opacity-50";
  };

  return (
    <div className="flex flex-col h-full p-4 bg-gray-50 overflow-hidden font-sans text-gray-800">
      {/* SECTION: 헤더 */}
      <header className="flex flex-col items-start pb-4 border-b mb-4">
        <div className="flex items-center text-4xl font-black">
          <ArrowBigLeft
            className="size-12 mr-4 cursor-pointer hover:text-blue-600 transition-colors"
            onClick={() => navigation("/")}
          />
          <span>신체활동: 청기 백기 게임</span>
        </div>
        <p className="text-2xl text-gray-500 mt-2 ml-16 font-medium">
          인식 상태를 확인하며 깃발을 들어보세요!
        </p>
      </header>

      <main className="flex flex-grow space-x-6 overflow-hidden">
        {/* SECTION: 메인 게임판 (70%) */}
        <div className="w-[70%] flex items-center gap-6">
          <div
            className={`w-1/2 h-full shadow-2xl rounded-[2rem] border-8 flex flex-col items-center justify-center transition-all duration-500 ${getBgClass(
              "right"
            )}`}
          >
            <span className="text-4xl font-black mb-8 text-blue-600">
              청기 (왼쪽)
            </span>
            <img
              className="w-3/4 object-contain"
              src={`${BASE_IMAGE_PATH}${
                wrong === "right" ? "/shrug.png" : "/left.png"
              }`}
              alt="Blue Flag"
            />
          </div>
          <div
            className={`w-1/2 h-full shadow-2xl rounded-[2rem] border-8 flex flex-col items-center justify-center transition-all duration-500 ${getBgClass(
              "left"
            )}`}
          >
            <span className="text-4xl font-black mb-8 text-red-600">
              백기 (오른쪽)
            </span>
            <img
              className="w-3/4 object-contain"
              src={`${BASE_IMAGE_PATH}${
                wrong === "left" ? "/shrug.png" : "/right.png"
              }`}
              alt="White Flag"
            />
          </div>
        </div>

        {/* SECTION: 사이드 바 (30%) */}
        <aside className="w-[30%] flex flex-col space-y-6">
          {/* 1. 진행 상황 (상단 도넛차트 위치로 이동) */}
          <div className="bg-white p-6 shadow-xl rounded-[1.5rem] border-b-8 border-blue-500">
            <div className="flex justify-between items-end mb-4">
              <span className="text-2xl font-black">진행 상황</span>
              <span className="text-3xl font-bold text-blue-600">
                {count}
                <span className="text-xl text-gray-400">
                  {" "}
                  / {TOTAL_ATTEMPTS}
                </span>
              </span>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {Array.from({ length: TOTAL_ATTEMPTS }).map((_, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-xl flex items-center justify-center font-bold text-xl shadow-inner transition-all duration-300 ${
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

          {/* 2. 실시간 카메라 인식 영역 (확대 및 테두리 강조) */}
          <div
            className="flex-1 relative bg-black rounded-[1.5rem] overflow-hidden shadow-2xl border-[12px] transition-colors duration-300 flex items-center justify-center"
            style={{ borderColor: isPoseVisible ? "#22c55e" : "#ef4444" }}
          >
            <video ref={videoRef} autoPlay playsInline className="hidden" />
            <canvas ref={canvasRef} className="w-full h-full object-cover" />

            {/* 상태 뱃지 */}
            <div
              className={`absolute top-4 right-4 px-6 py-2 rounded-full text-lg font-black text-white shadow-lg ${
                isPoseVisible ? "bg-green-500" : "bg-red-500 animate-pulse"
              }`}
            >
              {isPoseVisible ? "인식 완료" : "인식 대기 중"}
            </div>

            {/* 인식 안내 문구 (인식 안될 때만 표시) */}
            {!isPoseVisible && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-6 text-center">
                <p className="text-white text-2xl font-bold leading-relaxed">
                  화면에 몸이 전체적으로
                  <br />
                  보이도록 서주세요!
                </p>
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* 결과 다이얼로그 (총 소요 시간 표시) */}
      <Dialog
        isOpen={showDialog && isFinish}
        onClose={() => setShowDialog(false)}
        title="✨ 미션 완료! ✨"
        actions={[
          {
            text: "한 번 더 하기",
            onClick: resetGame,
            style:
              "bg-blue-600 text-white w-full py-5 text-3xl font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl",
          },
        ]}
      >
        <div className="text-center p-8">
          <div className="flex justify-around mb-8 border-b pb-8">
            <div>
              <p className="text-xl text-gray-400 font-bold mb-2">성공 횟수</p>
              <p className="text-6xl font-black text-green-600">
                {finalResult.passCount}
                <span className="text-2xl ml-1">회</span>
              </p>
            </div>
            <div className="border-l pl-8">
              <p className="text-xl text-gray-400 font-bold mb-2">
                총 소요 시간
              </p>
              <p className="text-6xl font-black text-blue-600">
                {Math.round(finalResult.totalTime / 1000)}
                <span className="text-2xl ml-1">초</span>
              </p>
            </div>
          </div>
          <p className="text-2xl text-gray-600 font-bold">
            정말 훌륭한 실력이네요!
          </p>
        </div>
      </Dialog>

      {/* 카메라 에러 다이얼로그 */}
      <Dialog
        isOpen={showCameraErrorDialog}
        onClose={() => setShowCameraErrorDialog(false)}
        title="⚠️ 카메라 연결 확인"
        actions={[
          {
            text: "메인으로 이동",
            onClick: () => navigation("/"),
            style: "bg-gray-800 text-white w-full py-3",
          },
        ]}
      >
        <p className="text-2xl p-6 text-center font-medium">{cameraError}</p>
      </Dialog>
    </div>
  );
}
