/* eslint-disable react-hooks/exhaustive-deps */
import React, { useRef, useState, useEffect } from "react";
import { createWorker } from "tesseract.js";
import { Loader2Icon } from "lucide-react";
import { getAsset } from "@/api/haniService";
import { JOSA } from "@/utils/haniUtil";
import { useHaniOCR } from "@/hooks/useHaniOCR";

const TM_INPUT_SIZE = 224;
const USE_TF_FOR = new Set(["vowel", "consonant"]);

const LearnByWrite = ({
  item,
  target,
  handleAnswer,
  currentItemIdx,
  currentLearningCnt,
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [hint, setHint] = useState(true);
  const [busy, setBusy] = useState(false);

  // 훅에서 비즈니스 로직 가져오기
  const { runInference, isPredicting } = useHaniOCR();

  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const parentRef = useRef(null);

  // 캔버스 초기 설정
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !parentRef.current) return;

    canvas.width = parentRef.current.clientWidth;
    canvas.height = parentRef.current.clientHeight;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 18;
    ctxRef.current = ctx;

    clearCanvas();
    setHint(true);
  }, [item, currentItemIdx, currentLearningCnt]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    if (busy || isPredicting) return;
    const { x, y } = getPos(e);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || busy || isPredicting) return;
    const { x, y } = getPos(e);
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
  };

  const clearCanvas = () => {
    if (ctxRef.current && canvasRef.current) {
      ctxRef.current.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height,
      );
    }
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

  const handleSubmit = async () => {
    if (busy || isPredicting) return;
    setBusy(true);

    try {
      const { flat, out } = getProcessedCanvas();
      let recognizedText = "";

      if (USE_TF_FOR.has(target)) {
        // ✅ 훅을 통해 문자열 결과만 바로 받음
        recognizedText = await runInference(out, target);
      } else {
        const worker = await createWorker("kor");
        const {
          data: { text },
        } = await worker.recognize(flat);
        recognizedText = text.replace(/\s/g, "");
        await worker.terminate();
      }

      // 결과 제출 (백엔드 페이로드 구조)
      await handleAnswer({
        user: recognizedText || "미인식",
        correct: item.letter,
        isCorrect: recognizedText === item.letter,
        responseTime: 0,
        concentration: {
          level: "high",
          focusRate: 1,
          faceDetected: true,
          attentionScore: 1,
        },
      });
    } catch (error) {
      console.error("인식 중 오류:", error);
    } finally {
      setBusy(false);
    }
  };

  const isWorking = busy || isPredicting;

  return (
    <div className="grid h-full grid-cols-12 gap-4 p-2">
      <div className="col-span-4 flex items-center justify-center bg-white border rounded-3xl shadow-sm">
        <img
          src={getAsset({ content: item.letter })}
          alt="target"
          className="max-h-[70%] object-contain"
        />
      </div>

      <div className="col-span-8 flex flex-col gap-4">
        <div className="p-4 text-2xl font-black text-center bg-rose-200 text-rose-800 rounded-2xl border-b-4 border-rose-300">
          {`"${item.letter}"${JOSA().c(item.letter, "을/를")} 직접 써보세요.`}
        </div>

        <div
          className="relative flex-1 bg-white border-4 border-dashed border-gray-100 rounded-3xl overflow-hidden"
          ref={parentRef}
        >
          {hint && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-10">
              <span className="text-[200px] font-black text-black">
                {item.letter}
              </span>
            </div>
          )}

          <canvas
            ref={canvasRef}
            className="absolute inset-0 z-10 touch-none cursor-crosshair"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={() => setIsDrawing(false)}
            onMouseLeave={() => setIsDrawing(false)}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={() => setIsDrawing(false)}
          />

          <div className="absolute right-4 bottom-4 z-20 flex flex-col gap-2">
            <button
              onClick={() => setHint(!hint)}
              className={`w-16 h-16 text-3xl bg-white border-2 rounded-2xl shadow-lg ${hint ? "border-amber-300 bg-amber-50" : "border-gray-200"}`}
            >
              💡
            </button>
            <button
              onClick={clearCanvas}
              className="w-16 h-16 text-3xl bg-white border-2 border-red-100 rounded-2xl shadow-lg text-red-400"
            >
              ❌
            </button>
            <button
              onClick={handleSubmit}
              disabled={isWorking}
              className="w-16 h-16 text-3xl bg-white border-2 border-green-200 rounded-2xl shadow-lg text-green-500 flex items-center justify-center"
            >
              {isWorking ? (
                <Loader2Icon className="animate-spin w-8 h-8 text-rose-400" />
              ) : (
                "✅"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearnByWrite;
