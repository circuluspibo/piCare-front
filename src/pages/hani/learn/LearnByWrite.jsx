/* eslint-disable react-hooks/exhaustive-deps */
import React, { useRef, useState, useEffect, useMemo } from "react";
import { Loader2Icon } from "lucide-react";
import { getAsset } from "@/api/haniService";
import { JOSA } from "@/utils/haniUtil";
import { useHaniOCR } from "@/hooks/useHaniOCR";

const USE_TF_FOR = new Set(["vowel", "consonant"]);

const LearnByWrite = ({
  item,
  target,
  handleAnswer,
  currentItemIdx,
  isSubmitting,
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [hint, setHint] = useState(true);
  const [busy, setBusy] = useState(false);
  const { runInference, isPredicting } = useHaniOCR();
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const parentRef = useRef(null);
  const [failCount, setFailCount] = useState(0);

  const responsiveConfig = useMemo(() => {
    const len = item.letter?.trim().length || 1;

    // 1자(기본)부터 5자(단어)까지의 설정값
    const configs = {
      1: { fontSize: "250px", lineWidth: 28 },
      2: { fontSize: "200px", lineWidth: 24 },
      3: { fontSize: "160px", lineWidth: 20 },
      4: { fontSize: "130px", lineWidth: 18 },
      5: { fontSize: "100px", lineWidth: 16 },
    };

    return configs[len] || configs[5];
  }, [item.letter]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !parentRef.current) return;

    canvas.width = parentRef.current.clientWidth;
    canvas.height = parentRef.current.clientHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.lineCap = ctx.lineJoin = "round";
    ctx.strokeStyle = "#000";
    const baseWidth = responsiveConfig.lineWidth;
    ctx.lineWidth = USE_TF_FOR.has(target) ? baseWidth * 0.8 : baseWidth;
    ctxRef.current = ctx;
    clearCanvas();
    setHint(true);
  }, [item, target, currentItemIdx]);

  const handleSubmit = async () => {
    if (busy || isPredicting || isSubmitting) return;
    setBusy(true);

    let worker = null;
    try {
      let isCorrect = false;
      let userDisplayLabel = "미인식";
      const targetLetter = item.letter.trim();

      // 추론 시작
      if (USE_TF_FOR.has(target)) {
        const topResults = await runInference(canvasRef.current, target);
        if (topResults && topResults.length > 0) {
          const top1 = topResults[0];
          userDisplayLabel = top1.label;
          const correctInTop3 = topResults.find(
            (r) => r.label === targetLetter,
          );

          if (top1.label === targetLetter) isCorrect = true;
          else if (correctInTop3 && top1.p - correctInTop3.p < 0.15)
            isCorrect = true;
        }
      } else {
        const { createWorker } = await import("tesseract.js");
        worker = await createWorker("kor");
        const {
          data: { text },
        } = await worker.recognize(canvasRef.current);
        userDisplayLabel = text.replace(/\s/g, "");
        // console.log(text);
        isCorrect =
          userDisplayLabel.includes(targetLetter) ||
          userDisplayLabel === targetLetter;
      }

      let finalIsCorrect = isCorrect;

      // 결과 처리
      if (!isCorrect) {
        const nextFailCount = failCount + 1;
        setFailCount(nextFailCount);

        // 2번 틀리면 3번째 시도 혹은 2회 실패 시점에서 '강제 정답' 처리
        if (nextFailCount >= 2) {
          finalIsCorrect = true;
          userDisplayLabel = targetLetter; // 서버에는 정답을 쓴 것으로 전달
        } else {
          // 아직 기회가 남았을 때만 캔버스 초기화
          setTimeout(() => clearCanvas(), 500);
        }
      } else {
        setFailCount(0); // 맞추면 초기화
      }

      // 결과 전달
      await handleAnswer({
        user: userDisplayLabel,
        correct: item.letter,
        isCorrect: finalIsCorrect,
        responseTime: 0,
        concentration: {
          level: "high",
          focusRate: 1,
          faceDetected: true,
          attentionScore: 1,
        },
      });
    } catch (e) {
      console.error("[Submit Error]", e);
    } finally {
      if (worker) await worker.terminate(); // 워커 반드시 종료
      setBusy(false);
    }
  };

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const { clientX, clientY } = e.touches ? e.touches[0] : e;
    return { x: clientX - rect.left, y: clientY - rect.top };
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

  const isWorking = busy || isPredicting || isSubmitting;

  return (
    <div className="grid h-full grid-cols-12 gap-4 p-2">
      <div className="col-span-4 flex items-center justify-center bg-white border rounded-3xl">
        {item.type !== "letter" ? (
          <img
            src={getAsset({ content: item.letter })}
            className="max-h-[70%]"
            alt="target"
          />
        ) : (
          <>
            {" "}
            <img
              src={getAsset({ content: item.components[0] })}
              className="max-h-[30%]"
              alt="c1"
            />
            <span className="text-5xl font-bold">+</span>
            <img
              src={getAsset({ content: item.components[1] })}
              className="max-h-[30%]"
              alt="c2"
            />
          </>
        )}
      </div>

      <div className="col-span-8 flex flex-col gap-4">
        <div className="p-4 text-2xl font-black text-center bg-write-200 text-write-800 rounded-2xl border-b-4 border-write-300">
          {`"${item.letter}"${JOSA().c(item.letter, "을/를")} 직접 써보세요.`}
        </div>

        <div
          className="relative flex-1 bg-white border-4 border-dashed border-gray-100 rounded-3xl overflow-hidden"
          ref={parentRef}
        >
          {hint && (
            <div
              className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none text-[200px] font-black"
              style={{
                fontSize: responsiveConfig.fontSize,
                lineHeight: 1,
              }}
            >
              {item.letter}
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 z-10 touch-none cursor-crosshair"
            onMouseDown={(e) => {
              ctxRef.current.beginPath();
              ctxRef.current.moveTo(getPos(e).x, getPos(e).y);
              setIsDrawing(true);
            }}
            onMouseMove={(e) => {
              if (isDrawing) {
                ctxRef.current.lineTo(getPos(e).x, getPos(e).y);
                ctxRef.current.stroke();
              }
            }}
            onMouseUp={() => setIsDrawing(false)}
            onMouseLeave={() => setIsDrawing(false)}
            onTouchStart={(e) => {
              ctxRef.current.beginPath();
              ctxRef.current.moveTo(getPos(e).x, getPos(e).y);
              setIsDrawing(true);
            }}
            onTouchMove={(e) => {
              if (isDrawing) {
                ctxRef.current.lineTo(getPos(e).x, getPos(e).y);
                ctxRef.current.stroke();
              }
            }}
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
              className="w-16 h-16 text-3xl bg-white border-2 border-green-200 rounded-2xl shadow-lg text-green-500 flex items-center justify-center disabled:opacity-50"
            >
              {isWorking ? (
                <Loader2Icon className="animate-spin text-rose-400" />
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
