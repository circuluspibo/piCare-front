import React, { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import MicToggleButton from "@/components/magicui/listening-indicator";
import Dialog from "@/components/Dialog";
import { ThreeDot } from "react-loading-indicators";
import { getPrepare, postTxt2Img } from "@/api/gpuService";
import useVoiceChat from "@/hooks/useVoiceChat";
import { Paintbrush, ChevronUp, ChevronDown, Trash } from "lucide-react";

const SUBJECTS = [
  // --- 동물 ---
  "귀여운 강아지",
  "잠자는 고양이",
  "노란색 새끼 오리",
  "커다란 코끼리",
  "알록달록 앵무새",

  // --- 식물 ---
  "노란 해바라기",
  "빨간 장미꽃",
  "초록색 선인장",
  "커다란 나무",

  // --- 음식 ---
  "빨간 사과",
  "맛있는 수박",
  "생일 케이크",
  "노란 바나나",

  // --- 자연 ---
  "둥근 아침 해",
  "예쁜 무지개",
  "밤하늘 달과 별",
  "푸른 바다",

  // --- 사물/기타 ---
  "알록달록 우산",
  "하늘 위 비행기",
  "웃는 얼굴",
  "우리집 화분",
];

export default function DrawByVoice() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const parentRef = useRef(null);

  const [subjectIdx, setSubjectIdx] = useState(0);
  const [sketchModel, setSketchModel] = useState("real");
  const [loading, setLoading] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activePrompt, setActivePrompt] = useState(""); // 현재 생성 중인 키워드 저장용

  const {
    isRecording,
    handleStartRecording,
    handleStopRecording,
    resetVoiceChat,
    messages,
  } = useVoiceChat({
    enableTTS: false,
  });

  // 1. 공통 이미지 생성 함수 (핵심 로직 통합)
  const generateImage = useCallback(
    async (prompt) => {
      if (!prompt) return;
      setLoading(true);
      setActivePrompt(prompt);

      try {
        const res = await postTxt2Img(prompt, sketchModel);
        const img = new Image();
        img.src = res;
        img.onload = () => {
          if (!ctxRef.current || !canvasRef.current) return;
          ctxRef.current.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height,
          );
          ctxRef.current.drawImage(
            img,
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height,
          );
        };
      } catch (e) {
        console.error("그림 생성 실패:", e);
      } finally {
        setLoading(false);
        resetVoiceChat();
      }
    },
    [sketchModel, resetVoiceChat],
  );

  // 2. 음성 인식 완료 감지 시 자동 생성
  useEffect(() => {
    if (messages.length > 0 && !isRecording) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user") {
        generateImage(lastMessage.text);
      }
    }
  }, [messages, isRecording, generateImage]);

  // 3. [현재 로직] '그리기' 버튼 클릭 시 선택된 주제로 생성
  const handleManualGenerate = () => {
    generateImage(SUBJECTS[subjectIdx]);
  };

  // 캔버스 설정 및 리사이즈
  const updateCanvasSize = useCallback(() => {
    if (!canvasRef.current || !parentRef.current) return;
    canvasRef.current.width = parentRef.current.clientWidth;
    canvasRef.current.height = parentRef.current.clientHeight;
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 15;
    ctxRef.current = ctx;
  }, []);

  useEffect(() => {
    updateCanvasSize();
    getPrepare(1);
    window.addEventListener("resize", updateCanvasSize);
    return () => {
      getPrepare(0);
      window.removeEventListener("resize", updateCanvasSize);
    };
  }, [updateCanvasSize]);

  // 드로잉 핸들러
  const startDrawing = (e) => {
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  return (
    <div className="flex w-full h-full gap-4 overflow-hidden items-stretch">
      <div
        className="w-2/3 relative flex items-center justify-center"
        ref={parentRef}
      >
        <div className="w-full h-full bg-[#5D4037] rounded-2xl p-4 shadow-[inset_0_4px_10px_rgba(0,0,0,0.5),0_10px_20px_rgba(0,0,0,0.2)] relative flex items-center justify-center">
          <div className="absolute inset-4 shadow-[inset_0_4px_12px_rgba(0,0,0,0.4)] pointer-events-none z-20 rounded-sm" />
          <canvas
            ref={canvasRef}
            className={cn(
              "w-full h-full rounded-sm cursor-crosshair touch-none relative z-10",
              "shadow-[0_0_5px_rgba(0,0,0,0.2)]",
            )}
            style={{ backgroundColor: "#FCFAF2" }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
      </div>
      {/* <div className="h-20 grid grid-cols-4 gap-2 shrink-0">
          <button
            onClick={() =>
              ctxRef.current.clearRect(
                0,
                0,
                canvasRef.current.width,
                canvasRef.current.height,
              )
            }
            className="col-span-1 bg-rose-50 rounded-xl border-2 border-rose-100 flex items-center justify-center text-rose-500 active:bg-rose-100 active:scale-95 transition-all shadow-sm"
          >
            <RotateCcw size={36} />
          </button>
          <div className="col-span-3 bg-white flex p-1 rounded-2xl shadow-lg">
            {["real", "anim"].map((m) => (
              <button
                key={m}
                onClick={() => setSketchModel(m)}
                className={cn(
                  "flex-1 rounded-xl text-3xl font-black transition-all",
                  sketchModel === m
                    ? "bg-slate-800 text-white shadow-md"
                    : "text-slate-300",
                )}
              >
                {m === "real" ? "사진" : "그림"}
              </button>
            ))}
          </div>
        </div> */}
      <div className="w-1/3 flex flex-col gap-3 h-full">
        {/* 1. 주제 선택 섹션 (높이 비중 확대) */}
        <div className="flex-[3] bg-white flex flex-col overflow-hidden rounded-[2rem] shadow-lg border-2 border-amber-50">
          <button
            onClick={() =>
              setSubjectIdx((p) => (p > 0 ? p - 1 : SUBJECTS.length - 1))
            }
            className="h-10 flex items-center justify-center text-slate-300 hover:text-amber-500 hover:bg-amber-50 active:bg-amber-100 transition-all shrink-0"
          >
            <ChevronUp size={48} strokeWidth={4} />
          </button>

          <div className="flex-1 flex flex-col items-center justify-center px-2 text-center">
            <div className="bg-amber-100 px-2 py-1 rounded-full mb-2 shadow-sm">
              <span className="text-xl font-black text-amber-600 uppercase tracking-widest">
                추천 주제
              </span>
            </div>
            <p className="text-4xl font-black text-slate-900 leading-tight break-keep">
              {SUBJECTS[subjectIdx]}
            </p>
          </div>

          <button
            onClick={() =>
              setSubjectIdx((p) => (p < SUBJECTS.length - 1 ? p + 1 : 0))
            }
            className="h-10 flex items-center justify-center text-slate-300 hover:text-amber-500 hover:bg-amber-50 active:bg-amber-100 transition-all shrink-0"
          >
            <ChevronDown size={48} strokeWidth={4} />
          </button>
        </div>

        {/* 2. 동작 버튼 섹션 (마이크 + 실행 버튼) */}
        <div className="flex-[1.5] flex flex-col gap-3">
          {/* 마이크 영역: 중앙 정렬 및 여백 확보 */}

          <MicToggleButton
            onStart={handleStartRecording}
            onStop={handleStopRecording}
            isListening={isRecording}
            micText="text-4xl"
            iconSize="size-16"
          />

          {/* 지우기 & 그리기 버튼 그룹 */}
          <div className="h-20 flex gap-3">
            {/* 지우기 버튼: 아이콘을 강조한 정사각형 형태 */}
            <button
              onClick={() =>
                ctxRef.current.clearRect(
                  0,
                  0,
                  canvasRef.current.width,
                  canvasRef.current.height,
                )
              }
              className="w-28 bg-rose-50 rounded-xl border-b-[8px] border-rose-200 flex items-center justify-center text-rose-500 active:translate-y-1 active:border-b-0 transition-all shadow-sm hover:bg-rose-100"
              title="전체 지우기"
            >
              <Trash size={44} strokeWidth={3} />
            </button>

            {/* 그리기 버튼: 메인 액션 버튼으로 가장 크게 강조 */}
            <button
              onClick={handleManualGenerate}
              className="flex-1 bg-emerald-600 border-b-[8px] border-emerald-800 text-white rounded-xl flex items-center justify-center gap-2 active:translate-y-1 active:border-b-0 transition-all shadow-xl hover:bg-emerald-500"
            >
              <Paintbrush size={44} />
              <span className="text-4xl font-black">그리기</span>
            </button>
          </div>
        </div>
      </div>

      <Dialog isOpen={loading} onClose={() => {}}>
        <div className="text-center py-6 px-4 flex flex-col items-center gap-4">
          <ThreeDot variant="bounce" color="#2563eb" size="medium" />
          <p className="text-3xl font-black text-slate-800 break-keep">
            AI 화가가 <br />
            <span className="text-blue-600">"{activePrompt}"를</span>
            <br />
            열심히 그리고 있어요!
          </p>
        </div>
      </Dialog>
    </div>
  );
}
