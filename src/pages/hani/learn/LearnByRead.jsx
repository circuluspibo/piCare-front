/* eslint-disable react-hooks/exhaustive-deps */
import React, { useRef, useState, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";
import { createWorker } from "tesseract.js";
import { Loader2Icon } from "lucide-react";
import { getAsset } from "@/api/haniService";
import { JOSA } from "@/utils/haniUtil";
import { useIntegratedMonitor } from "@/hooks/useIntegratedMonitor"; // 🌟 모니터링 훅 임포트

const TM_INPUT_SIZE = 224;
const USE_TF_FOR = new Set(["vowel", "consonant"]);

const LearnByWrite = ({
  item,
  target,
  handleAnswer,
  currentItemIdx,
  currentQuestion,
  currentLearningCnt,
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [hint, setHint] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tmModel, setTmModel] = useState(null);
  const [tmLabels, setTmLabels] = useState([]);
  const [tmReady, setTmReady] = useState(false);

  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const parentRef = useRef(null);

  // 🌟 통합 모니터링 훅 사용
  const { startQuestion, submitAnswer } = useIntegratedMonitor();

  // 1️⃣ [초기화] 인덱스/질문 번호 바뀔 때마다 모니터링 시작
  useEffect(() => {
    startQuestion(); // 🌟 문제 시작 타이머 및 시선 추적 리셋

    if (parentRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = parentRef.current.clientWidth;
      canvas.height = parentRef.current.clientHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 18;
      ctxRef.current = ctx;
      clearCanvas();
    }
    setHint(true);
  }, [item?.letter, currentQuestion, currentItemIdx]);

  // (중략: TF 모델 로드 및 그리기 로직은 이전과 동일)
  useEffect(() => {
    let mounted = true;
    if (!USE_TF_FOR.has(target)) return;
    (async () => {
      try {
        await tf.ready();
        const base = target === "vowel" ? "/tm-vowel" : "/tm-cons";
        const model = await tf.loadLayersModel(`${base}/model.json`);
        const meta = await fetch(`${base}/metadata.json`).then((r) => r.json());
        if (mounted) {
          setTmModel(model);
          setTmLabels(meta.labels || []);
          setTmReady(true);
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [target]);

  const clearCanvas = () => {
    ctxRef.current?.clearRect(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height,
    );
  };

  const getProcessedCanvas = () => {
    const src = canvasRef.current;
    const flat = document.createElement("canvas");
    flat.width = src.width;
    flat.height = src.height;
    const fctx = flat.getContext("2d");
    fctx.fillStyle = "#ffffff";
    fctx.fillRect(0, 0, flat.width, flat.height);
    fctx.drawImage(src, 0, 0);
    const out = document.createElement("canvas");
    out.width = TM_INPUT_SIZE;
    out.height = TM_INPUT_SIZE;
    out.getContext("2d").drawImage(flat, 0, 0, TM_INPUT_SIZE, TM_INPUT_SIZE);
    return { flat, out };
  };

  // 2️⃣ [제출] 제출 시 모니터링 데이터 추출
  const handleSubmit = async () => {
    if (busy) return;
    setBusy(true);

    try {
      const { flat, out } = getProcessedCanvas();
      let recognizedText = "";

      // 인식 로직 (자모: TF, 글자/단어: Tesseract)
      if (USE_TF_FOR.has(target)) {
        if (!tmReady) throw new Error("Model not ready");
        const probs = tf.tidy(() => {
          let img = tf.browser.fromPixels(out);
          img = img.toFloat().div(255).expandDims(0);
          return tmModel.predict(img).softmax().dataSync();
        });
        recognizedText =
          tmLabels[Array.from(probs).indexOf(Math.max(...probs))];
      } else {
        const worker = await createWorker("kor");
        const {
          data: { text },
        } = await worker.recognize(flat);
        recognizedText = text.replace(/\s/g, "");
        await worker.terminate();
      }

      // 🌟 [핵심] 모니터링 데이터 가져오기
      // submitAnswer(사용자입력, 정답) 호출 시 내부적으로 계산된 데이터 반환
      const monitorData = submitAnswer(recognizedText, item.letter);

      // 백엔드 페이로드 규격 패키징
      const attemptPayload = {
        user: recognizedText || "미인식",
        correct: item.letter,
        isCorrect: monitorData.isCorrect,
        responseTime: monitorData.solvingTime || 0, // NaN 방지
        concentration: {
          level: monitorData.concentrationLevel || "middle",
          focusRate: Number(monitorData.focusRate) || 0, // 🌟 여기서 강제 숫자 변환
          faceDetected: !!monitorData.faceDetected,
          attentionScore: Number(monitorData.attentionScore) || 0, // 🌟 백엔드 에러 해결 포인트
        },
      };

      await handleAnswer(attemptPayload);
    } catch (error) {
      console.error("인식 실패:", error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid h-full grid-cols-12 gap-4">
      {/* 왼쪽: 가이드/힌트 영역 */}
      <div className="col-span-4 flex items-center justify-center bg-white border-2 rounded-3xl shadow-sm overflow-hidden">
        <img
          src={getAsset({ content: item.letter, type: "write" })}
          alt="guide"
          className="max-h-[80%] object-contain"
        />
      </div>

      {/* 오른쪽: 필기 영역 */}
      <div className="col-span-8 flex flex-col gap-4">
        <div className="p-4 text-2xl font-black text-center bg-rose-200 text-rose-800 rounded-2xl border-b-4 border-rose-300">
          {`"${item.letter}"${JOSA().c(item.letter, "을/를")} 직접 써보세요.`}
        </div>

        <div
          className="relative flex-1 bg-white border-4 border-dashed border-gray-100 rounded-3xl overflow-hidden"
          ref={parentRef}
        >
          {hint && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 select-none">
              <span className="text-[220px] font-black text-black">
                {item.letter}
              </span>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 z-10 touch-none cursor-crosshair"
            onMouseDown={(e) => {
              const { x, y } = {
                x: e.nativeEvent.offsetX,
                y: e.nativeEvent.offsetY,
              };
              ctxRef.current.beginPath();
              ctxRef.current.moveTo(x, y);
              setIsDrawing(true);
            }}
            onMouseMove={(e) => {
              if (!isDrawing) return;
              const { x, y } = {
                x: e.nativeEvent.offsetX,
                y: e.nativeEvent.offsetY,
              };
              ctxRef.current.lineTo(x, y);
              ctxRef.current.stroke();
            }}
            onMouseUp={() => setIsDrawing(false)}
            onMouseLeave={() => setIsDrawing(false)}
          />

          {/* 컨트롤 버튼 그룹 */}
          <div className="absolute right-6 top-6 z-20 flex flex-col gap-4">
            <button
              onClick={() => setHint(!hint)}
              className={`w-20 h-20 text-4xl bg-white shadow-xl border-2 rounded-2xl transition-all active:scale-90 ${hint ? "border-amber-300 bg-amber-50" : "border-gray-100"}`}
            >
              {hint ? "💡" : "➖"}
            </button>
            <button
              onClick={clearCanvas}
              className="w-20 h-20 text-4xl bg-white shadow-xl border-2 border-red-100 rounded-2xl transition-all active:scale-90 text-red-400"
            >
              ❌
            </button>
            <button
              onClick={handleSubmit}
              disabled={busy}
              className="w-20 h-20 text-4xl bg-white shadow-xl border-2 border-green-200 rounded-2xl transition-all active:scale-90 text-green-500 flex items-center justify-center"
            >
              {busy ? <Loader2Icon className="animate-spin w-10 h-10" /> : "✅"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearnByWrite;
