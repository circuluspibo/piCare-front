import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Pose } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { POSE_CONNECTIONS } from "@mediapipe/pose";
import DonutChart from "@/components/DonutChart";
import { ArrowBigLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ExercisePage() {
  const navigation = useNavigate();

  // State and Refs

  const [isStart, setIsStart] = useState(false);
  const [isFinish, setIsFinish] = useState(false);
  const [down, setDown] = useState(10);
  const [count, setCount] = useState(0);

  const [target, setTarget] = useState("");
  const [wrong, setWrong] = useState("");
  const [totalScores, setTotalScores] = useState([]);

  const [showDialog, setShowDialog] = useState(false);
  const [finalResult, setFinalResult] = useState({
    passCount: 0,
    totalTime: 0,
  });
  const [lastResultTarget, setLastResultTarget] = useState(null); // 'left' 또는 'right' (정답으로 지정된 깃발)
  const [lastResultIsPass, setLastResultIsPass] = useState(null); // boolean (통과 여부)

  const initTimeRef = useRef(null);
  const intvRef = useRef(null);
  const startTimeRef = useRef(null);
  const timeOutRef = useRef(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const lastTimeRef = useRef(0);
  const unfocusTimeRef = useRef(0);

  const isPoseDetectedRef = useRef(false);

  const startRef = useRef(null);
  const calcRef = useRef(null);
  const nextRef = useRef(null);
  const finishRef = useRef(null);
  const totalScoresRef = useRef([]);
  const cameraRef = useRef(null);

  // Constants & Sounds
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

  // API Mock
  // const piboTell = (text) => {
  //   console.log("PIBO TELL:", text);
  // };

  const resetGame = useCallback(() => {
    console.log("resetGame");
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
    unfocusTimeRef.current = 0;
    totalScoresRef.current = [];
    isPoseDetectedRef.current = false; // ✨ Ref 초기화
  }, []);

  // Finish
  const finish = useCallback(
    (data) => {
      // console.log("finish");
      if (isFinish || showDialog) {
        return;
      }

      const passCount = data.scores.filter((s) => s.isPass).length;
      const totalTime = Date.now() - initTimeRef.current;

      // piboTell(
      //   `고생했어! ${Math.round(
      //     totalTime / 1000
      //   )}초 동안, ${TOTAL_ATTEMPTS}번 중 ${passCount}번 성공했어.`
      // );

      setFinalResult({ passCount, totalTime });
      setIsFinish(true);

      timeOutRef.current = setTimeout(() => {
        setShowDialog(true);
      }, 1500);
    },
    [isFinish, showDialog, setIsFinish, setShowDialog, setFinalResult]
  );

  // Calc
  const calc = useCallback(
    (side) => {
      isPoseDetectedRef.current = true;
      clearInterval(intvRef.current);
      const spendTime = Date.now() - startTimeRef.current;
      const isPass = target === side;

      //  정답 깃발 위치와 통과 여부를 저장
      setLastResultTarget(target);
      setLastResultIsPass(isPass);

      // console.log("target = ", target);
      if (isPass) {
        pass.play();
      } else if (side !== "timeout") {
        fail.play();
      } else {
        // timeout
        console.log("timeOut");
        fail.play();
      }

      setTotalScores((prev) => [
        ...prev,
        { isPass, spendTime, unfocusTime: unfocusTimeRef.current },
      ]);

      timeOutRef.current = setTimeout(() => {
        setLastResultTarget(null);
        setLastResultIsPass(null);
        nextRef.current();
      }, 1000);
    },
    [target, setTotalScores, pass, fail]
  );

  // Start
  const start = useCallback(() => {
    // console.log("start");
    isPoseDetectedRef.current = false;

    startTimeRef.current = Date.now();
    unfocusTimeRef.current = 0;
    clearInterval(intvRef.current);

    setDown(FIXED_LIMIT);

    intvRef.current = setInterval(() => {
      setDown((prevDown) => {
        const newDown = prevDown - 1;
        if (newDown === 0) {
          clearInterval(intvRef.current);
          if (!isPoseDetectedRef.current) {
            calcRef.current("timeout");
          }
        }
        return newDown;
      });
    }, 1000);

    const isLeftTarget = Math.random() < 0.5;
    const newTarget = isLeftTarget ? "left" : "right";
    const newWrong = isLeftTarget ? "right" : "left";

    setTarget(newTarget);
    setWrong(newWrong);
  }, [setDown, setTarget, setWrong]);

  // Next
  const next = useCallback(() => {
    // console.log("next");

    setCount((prevCount) => {
      const newCount = prevCount + 1;
      if (newCount === TOTAL_ATTEMPTS) {
        finishRef.current({
          totalTime: Date.now() - initTimeRef.current,
          scores: totalScoresRef.current,
        });
      } else {
        startRef.current();
      }
      return newCount;
    });
  }, [setCount]);

  // onResults (MediaPipe 콜백)
  const onResults = useCallback(
    (results) => {
      console.log("onResults");
      const marks = results.poseLandmarks;
      const canvasEl = canvasRef.current;

      if (!canvasEl) return;

      const canvasCtx = canvasEl.getContext("2d");

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);

      canvasCtx.translate(canvasEl.width, 0);
      canvasCtx.scale(-1, 1);
      canvasCtx.globalCompositeOperation = "destination-atop";
      canvasCtx.drawImage(results.image, 0, 0, canvasEl.width, canvasEl.height);

      canvasCtx.globalCompositeOperation = "source-over";
      if (marks) {
        drawConnectors(canvasCtx, marks, POSE_CONNECTIONS, {
          color: "#00FF00",
          lineWidth: 2,
        });
        drawLandmarks(canvasCtx, marks, { color: "#0000FF", lineWidth: 1 });
      }
      canvasCtx.restore();

      if (!isStart) {
        initTimeRef.current = Date.now();
        setIsStart(true);
      }

      // 이미 포즈가 감지되어 calc가 호출되었으면 처리 x
      if (isPoseDetectedRef.current || !isStart || isFinish) return;

      if (Date.now() - lastTimeRef.current < 1000) {
        return;
      }

      if (!marks) return;

      const leftHand = marks[15];
      const rightHand = marks[16];

      let side = null;

      // 손 감지
      if (leftHand?.visibility > 0.8) side = "right";
      else if (rightHand?.visibility > 0.8) side = "left";

      if (side) {
        // 포즈 감지!
        console.log("Pose Detected:", side);
        isPoseDetectedRef.current = true;
        lastTimeRef.current = Date.now();

        calcRef.current(side);
      }
    },
    [isStart, isFinish, setIsStart]
  );

  const onResultsRef = useRef(onResults);
  useEffect(() => {
    onResultsRef.current = onResults;
  }, [onResults]);

  useEffect(() => {
    finishRef.current = finish;
    calcRef.current = calc;
    startRef.current = start;
    nextRef.current = next;
  }, [finish, calc, start, next]);

  useEffect(() => {
    totalScoresRef.current = totalScores;
  }, [totalScores]);

  // Create & Cleanup
  useEffect(() => {
    const videoEl = videoRef.current;
    let poseInstance = null;
    let cameraInstance = null;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("Camera access not supported.");
      return;
    }

    if (!videoEl || !canvasRef.current) {
      console.log("Video or Canvas element not found");
      return;
    }

    music.play().catch((e) => console.log("Failed to play music", e));

    poseInstance = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });
    poseInstance.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    poseInstance.onResults((results) => {
      if (onResultsRef.current) onResultsRef.current(results);
    });

    cameraInstance = new Camera(videoEl, {
      onFrame: async () => {
        try {
          if (poseInstance && typeof poseInstance.send === "function") {
            await poseInstance.send({ image: videoEl });
          }
        } catch (err) {
          console.log("Pose send failed (possibly closed):", err);
        }
      },
      width: 480,
      height: 270,
    });
    cameraInstance.start();
    cameraRef.current = cameraInstance;

    return () => {
      console.log("Cleanup: Stopping all resources.");
      clearInterval(intvRef.current);
      clearTimeout(timeOutRef.current);
      music.pause();
      music.currentTime = 0;

      try {
        if (cameraInstance) cameraInstance.stop();
      } catch (e) {
        console.warn("Error stopping camera instance:", e);
      }

      try {
        if (poseInstance) poseInstance.close();
      } catch (e) {
        console.warn("Error closing pose instance:", e);
      }

      if (cameraRef.current === cameraInstance) cameraRef.current = null;
    };
  }, [music]);

  // 최초 게임 시작 트리거
  useEffect(() => {
    if (isStart) {
      console.log("useEffect isStart");
      // piboTell("총 20번의 시도로 게임을 시작할게!");
      startRef.current && startRef.current();
    }
  }, [isStart]);

  const getBgClass = (targetSide) => {
    // 결과 표시 중이 아닐 때 (기본 흰색)
    if (lastResultTarget === null) return "bg-white";

    // 현재 깃발이 정답으로 지정되었던 깃발이 아닌 경우 (반대쪽)
    if (targetSide !== lastResultTarget) return "bg-white";

    // 현재 깃발이 정답으로 지정되었던 깃발인 경우
    // 💡 isPass 여부에 따라 색상 적용:
    return lastResultIsPass ? "bg-green-300" : "bg-red-300";
  };
  return (
    <div className="flex flex-col h-full p-4 bg-gray-50">
      {/* SECTION: 헤더 파트 */}
      <header className="flex flex-col items-start pb-2 border-b border-gray-200 mb-2">
        <div className="flex items-center text-xl font-bold text-gray-800">
          <ArrowBigLeft
            className="w-6 h-6 mr-2 cursor-pointer"
            onClick={() => navigation("/")}
          />
          <span>신체활동</span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          올라오는 깃발에 맞추어 손을 들어보자
        </p>
      </header>

      <main className="flex flex-grow space-x-6">
        {/* SECTION : 이미지 영역 (70%)역 */}
        <div className="w-[70%] flex items-center">
          <div className="flex w-full h-full space-x-4">
            <div
              className={`w-1/2 shadow-lg rounded-lg p-4 flex items-center justify-center ${getBgClass(
                "right"
              )}`}
            >
              <img
                className={`w-1/2 object-contain`}
                src={`${BASE_IMAGE_PATH}${
                  wrong === "right" ? "/shrug.png" : "/left.png"
                }`}
                alt="Left Flag"
              />
            </div>

            <div
              className={`w-1/2 shadow-lg rounded-lg p-4 flex items-center justify-center ${getBgClass(
                "left"
              )}`}
            >
              <img
                className={`w-1/2 object-contain`}
                src={`${BASE_IMAGE_PATH}${
                  wrong === "left" ? "/shrug.png" : "/right.png"
                }`}
                alt="Right Flag"
              />
            </div>
          </div>
        </div>

        {/* SECTION: 차트, 진행도, 카메라 영역 (30%) */}
        <aside className="w-[30%] flex flex-col space-y-6">
          {/* 도넛 차트 */}
          <div className="p-2 shadow-lg rounded-lg flex justify-center">
            <DonutChart value={down} max={FIXED_LIMIT} color="#b22729" />
          </div>

          {/* 점수 스코어 */}
          <div className="p-2 shadow-lg rounded-lg">
            <div className="flex flex-row items-center justify-between">
              <p className="text-lg font-semibold mb-2">진행 상황</p>
              <p className="text-sm text-gray-600 mb-2">
                현재 시도: {count + 1} / {TOTAL_ATTEMPTS}
              </p>
            </div>

            <ul className="check grid grid-cols-10 gap-1">
              {Array.from({ length: TOTAL_ATTEMPTS }).map((_, i) => (
                <li
                  key={i}
                  className={`w-4 h-4 rounded-full ${
                    i < count
                      ? totalScores[i]?.isPass
                        ? "bg-green-500"
                        : "bg-red-500"
                      : "bg-gray-300"
                  }`}
                ></li>
              ))}
            </ul>
          </div>

          {/* Camera / Canvas area */}
          <div className="bg-white p-4 shadow-lg rounded-lg flex-1 flex items-center justify-center">
            <div className="w-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ display: "none" }}
              />
              <canvas
                ref={canvasRef}
                className={`w-full h-auto ${isFinish ? "hidden" : ""}`}
              />
            </div>
          </div>

          {isFinish && (
            <div className="p-4 bg-yellow-100 text-yellow-800 rounded-lg">
              게임 완료! 결과를 확인하세요.
            </div>
          )}
        </aside>
      </main>

      {/* 결과 다이얼로그 */}
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl text-center min-w-[300px]">
            <h3 className="text-2xl font-bold mb-4">⭐ 게임 결과 ⭐</h3>
            <p className="text-gray-700 mb-2">총 시도: {TOTAL_ATTEMPTS}회</p>
            <p className="text-gray-700 mb-4">
              성공 횟수:{" "}
              <span className="text-green-600 font-bold">
                {finalResult.passCount}회
              </span>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              총 소요 시간: {Math.round(finalResult.totalTime / 1000)}초
            </p>
            <button
              onClick={resetGame}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
            >
              다시하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
