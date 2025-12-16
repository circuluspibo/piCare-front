import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Pose } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { POSE_CONNECTIONS } from "@mediapipe/pose";
import DonutChart from "@/components/DonutChart";
import { ArrowBigLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Dialog from "@/components/Dialog";

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
  const [showCameraErrorDialog, setShowCameraErrorDialog] = useState(false);
  const [cameraError, setCameraError] = useState(""); // 에러 메시지 저장
  const [lastResultTarget, setLastResultTarget] = useState(null); // 'left' 또는 'right' (정답으로 지정된 깃발)
  const [lastResultIsPass, setLastResultIsPass] = useState(null); // boolean (통과 여부)

  const initTimeRef = useRef(null);
  const intvRef = useRef(null);
  const startTimeRef = useRef(null);
  const timeOutRef = useRef(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [videoClass, setVideoClass] = useState(
    "w-[1px] h-[1px] opacity-0 fixed -left-[9999px] -top-[9999px] pointer-events-none"
  );
  const [showVideo, setShowVideo] = useState(false);
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

  const updateVideoClass = () => {
    if (!showVideo) {
      setVideoClass("w-[300px] h-[300px] fixed right-0 top-0 z-[9999]");
      setShowVideo(true);
    } else {
      setVideoClass(
        "w-[1px] h-[1px] opacity-0 fixed -left-[9999px] -top-[9999px] pointer-events-none"
      );
      setShowVideo(false);
    }
  };
  // Reset Game
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
    unfocusTimeRef.current = 0;
    totalScoresRef.current = [];
    isPoseDetectedRef.current = false; // ✨ Ref 초기화
  }, []);

  // Finish
  const finish = useCallback(
    (data) => {
      if (isFinish || showDialog) {
        return;
      }

      const passCount = data.scores.filter((s) => s.isPass).length;
      const totalTime = Date.now() - initTimeRef.current;

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
        // 포즈감지
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

    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        // 성공: 스트림을 즉시 닫고 (Camera 클래스가 다시 열 것임), 나머지 로직 실행
        stream.getTracks().forEach((track) => track.stop());

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

        // 2. Camera 인스턴스 생성 (getUserMedia 성공 후이므로 에러 방지)
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
      })
      .catch((error) => {
        // 실패: 에러를 상태에 저장하고 Dialog를 띄웁니다.
        console.error("Failed to acquire camera feed:", error);

        let errorMessage = "알 수 없는 카메라 접근 오류가 발생했습니다.";

        // 에러 타입에 따른 사용자 친화적 메시지 설정
        if (
          error.name === "NotFoundError" ||
          error.name === "NotReadableError"
        ) {
          errorMessage =
            "카메라 장치를 찾을 수 없거나 사용 중입니다. 다른 프로그램에서 사용 중인지 확인해주세요.";
        } else if (
          error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError"
        ) {
          errorMessage =
            "카메라 접근이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.";
        }

        setCameraError(errorMessage);
        setShowCameraErrorDialog(true);
      });

    return () => {
      console.log("Cleanup: Stopping all resources.");
      clearInterval(intvRef.current);
      clearTimeout(timeOutRef.current);

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

  useEffect(() => {
    music.play().catch((e) => {
      // 브라우저 자동 재생 정책에 걸릴 경우
      console.log("Failed to play music on mount:", e);
    });

    // 1-2. 컴포넌트 언마운트 시 확실히 정지 및 리셋
    return () => {
      console.log("Music Cleanup: Stopping playback.");
      music.pause();
      // 메모리 해제는 GC에 맡기지만, 확실한 정지를 위해 currentTime 리셋
      music.currentTime = 0;
    };
  }, [music]);

  // 최초 게임 시작 트리거
  useEffect(() => {
    if (isStart) {
      // piboTell("총 20번의 시도로 게임을 시작할게!");
      startRef.current && startRef.current();
    }
  }, [isStart]);

  const getBgClass = (flagSide) => {
    // 결과 표시 중이 아닐 때 (기본 흰색)
    if (lastResultTarget === null) return "bg-white";

    const isTargetFlag = flagSide === lastResultTarget;
    const oppositeFlag = lastResultTarget === "left" ? "right" : "left";
    const isOppositeFlag = flagSide === oppositeFlag;

    if (lastResultIsPass) {
      return isTargetFlag ? "bg-green-300" : "bg-white";
    } else {
      if (isOppositeFlag) {
        return "bg-red-300";
      }

      return "bg-white";
    }
  };
  return (
    <div className="flex flex-col h-full p-4 bg-gray-50">
      {/* SECTION: 헤더 파트 */}
      <header className="flex flex-col items-start pb-2 border-b border-gray-200 mb-2">
        <div className="flex items-center text-4xl font-bold text-gray-800">
          <ArrowBigLeft
            className="size-10 mr-2 cursor-pointer"
            onClick={() => navigation("/")}
          />
          <span onClick={() => updateVideoClass()}>신체활동</span>
        </div>
        <p className="text-3xl text-gray-500 mt-1">
          올라오는 깃발에 맞추어 손을 들어보자
        </p>
      </header>

      <main className="flex flex-grow space-x-4">
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
        <aside className="w-[30%] h-full flex flex-col space-y-4">
          {/* 도넛 차트 */}
          <div className="p-2 shadow-lg rounded-lg flex justify-center">
            <DonutChart value={down} max={FIXED_LIMIT} color="#b22729" />
          </div>

          {/* 점수 스코어 */}
          <div className="p-2 shadow-lg rounded-lg">
            <p className="text-4xl font-semibold mb-4">진행 상황</p>
            <ul className="check grid grid-cols-5 gap-1">
              {Array.from({ length: TOTAL_ATTEMPTS }).map((_, i) => (
                <li
                  key={i}
                  className={`w-9 h-9 rounded-full ${
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
        </aside>
      </main>
      <div className={videoClass}>
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
      {/* SECITON: 결과 다이얼로그 */}
      <Dialog
        isOpen={showDialog && isFinish}
        onClose={() => setShowDialog(false)}
        title="⭐ 게임 결과 ⭐"
        actions={[
          {
            text: "다시하기",
            onClick: resetGame,
            style: "bg-blue-600 text-white",
          },
        ]}
      >
        <p className="mb-2">총 시도: {TOTAL_ATTEMPTS}회</p>
        <p className="mb-4">
          성공 횟수:{" "}
          <span className="text-green-600 font-bold">
            {finalResult.passCount}회
          </span>
        </p>
        <p className="text-sm text-gray-500">
          총 소요 시간: {Math.round(finalResult.totalTime / 1000)}초
        </p>
      </Dialog>

      {/** SECTION: 카메라 연결 실패 관련 Dialog */}
      <Dialog
        isOpen={showCameraErrorDialog}
        onClose={() => setShowCameraErrorDialog(false)}
        title="🚨 카메라 연결 실패"
        titleStyle="text-4xl font-bold text-red-600 mb-4"
        actions={[
          {
            text: "닫기 (새로고침 권장)",
            onClick: () => {
              // Dialog를 닫고, 필요하다면 초기화 로직을 추가할 수 있습니다.
              // 예를 들어 navigation("/") 으로 홈으로 돌아가는 액션 등.
            },
            style: "bg-red-600 text-white hover:bg-red-700",
          },
        ]}
      >
        <p className="text-xl">{cameraError}</p>
      </Dialog>
    </div>
  );
}
