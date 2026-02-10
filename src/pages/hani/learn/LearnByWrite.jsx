/* eslint-disable react-hooks/exhaustive-deps */
import React, { useRef, useState, useEffect } from "react";
import { Loader2Icon, Eraser, Lightbulb, CheckCircle2 } from "lucide-react";
import { JOSA } from "@/utils/haniUtil";
import { getAsset } from "@/api/haniService";
import { useIntegratedMonitor } from "@/hooks/useIntegratedMonitor";

const LearnByWrite = ({
  item,
  target,
  handleAnswer,
  currentItemIdx,
  currentLearningCount,
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [hint, setHint] = useState(true);
  const [busy, setBusy] = useState(false);

  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const parentRef = useRef(null);

  const { startQuestion, submitAnswer } = useIntegratedMonitor();

  // 1️⃣ 캔버스 초기화 및 설정
  useEffect(() => {
    startQuestion();
    const canvas = canvasRef.current;
    canvas.width = parentRef.current.clientWidth;
    canvas.height = parentRef.current.clientHeight;
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 18; // 필기 인식에 적합한 두께
    ctxRef.current = ctx;
    clearCanvas();
  }, [currentItemIdx, currentLearningCount]);

  const clearCanvas = () => {
    ctxRef.current.clearRect(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height,
    );
  };

  // 드로잉 좌표 계산
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    if (busy) return;
    const { x, y } = getPos(e);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || busy) return;
    const { x, y } = getPos(e);
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
  };

  // 2️⃣ Tesseract.js를 이용한 오프라인 판별 로직
  const handleSubmit = async () => {
    setBusy(true);
    try {
      // 투명 배경을 흰색으로 합성 (OCR 성능 향상 필수)
      const canvas = canvasRef.current;
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tCtx = tempCanvas.getContext("2d");
      tCtx.fillStyle = "#FFFFFF";
      tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      tCtx.drawImage(canvas, 0, 0);

      // Tesseract 워커 생성 (한글 모드)

      // 인식 결과 정제 (공백 및 줄바꿈 제거)
      const userAnswer = "text".replace(/\s/g, "");
      const isCorrect = userAnswer.includes(item.letter); // 포함 여부로 체크 (필기 특성상 공백 포함 가능성)

      const monData = submitAnswer(userAnswer, item.letter);

      handleAnswer({
        user: userAnswer,
        correct: item.letter,
        isCorrect,
        responseTime: monData.solvingTime,
        concentration: {
          level: "high",
          focusRate: 100,
          faceDetected: true,
          attentionScore: 1,
        },
      });

      if (!isCorrect) clearCanvas();
    } catch (e) {
      console.error("인식 중 오류 발생:", e);
    } finally {
      setBusy(false);
    }
  };

  // 1️⃣ 캔버스 초기화 및 실시간 크기 최적화
  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = parentRef.current;
    if (!canvas || !parent) return;

    // 부모 크기에 캔버스 해상도를 맞추는 함수
    const updateCanvasSize = () => {
      // 1. 현재 그려진 내용 백업
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      tempCtx.drawImage(canvas, 0, 0);

      // 2. 캔버스 해상도를 부모 크기와 일치시킴
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;

      // 3. 컨텍스트 설정 다시 세팅 (크기 바뀌면 초기화됨)
      const ctx = canvas.getContext("2d");
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 18;
      ctxRef.current = ctx;

      // 4. 백업된 내용 복원 (리사이즈 시 그림 유지하고 싶다면)
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
    };

    // 부모 요소의 크기 변화를 감지하는 옵저버
    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });

    resizeObserver.observe(parent);
    startQuestion(); // 문항 시작 측정

    return () => {
      resizeObserver.disconnect();
    };
  }, [currentItemIdx, currentLearningCount]);

  return (
    <div className="grid h-full grid-cols-12 gap-4">
      {/* 왼쪽: 가이드 이미지 */}
      <div className="col-span-4 bg-white border rounded-lg shadow-sm flex items-center justify-center p-6">
        <img
          src={getAsset({ content: item.letter, type: "write" })}
          className="w-2/3 h-auto"
          alt="hint"
          onError={(e) => (e.target.style.display = "none")}
        />
      </div>

      {/* 오른쪽: 쓰기 영역 */}
      <div className="col-span-8 grid grid-rows-[auto_1fr] gap-4">
        <div className="p-3 text-2xl font-bold text-center bg-rose-200 border rounded-lg shadow-sm">
          {`"${item.letter}"${JOSA().c(item.letter, "을/를")} 직접 써보세요.`}
        </div>

        <div
          className="relative bg-white border rounded-lg shadow-sm overflow-hidden"
          ref={parentRef}
        >
          {hint && (
            <div className="absolute inset-0 flex items-center justify-center text-[15rem] font-black text-gray-100 select-none pointer-events-none">
              {item.letter}
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

          {/* 도구 버튼들 */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-4">
            <button
              onClick={() => setHint(!hint)}
              className={`p-4 rounded-xl shadow-md border ${hint ? "bg-amber-100" : "bg-white"}`}
            >
              <Lightbulb
                size={40}
                className={hint ? "text-amber-500" : "text-gray-400"}
              />
            </button>
            <button
              onClick={clearCanvas}
              className="p-4 bg-white rounded-xl shadow-md border hover:bg-red-50"
            >
              <Eraser size={40} className="text-red-500" />
            </button>
            <button
              onClick={handleSubmit}
              disabled={busy}
              className="p-4 bg-rose-500 rounded-xl shadow-md text-white hover:bg-rose-600 disabled:bg-gray-300"
            >
              {busy ? (
                <Loader2Icon size={40} className="animate-spin" />
              ) : (
                <CheckCircle2 size={40} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearnByWrite;
