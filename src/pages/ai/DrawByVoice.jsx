import React, { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import MicToggleButton from "@/components/magicui/listening-indicator";
import Dialog from "@/components/Dialog";
import { ThreeDot } from "react-loading-indicators";
import { getPrepare, postTxt2Img } from "@/api/gpuService";
import useVoiceChat from "@/hooks/useVoiceChat";

export default function DrawByVoice() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const parentRef = useRef(null);

  const [sketchPrompt, setSketchPrompt] = useState("");
  const [sketchModel, setSketchModel] = useState("real");
  const [loading, setLoading] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const {
    isRecording,
    handleStartRecording,
    handleStopRecording,
    resetVoiceChat,
    messages,
  } = useVoiceChat({
    enableTTS: false,
  });
  // 음성 인식 및 이미지 생성 핸들러
  const handleStopAndGenerate = useCallback(async () => {
    try {
      handleStopRecording(); // 수정: 훅의 중지 함수 호출
    } catch (error) {
      console.log("[FAILED] Stop and Generate IMG MSG: ", error);
    }
  }, [handleStopRecording]);
  // 캔버스 초기화 및 AI 모델 준비
  useEffect(() => {
    const updateCanvasSize = () => {
      const canvas = canvasRef.current;
      const parent = parentRef.current;
      if (!canvas || !parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      const ctx = canvas.getContext("2d");
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 15;
      ctxRef.current = ctx;
    };

    updateCanvasSize();
    getPrepare(1); // 모델 준비
    window.addEventListener("resize", updateCanvasSize);
    return () => {
      window.removeEventListener("resize", updateCanvasSize);
      getPrepare(0); // 모델 해제
    };
  }, []);

  // 음성 메시지 감지
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user") setSketchPrompt(lastMessage.text);
    }
  }, [messages]);

  // 이미지 생성 및 캔버스 출력
  const handleGenerateImg = useCallback(async () => {
    if (!sketchPrompt) return;
    setLoading(true);

    try {
      const res = await postTxt2Img(sketchPrompt, sketchModel);
      const img = new Image();
      img.src = res;
      img.onload = () => {
        const ctx = ctxRef.current;
        const canvas = canvasRef.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height); // 간략화된 그리기 로직
      };
    } catch (error) {
      console.log("[FAIELD] handleGenerateImg MSG: ", error);
    } finally {
      resetVoiceChat();
      setSketchPrompt("");
      setLoading(false);
    }
  }, [sketchPrompt, sketchModel, resetVoiceChat]);

  useEffect(() => {
    if (sketchPrompt && !isRecording) handleGenerateImg();
  }, [sketchPrompt, isRecording, handleGenerateImg]);

  // 드로잉 로직 (기존 getPos, startDraw 등 유지)
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches?.[0] || e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  const startDraw = (e) => {
    setIsDrawing(true);
    const p = getPos(e);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(p.x, p.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const p = getPos(e);
    ctxRef.current.lineTo(p.x, p.y);
    ctxRef.current.stroke();
  };

  // 전체 삭제 기능 구현
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);
  return (
    <>
      <div className="flex w-full h-full space-x-6">
        <div className="w-3/4 relative group" ref={parentRef}>
          <div className="w-full h-full p-4 bg-[#dcc6a1] rounded-sm shadow-xl border-[10px] border-[#8b5a2b] relative overflow-hidden">
            <canvas
              ref={canvasRef}
              className="w-full h-full bg-white cursor-crosshair touch-none relative z-10"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={() => setIsDrawing(false)}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={() => setIsDrawing(false)}
            />
          </div>
        </div>
        <div className="w-1/4 flex flex-col space-y-4">
          {/* 스타일 스위치 */}
          <div className="bg-white/50 p-2 rounded-3xl shadow-sm border-2 border-stone-200 grid gap-2">
            <p className="text-center text-xl text-stone-400 font-bold">
              화풍 선택
            </p>
            <button
              onClick={() => setSketchModel("real")}
              className={cn(
                "h-20 text-3xl rounded-2xl transition-all border-b-8 active:border-b-0 active:translate-y-1",
                sketchModel === "real"
                  ? "bg-violet-200 border-violet-300 text-violet-900"
                  : "bg-gray-100 border-gray-300 text-gray-400",
              )}
            >
              사진처럼
            </button>
            <button
              onClick={() => setSketchModel("anim")}
              className={cn(
                "h-20 text-3xl font-black rounded-2xl transition-all border-b-8 active:border-b-0 active:translate-y-1",
                sketchModel === "anim"
                  ? "bg-lime-200 border-lime-300 text-lime-900"
                  : "bg-gray-100 border-gray-300 text-gray-400",
              )}
            >
              그림처럼
            </button>
          </div>

          {/* 액션 버튼 */}
          <div className="flex flex-col flex-1 gap-3">
            <button
              onClick={clearCanvas}
              className="flex-1 flex items-center justify-center bg-rose-50 border-2 border-rose-100 text-rose-600 rounded-xl shadow-sm hover:bg-rose-100 transition-colors"
            >
              <span className="text-3xl font-black">도화지 교체</span>
            </button>

            <div className="flex-[1.5] relative">
              <MicToggleButton
                onStart={handleStartRecording}
                onStop={handleStopAndGenerate}
                isListening={isRecording}
                className="w-full h-full flex flex-col items-center justify-center"
                iconSize="size-20"
                micText="text-[38px]"
              />
            </div>
          </div>
        </div>
      </div>
      <Dialog
        isOpen={loading}
        onClose={() => setLoading(false)}
        title="이미지 생성 중"
      >
        <div className="text-center flex flex-col items-center gap-6">
          <div className="space-y-4">
            <div className="flex justify-center">
              <ThreeDot
                variant="bounce"
                color="oklch(54.6% 0.245 262.881)"
                size="large"
              />
            </div>

            <h2 className="text-5xl font-black text-slate-900 leading-snug break-keep">
              AI 화가가 <br />
              <span className="text-blue-600 underline decoration-wavy">
                "{sketchPrompt || "바다"}"
              </span>
              를 <br />
              열심히 그리고 있어요!
            </h2>
          </div>
        </div>
      </Dialog>
    </>
  );
}
