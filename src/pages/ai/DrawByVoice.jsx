import React, { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import MicToggleButton from "@/components/magicui/listening-indicator";
import Dialog from "@/components/Dialog";
import { ThreeDot } from "react-loading-indicators";
import { getPrepare, postTxt2Img } from "@/api/gpuService";
import useVoiceChat from "@/hooks/useVoiceChat";
import { Paintbrush, RotateCcw, ChevronUp, ChevronDown } from "lucide-react";

const SUBJECTS = [
  // --- 자연과 풍경 (기존 보완) ---
  "석양이 지는 붉은 바다와 수평선",
  "단풍 든 가을 산과 노란 들판",
  "눈 내린 작은 마을과 굴뚝 연기",
  "보름달이 뜬 푸른 밤하늘과 별",
  
  // --- 꽃과 식물 (구체적 형태) ---
  "들판에 활짝 핀 노란 해바라기",
  "화분에 담긴 분홍색 장미 꽃바구니",
  "초록색 잎이 무성한 커다란 선인장",
  "연못 위에 떠 있는 커다란 연꽃",

  // --- 동물 (움직임이 명확한) ---
  "풀밭 위에서 뛰노는 하얀 강아지",
  "지붕 위에서 잠을 자는 줄무늬 고양이",
  "푸른 하늘을 날아가는 커다란 독수리",
  "강가에서 헤엄치는 노란색 새끼 오리",

  // --- 정물과 음식 (형태가 뚜렷함) ---
  "바구니에 담긴 빨간 사과와 과일들",
  "식탁 위에 놓인 따뜻한 김이 나는 커피",
  "창가 옆에 놓인 여러 권의 두꺼운 책",
  "화려한 색깔의 3단 생일 케이크",

  // --- 동화적 풍경 (모델이 좋아하는 주제) ---
  "숲속의 작은 나무 오두막과 오솔길",
  "구름 위에 떠 있는 화려한 무지개",
  "바닷속을 헤엄치는 커다란 고래",
  "꽃밭 사이를 날아다니는 알록달록한 나비"
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

      <div className="w-1/3 flex flex-col gap-2 h-full">
        {/** SECTION: 화풍선택 및 도구 */}
        <div className="h-20 grid grid-cols-4 gap-2 shrink-0">
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
        </div>

        {/* SECTION: 주제 선택 화면 */}
        <div className="flex-[2.5] bg-white flex flex-col overflow-hidden rounded-xl shadow-sm border border-slate-100">
          <button
            onClick={() =>
              setSubjectIdx((p) => (p > 0 ? p - 1 : SUBJECTS.length - 1))
            }
            className="h-14 flex items-center justify-center text-slate-500 hover:bg-slate-50 shrink-0"
          >
            <ChevronUp size={44} strokeWidth={3} />
          </button>
          <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
            <div className="bg-blue-50 px-3 py-1 rounded-full mb-2">
              <span className="text-xl font-black text-blue-500 uppercase">
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
            className="h-14 flex items-center justify-center text-slate-500 hover:bg-slate-50 shrink-0"
          >
            <ChevronDown size={44} strokeWidth={3} />
          </button>
        </div>

        {/* SECTION: 동작 버튼 */}
        <div className="flex-1 flex gap-2 shrink-0">
          <div className="flex-1 flex justify-center">
            <MicToggleButton
              onStart={handleStartRecording}
              onStop={handleStopRecording}
              isListening={isRecording}
              micText="text-4xl"
              iconSize="size-12"
            />
          </div>
          <button
            onClick={handleManualGenerate}
            className="flex-1 bg-blue-600 border-b-[8px] border-blue-800 text-white rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
          >
            <Paintbrush size={40} />
            <span className="text-4xl font-black">그리기</span>
          </button>
        </div>
      </div>

      <Dialog isOpen={loading} onClose={() => {}}>
        <div className="text-center py-6 px-4 flex flex-col items-center gap-4">
          <ThreeDot variant="bounce" color="#2563eb" size="medium" />
          <p className="text-3xl font-black text-slate-800 break-keep">
            AI 화가가 <br/>
            <span className="text-blue-600">"{activePrompt}"를</span>
            <br />열심히 그리고 있어요!
          </p>
        </div>
      </Dialog>
    </div>
  );
}
