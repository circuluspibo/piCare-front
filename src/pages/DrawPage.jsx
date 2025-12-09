import React, { useRef, useState, useEffect, useCallback } from "react";
import { ArrowBigLeft } from "lucide-react";
import Prompt from "@/components/Prompt";
import { useNavigate } from "react-router-dom";

export default function DrawPage() {
  const navigation = useNavigate();
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const parentRef = useRef(null);

  // 1. 도구 상태 추가 및 초기값 설정
  const [tool, setTool] = useState("pencil");
  const [isDrawing, setIsDrawing] = useState(false);

  const promptSize = {
    text: "text-3xl",
    mic: "text-5xl",
  };

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

  // 드로잉 시작 (연필/지우개 설정)
  const startDraw = useCallback(
    (e) => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      setIsDrawing(true);
      const p = getPos(e);

      if (tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = 40; // 지우개 크기
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "#000"; // 연필 색상
        ctx.lineWidth = 25; // 연필 크기
      }

      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    },
    [getPos, tool]
  );

  // 드로잉/지우기 진행
  const draw = useCallback(
    (e) => {
      const ctx = ctxRef.current;
      if (!isDrawing || !ctx) return;

      if (e.touches) e.preventDefault();

      const p = getPos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    },
    [isDrawing, getPos]
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
    const canvas = canvasRef.current;
    if (!canvas || !parentRef.current) return;

    canvas.width = parentRef.current.clientWidth;
    canvas.height = parentRef.current.clientHeight;

    const ctx = canvas.getContext("2d");

    // 초기 context 스타일 설정
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 25;

    ctxRef.current = ctx;

    clearCanvas();

    const handleResize = () => {
      canvas.width = parentRef.current.clientWidth;
      canvas.height = parentRef.current.clientHeight;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      clearCanvas();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [clearCanvas]);

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

  return (
    <div className="flex flex-col w-full h-full p-4">
      <header className="flex flex-row items-center pb-2 mb-2 border-b">
        <ArrowBigLeft
          className="w-6 h-6 mr-2 cursor-pointer"
          onClick={() => navigation("/")}
        />
        <h1 className="text-2xl font-bold">AI를 통한 그림그리기</h1>
      </header>

      <div className="flex flex-1 gap-2 h-[calc(100%-70px)]">
        {/* SECTION: 캔버스 영역 70% */}
        <div className="w-3/5 p-2">
          <div
            className="w-full h-full"
            style={{ minHeight: 400 }}
            ref={parentRef}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full block bg-white"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            ></canvas>
          </div>
        </div>
        {/* SECTION: 사이드 영역 - 30% */}
        <div className="w-2/5 flex flex-col gap-2">
          <div className="border p-3 rounded-md">
            <p className="font-semibold mb-2">그리기 도구</p>
            <div className="flex flex-col gap-2 text-2xl">
              <div className="w-full">
                <button
                  className={`px-3 py-2 rounded w-1/2 ${
                    tool === "pencil" ? "bg-gray-200 font-bold" : "bg-white"
                  }`}
                  onClick={() => setTool("pencil")}
                >
                  ✏️ 연필
                </button>
                <button
                  className={`px-3 py-2 rounded w-1/2 ${
                    tool === "eraser" ? "bg-gray-200 font-bold" : "bg-white"
                  }`}
                  onClick={() => setTool("eraser")}
                >
                  🧹 지우개
                </button>
              </div>
              <button
                className="px-3 py-2 rounded bg-red-100"
                onClick={clearCanvas}
              >
                🗑️ 모두 지우기
              </button>
            </div>
          </div>

          <div className="border p-3 rounded-md flex-1 overflow-hidden">
            <Prompt textSize={promptSize} />
          </div>
        </div>
      </div>
    </div>
  );
}
