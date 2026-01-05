import React, { useRef, useState, useEffect, useCallback } from "react";
import { ArrowBigLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MicToggleButton from "@/components/magicui/listening-indicator";
import Dialog from "@/components/Dialog";
import { cn } from "@/lib/utils";
import useVoiceChat from "@/hooks/useVoiceChat"; // 수정: 통합 훅 임포트

export default function DrawPage() {
  const navigation = useNavigate();

  // Refs
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const parentRef = useRef(null);
  const cursorRef = useRef(null);
  const aiModelRef = useRef(null);

  // States
  const [sketchPrompt, setSketchPrompt] = useState("");
  const [sketchModel, setSketchModel] = useState("real"); // 'real' || 'anim'
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [tool, setTool] = useState("pencil");
  const [isDrawing, setIsDrawing] = useState(false);

  // Canvas
  const PENCIL_WIDTH = 10;
  const PENCIL_COLOR = "#000";
  const ERASER_WIDTH = 40;
  const cursorSize = ERASER_WIDTH;

  // Hooks
  const {
    isRecording,
    handleStartRecording,
    handleStopRecording,
    resetVoiceChat,
    messages,
  } = useVoiceChat({
    enableTTS: false, // 그림 그리기에서는 대화 TTS 비활성화
  });

  // messages가 업데이트되면 마지막 user 메시지를 추출하여 프롬프트로 설정
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user") {
        setSketchPrompt(lastMessage.text);
      }
    }
  }, [messages]);

  // 마우스/터치 위치 계산 함수
  const getPos = useCallback((e) => {
    if (
      e.nativeEvent.offsetX !== undefined &&
      e.nativeEvent.offsetY !== undefined
    ) {
      return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
    }

    // 터치 이벤트 처리
    const touch = e.touches?.[0] || e.changedTouches?.[0];
    if (touch && e.target) {
      const rect = e.target.getBoundingClientRect();
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  }, []);

  const moveCursor = useCallback((e) => {
    const canvas = canvasRef.current;
    const cursor = cursorRef.current;

    if (!canvas || !cursor) return;

    const rect = canvas.getBoundingClientRect();

    const clientX = e.touches?.[0]?.clientX ?? e.clientX;
    const clientY = e.touches?.[0]?.clientY ?? e.clientY;

    cursor.style.left = `${clientX - rect.left}px`;
    cursor.style.top = `${clientY - rect.top}px`;
  }, []);

  // Draw
  const startDraw = useCallback(
    (e) => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      moveCursor(e);
      setIsDrawing(true);
      const p = getPos(e);

      if (tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = ERASER_WIDTH; // 지우개 크기
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = PENCIL_COLOR; // 연필 색상
        ctx.lineWidth = PENCIL_WIDTH; // 연필 크기
      }

      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    },
    [getPos, tool, moveCursor]
  );
  // 드로잉/지우기 진행
  const draw = useCallback(
    (e) => {
      const ctx = ctxRef.current;
      if (!isDrawing || !ctx) return;

      // if (e.touches) e.preventDefault();

      moveCursor(e);
      const p = getPos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    },
    [isDrawing, getPos, moveCursor]
  );

  // 드로잉 종료
  const endDraw = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    setIsDrawing(false);
    ctx.closePath();

    // 지우개 모드 복원
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "source-over";
    }
  }, [tool]);

  // 전체 삭제 기능 구현
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  // 캔버스 초기화 및 context 설정
  useEffect(() => {
    const updateCanvasSize = () => {
      const canvas = canvasRef.current;
      const parent = parentRef.current;
      if (!canvas || !parent) return;

      // 화면에 보이는 크기만큼 픽셀 해상도를 할당 (비율 왜곡 방지)
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;

      // 크기가 변하면 컨텍스트 설정이 초기화되므로 다시 설정
      const ctx = canvas.getContext("2d");
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 15;
      ctxRef.current = ctx;
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (ctx) {
      if (tool === "pencil") {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 25;
      }
    }
  }, [tool]);

  // AI 모델 변경함수
  const preparedModel = useCallback(async (mode) => {
    const res = await fetch(
      `http://127.0.0.1:59532/prepare?` +
        new URLSearchParams({
          mode: mode,
        })
    );
    return res;
  }, []);

  // 생성된 이미지 그리기
  const drawImageToCanvas = useCallback((imageSrc) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const img = new Image();
    img.src = imageSrc;

    img.onload = () => {
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. 비율 계산
      const canvasAspect = canvas.width / canvas.height;
      const imgAspect = img.width / img.height;

      let drawWidth, drawHeight, offsetX, offsetY;

      // 2. 짤리지 않게 크기 결정 (Object-fit: contain 방식)
      if (imgAspect > canvasAspect) {
        // 이미지가 가로로 더 긴 경우 -> 너비 기준
        drawWidth = canvas.width;
        drawHeight = canvas.width / imgAspect;
        offsetX = 0;
        offsetY = (canvas.height - drawHeight) / 2;
      } else {
        // 이미지가 세로로 더 긴 경우 -> 높이 기준
        drawHeight = canvas.height;
        drawWidth = canvas.height * imgAspect;
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = 0;
      }

      // 3. 이미지 그리기
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    };
  }, []);

  // 이미지 생성 API
  const handleGenerateImg = useCallback(async () => {
    setLoading(true);
    try {
      const baseURL = "http://127.0.0.1:59532";

      if (!sketchPrompt) return;
      // 1. URLSearchParams를 사용하여 쿼리 문자열 생성
      const params = new URLSearchParams({
        prompt: sketchPrompt,
        model: sketchModel,
        seed: 0, // 매번 다른 시드값 권장
        lang: "ko",
      });
      setLoadingText(`"${sketchPrompt}"으로 이미지 생성중...`);
      // 2. Fetch 호출 (Body는 비우고 URL에 파라미터 포함)
      const res = await fetch(`${baseURL}/txt2img?${params.toString()}`, {
        method: "POST", // 방식은 POST 유지
      });

      if (!res.ok) throw new Error(`ERROR: ${res.status}`);

      const imageBlob = await res.blob();
      const imageURL = URL.createObjectURL(imageBlob);
      drawImageToCanvas(imageURL);
    } catch (error) {
      console.error("ERROR : ", error);
    } finally {
      resetVoiceChat();
      setSketchPrompt("");
      setLoading(false);
    }
  }, [sketchPrompt, sketchModel, drawImageToCanvas, resetVoiceChat]);

  // 음성 인식 및 이미지 생성 핸들러
  const handleStopAndGenerate = useCallback(async () => {
    try {
      handleStopRecording(); // 수정: 훅의 중지 함수 호출
      if (!aiModelRef.current) {
        aiModelRef.current = true;
        await preparedModel(1);
      }
    } catch (error) {
      console.log("Faild to Stop and Generate IMG", error);
    }
  }, [handleStopRecording, preparedModel]);

  useEffect(() => {
    if (sketchPrompt && !isRecording && aiModelRef.current) {
      handleGenerateImg();
    }
  }, [sketchPrompt, isRecording, handleGenerateImg]);

  useEffect(() => {
    return () => {
      // Unmoute시 모델 다시 변경
      preparedModel(0);
    };
  }, [preparedModel]);

  return (
    <div className="flex flex-col w-full h-full p-4 bg-gray-50 overflow-hidden font-extrabold">
      {/* SECTION: 헤더 (연결성 강화) */}
      <header className="flex flex-col items-start pb-4 border-b mb-4 text-[#2D3A5A]">
        <div className="flex items-center text-4xl">
          <ArrowBigLeft
            className="size-14 mr-2"
            onClick={() => navigation("/")}
          />
          <span>말하는 대로 그리기</span>
        </div>
      </header>

      <main className="flex flex-grow space-x-6 overflow-hidden p-3">
        {/* SECTION: 캔버스 판 (70%) */}
        <div className="w-3/4 relative" ref={parentRef}>
          <div className="w-full h-full rounded-3xl shadow-sm bg-white overflow-hidden relative">
            <canvas
              ref={canvasRef}
              onMouseDown={startDraw}
              onMouseMove={(e) => {
                moveCursor(e);
                draw(e);
              }}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={(e) => {
                moveCursor(e);
                draw(e);
              }}
              onTouchEnd={endDraw}
            />
            {/* 커서 가이드 */}
            {/* <div
              ref={cursorRef}
              className={`absolute pointer-events-none rounded-full border-4 ${
                tool === "eraser"
                  ? "border-red-500 bg-red-100/50 border-dashed"
                  : "border-blue-500 bg-blue-100/30"
              }`}
              style={{
                width: cursorSize,
                height: cursorSize,
                transform: "translate(-50%, -50%)",
                display: "block",
              }}
            /> */}
          </div>
        </div>

        {/* 3. 오른쪽 영역: 조작 버튼 */}
        <div className="w-4/12 flex flex-col gap-4">
          {/* 스타일 스위치 영역 */}
          <div className="bg-white p-3 rounded-3xl border-2 border-gray-100 flex flex-col gap-3">
            <button
              onClick={() => setSketchModel("real")}
              className={cn(
                "h-20 text-3xl font-black rounded-2xl transition-all duration-200", // 애니메이션 추가
                sketchModel === "real"
                  ? "bg-orange-600 text-white shadow-lg" // 선택 시 스타일 강조
                  : "bg-gray-100 text-gray-400 border-transparent" // 미선택 시
              )}
            >
              사진처럼
            </button>
            <button
              onClick={() => setSketchModel("anim")}
              className={cn(
                "h-20 text-3xl font-black rounded-2xl",
                sketchModel === "anim"
                  ? "bg-lime-600 text-white"
                  : "bg-gray-100 text-gray-400"
              )}
            >
              만화처럼
            </button>
          </div>

          {/* 액션 버튼 리스트 (IndexPage 스타일 계승) */}
          <div className="flex flex-col flex-1 gap-4">
            <button
              onClick={clearCanvas}
              className="flex-1 flex flex-col items-center justify-center bg-red-100 text-red-800 rounded-2xl"
            >
              <span className="text-3xl font-black">전체삭제</span>
            </button>

            {/* 마이크 버튼 (최우선 버튼) */}
            <div className="flex-[1.5] relative">
              <MicToggleButton
                onStart={handleStartRecording}
                onStop={handleStopAndGenerate}
                isListening={isRecording}
                className="w-full h-full flex flex-col items-center justify-center"
                iconSize="size-24"
                micText="text-[54px] font-black"
              />
            </div>
          </div>
        </div>
      </main>

      {/* 로딩 다이얼로그 (일관된 스타일) */}
      <Dialog
        isOpen={loading}
        onClose={() => setLoading(false)}
        title="잠시만 기다려 주세요"
      >
        <div className="text-center p-10 flex flex-col items-center">
          <div className="w-20 h-20 border-8 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-8" />
          <p className="text-3xl font-black text-gray-700 break-keep">
            {loadingText}
          </p>
        </div>
      </Dialog>
    </div>
  );
}
