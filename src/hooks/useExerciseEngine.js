import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Pose, POSE_CONNECTIONS } from "@mediapipe/pose";
import { Hands, HAND_CONNECTIONS } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { DETECTORS } from "@/assets/data/exerciseEngine";

const TOTAL_ATTEMPTS = 20;
const FIXED_LIMIT = 10;

export function useExerciseEngine(gameMode) {
  const [state, setState] = useState({
    isStart: false,
    isFinish: false,
    isPoseVisible: false,
    target: "",
    totalScores: [],
    lastResult: { target: null, isPass: null },
    countdown: null,
    cameraError: false,
    finalTime: 0,
  });

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intvRef = useRef(null);
  const startTimeRef = useRef(null);
  const initTimeRef = useRef(null);
  const isPoseDetectedRef = useRef(false);
  const stateRef = useRef(state);
  const actionsRef = useRef({}); // 순환 참조 해결용
  const onResultsRef = useRef(null);

  // 최신 상태 실시간 동기화
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const audios = useMemo(() => {
    const pass = new Audio("/sound/pass.mp3");
    const fail = new Audio("/sound/fail.mp3");
    const music = new Audio("/sound/exercise.mp3");
    music.volume = 0.5;
    music.loop = true;

    const safeStopMusic = () => {
      music.pause();
      if (music.readyState >= 1) {
        // 메타데이터가 로드된 상태에서만 시간 조작
        music.currentTime = 0;
      }
    };

    return { pass, fail, music, safeStopMusic };
  }, []);

  // 문제 생성
  const startNextTrial = useCallback(() => {
    const current = stateRef.current;
    if (current.cameraError || current.isFinish) return;

    isPoseDetectedRef.current = false;
    startTimeRef.current = Date.now();
    if (intvRef.current) clearInterval(intvRef.current);

    let trialTime = FIXED_LIMIT;
    intvRef.current = setInterval(() => {
      if (stateRef.current.isPoseVisible) {
        trialTime -= 1;
        if (trialTime <= 0) {
          clearInterval(intvRef.current);
          actionsRef.current.calc("timeout");
        }
      }
    }, 1000);

    setState((prev) => ({
      ...prev,
      target: Math.random() < 0.5 ? "left" : "right",
    }));
  }, []);

  // 문제 판결
  const calc = useCallback(
    (side) => {
      const current = stateRef.current;
      if (
        current.cameraError ||
        current.isFinish ||
        (isPoseDetectedRef.current && side !== "timeout")
      )
        return;

      isPoseDetectedRef.current = true;
      if (intvRef.current) clearInterval(intvRef.current);

      const isPass = current.target === side;
      setState((prev) => ({
        ...prev,
        lastResult: { target: prev.target, isPass },
      }));

      if (isPass) audios.pass.play().catch(() => {});
      else audios.fail.play().catch(() => {});

      setState((prev) => {
        const updated = [
          ...prev.totalScores,
          { isPass, spendTime: Date.now() - startTimeRef.current },
        ];

        setTimeout(() => {
          setState((s) => ({
            ...s,
            lastResult: { target: null, isPass: null },
          }));
          if (updated.length >= TOTAL_ATTEMPTS) {
            setState((s) => ({
              ...s,
              isFinish: true,
              finalTime: Math.round((Date.now() - initTimeRef.current) / 1000),
            }));
          } else {
            actionsRef.current.startNextTrial();
          }
        }, 1000);

        return { ...prev, totalScores: updated };
      });
    },
    [audios.pass, audios.fail],
  );

  // 함수 바인딩 (순환 참조 방지)
  useEffect(() => {
    actionsRef.current = { calc, startNextTrial };
  }, [calc, startNextTrial]);

  // MediaPipe 콜백함수
  const onResults = useCallback(
    (results) => {
      const current = stateRef.current;
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      const canvasCtx = canvasEl.getContext("2d");

      const marks =
        gameMode === "GRAB"
          ? results.multiHandLandmarks
          : results.poseLandmarks;
      setState((prev) => ({
        ...prev,
        isPoseVisible: !!marks,
        cameraError: false,
      }));

      // 캔버스 렌더링
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

      // 판정 루틴 실행
      if (
        !current.isStart ||
        current.isFinish ||
        isPoseDetectedRef.current ||
        !marks
      )
        return;

      const detectedSide = DETECTORS[gameMode](marks);
      if (detectedSide) actionsRef.current.calc(detectedSide);
    },
    [gameMode],
  );

  useEffect(() => {
    onResultsRef.current = onResults;
  }, [onResults]);

  // 카메라 모델
  useEffect(() => {
    if (!videoRef.current || !gameMode || !state.isStart) return;

    let isAlive = true;
    let instance = null;
    let camera = null;

    const initEngine = async () => {
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

        camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (isAlive && instance && videoRef.current)
              await instance.send({ image: videoRef.current });
          },
          width: 1280,
          height: 720,
        });
        await camera.start();
      } catch (e) {
        if (isAlive) {
          setState((prev) => ({ ...prev, cameraError: true }));
          console.log(`[Failed to load Camera model] message : ${e}`);
        }
      }
    };

    initEngine();

    return () => {
      isAlive = false;
      camera?.stop();
      instance?.close();
      if (intvRef.current) clearInterval(intvRef.current);
    };
  }, [gameMode, state.isStart]);

  // 카운트 다운
  const runCountdown = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isStart: false,
      isFinish: false,
      totalScores: [],
      countdown: 3,
    }));
    const timer = setInterval(() => {
      setState((prev) => {
        if (prev.countdown <= 1) {
          clearInterval(timer);
          initTimeRef.current = Date.now();
          startNextTrial();
          return { ...prev, countdown: null, isStart: true };
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);
  }, [startNextTrial]);

  // 게임 초기화
  const resetGame = useCallback(() => {
    setState({
      isStart: false,
      isFinish: false,
      isPoseVisible: false,
      target: "",
      totalScores: [],
      lastResult: { target: null, isPass: null },
      countdown: null,
      cameraError: false,
      finalTime: 0,
    });
    if (intvRef.current) clearInterval(intvRef.current);
    initTimeRef.current = null;
    isPoseDetectedRef.current = false;
  }, []);

  // 배경음악 효과 (오디오 에러 방지 포함)
  useEffect(() => {
    const shouldPlay = state.isStart && !state.cameraError && !state.isFinish;
    if (shouldPlay) {
      audios.music.play().catch(() => {});
    } else {
      audios.safeStopMusic();
    }
    return () => audios.safeStopMusic();
  }, [state.isStart, state.cameraError, state.isFinish, audios]);

  return {
    state,
    videoRef,
    canvasRef,
    actions: {
      runCountdown,
      resetGame,
      setIsFinish: (val) => setState((p) => ({ ...p, isFinish: val })),
    },
  };
}
