import React, { useRef, useState, useEffect, useCallback } from "react";
import { ArrowBigLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MicToggleButton from "@/components/magicui/listening-indicator";
import { IconRenderer } from "@/components/ui/IconRenderer";
import Dialog from "@/components/Dialog";
import DRAW_TOOLS from "@/assets/data/DrawTools";
import DRAW_OPTIONS from "@/assets/data/DrawOptions";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

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
  const [isRecording, setIsRecording] = useState(false);
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
  const { startSpeechRecognition, stopSpeechRecognition } =
    useSpeechRecognition({
      onTextChange: setSketchPrompt,
      onRecordingChange: setIsRecording,
    });

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

  // 그리기 도구 그리기
  // const drawShape = useCallback(
  //   (shapeName) => {
  //     const canvas = canvasRef.current;
  //     const ctx = ctxRef.current;
  //     if (!canvas || !ctx) return;

  //     // 그리기 전 스타일 설정
  //     ctx.globalCompositeOperation = "source-over";
  //     ctx.strokeStyle = PENCIL_COLOR;
  //     ctx.lineWidth = PENCIL_WIDTH;

  //     const shape = DRAW_OPTIONS.find((s) => s.name === shapeName);
  //     if (shape) {
  //       clearCanvas();
  //       shape.draw(ctx, canvas);
  //     }
  //   },
  //   [clearCanvas]
  // );

  // 캔버스 초기화 및 context 설정
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !parentRef.current) return;

    // 초기 크기 설정 (여기서 한 번 초기화됨)
    canvas.width = parentRef.current.clientWidth;
    canvas.height = parentRef.current.clientHeight;

    const ctx = canvas.getContext("2d");

    // 초기 context 스타일 설정
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 25;

    ctxRef.current = ctx;

    // **수정된 handleResize 함수:**
    const handleResize = () => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !ctx) return;

      // 1. 현재 캔버스 내용을 Data URL로 저장
      const dataURL = canvas.toDataURL();

      // 2. 새로운 크기 계산
      const newWidth = parentRef.current.clientWidth;
      const newHeight = parentRef.current.clientHeight;

      // 3. 캔버스 크기 재조정 (여기서 픽셀 데이터가 지워집니다)
      canvas.width = newWidth;
      canvas.height = newHeight;

      // 4. Context 설정 복원
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 25;
      ctx.globalCompositeOperation = "source-over";

      // 5. 이미지 객체를 생성하여 저장했던 Data URL을 캔버스에 다시 그립니다.
      const img = new Image();
      img.onload = function () {
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
      };
      img.src = dataURL;
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
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

  // 그리기 도구 핸들러
  // const handleTools = useCallback(
  //   (tool) => {
  //     const draw = tool.toLocaleLowerCase();
  //     draw === "x" ? clearCanvas : setTool(draw);
  //   },
  //   [setTool, clearCanvas]
  // );

  // AI 모델 변경함수
  const preparedModel = useCallback(async (mode) => {
    const res = await fetch(
      `http://127.0.0.1:59532/prepare?` +
        new URLSearchParams({
          mode: mode,
        })
    );
    return res;
  });

  // 이미지 전송 전처리
  // const imgWithBackgroundToBlob = useCallback((origin) => {
  //   const exportCanvas = document.createElement("canvas");
  //   exportCanvas.width = origin.width;
  //   exportCanvas.height = origin.height;

  //   const exportCtx = exportCanvas.getContext("2d");
  //   if (!exportCtx) return;

  //   // 흰색 배경 채우기
  //   exportCtx.fillStyle = "#ffffff";
  //   exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

  //   // 기존 캔버스 내용을 위에 덮기.
  //   exportCtx.drawImage(origin, 0, 0);

  //   return new Promise((resolve) => exportCanvas.toBlob(resolve, "image/png"));
  // }, []);

  // 생성된 이미지 그리기
  const drawImageToCanvas = useCallback(
    (imageSrc) => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !ctx) return;

      const img = new Image();
      img.src = imageSrc;

      img.onload = () => {
        // **핵심 수정 부분:** 새로운 이미지를 그리기 전에 캔버스 전체를 지웁니다.
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 지우개 모드(destination-out) 등으로부터 안전하게 기본 모드로 복원
        ctx.globalCompositeOperation = "source-over";

        // 이미지를 캔버스 전체에 그립니다.
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
    },
    [canvasRef, ctxRef] // canvasRef와 ctxRef를 의존성 배열에 포함합니다.
  );
  // 이미지 생성 API
  const handleGenerateImg = useCallback(async () => {
    setLoading(true);
    try {
      const finalPrompt = (sketchPrompt || "사과를 그려줘").trim();
      const baseURL = "http://127.0.0.1:59532";

      // 1. URLSearchParams를 사용하여 쿼리 문자열 생성
      const params = new URLSearchParams({
        prompt: finalPrompt,
        model: sketchModel,
        seed: Math.floor(Math.random() * 1000000), // 매번 다른 시드값 권장
        lang: "ko",
      });
      setLoadingText(`${finalPrompt}으로 이미지 생성중`);
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
      setLoading(false);
    }
  }, [sketchPrompt, sketchModel, drawImageToCanvas]);

  // 음성 인식 및 이미지 생성 핸들러
  const handleStopAndGenerate = useCallback(async () => {
    await stopSpeechRecognition();
    if (!aiModelRef.current) {
      setLoading(true);
      setLoadingText("이미지 생성을 위한 모델로 전환중");
      aiModelRef.current = true;
      await preparedModel(1);
      setLoading(false);
    }
    await handleGenerateImg();
  }, [
    setLoading,
    setLoadingText,
    stopSpeechRecognition,
    preparedModel,
    handleGenerateImg,
  ]);

  useEffect(() => {
    return () => {
      // Unmoute시 모델 다시 변경
      preparedModel(0);
    };
  }, []);

  return (
    <div className="flex flex-col w-full h-full p-4">
      <header className="flex flex-row items-center pb-2 mb-2 border-b">
        <ArrowBigLeft
          className="size-10 mr-2 cursor-pointer"
          onClick={() => navigation("/")}
        />
        <h1 className="text-4xl font-bold">AI를 통한 그림그리기</h1>
      </header>

      <div className="flex flex-1 gap-2 h-[calc(100%-70px)]">
        {/* SECTION: 캔버스 영역 70% */}
        <div className="w-3/5 p-2">
          <div
            className="relative w-full h-full"
            style={{ minHeight: 400 }}
            ref={parentRef}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full block bg-white"
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
            {/** 커서 */}
            <div
              ref={cursorRef}
              className={`absolute pointer-events-none rounded-full ${
                tool === "eraser"
                  ? "border-4 border-red-500 border-dashed bg-red-200/30"
                  : "border-2 border-black bg-black/10"
              }`}
              style={{
                width: cursorSize,
                height: cursorSize,
                transform: "translate(-50%, -50%)",
                display: isDrawing ? "block" : "none",
                boxShadow:
                  tool === "eraser"
                    ? "0 0 0 2px rgba(239,68,68,0.5)"
                    : "0 0 8px rgba(0,0,0,0.5)",
              }}
            />
          </div>
        </div>
        {/* SECTION: 사이드 영역 - 30% */}
        <div className="w-2/5 flex flex-col gap-2">
          <div className="border p-3 rounded-md h-full flex flex-col space-y-2 justify-between">
            <div className="border p-3 rounded-md">
              {/* 모델 선택 영역: 좁아진 너비에 맞춰 버튼을 세로(flex-col)로 배치 */}
              <div className="flex flex-col gap-2">
                <button
                  className={`px-3 py-4 rounded border shadow-md font-bold transition-colors ${
                    sketchModel === "real"
                      ? "bg-black text-white"
                      : "bg-white text-black hover:bg-gray-100"
                  }`}
                  onClick={() => setSketchModel("real")}
                >
                  실사화
                </button>
                <button
                  className={`px-3 py-4 rounded border shadow-md font-bold transition-colors ${
                    sketchModel === "anim"
                      ? "bg-black text-white"
                      : "bg-white text-black hover:bg-gray-100"
                  }`}
                  onClick={() => setSketchModel("anim")}
                >
                  애니메이션
                </button>
              </div>
            </div>
            <MicToggleButton
              onStart={startSpeechRecognition}
              onStop={handleStopAndGenerate}
              isListening={isRecording}
              micText={"text-6xl"}
            />
          </div>
        </div>
      </div>
      <Dialog
        isOpen={loading}
        onClose={() => setLoading(false)}
        title="잠시만 기다려주세요..."
        titleStyle="text-4xl font-bold text-black-600 mb-6"
      >
        <p className="text-2xl text-gray-500">{loadingText}...</p>
      </Dialog>
    </div>
  );
}
