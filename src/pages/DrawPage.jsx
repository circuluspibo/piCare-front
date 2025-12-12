import React, { useRef, useState, useEffect, useCallback } from "react";
import { ArrowBigLeft, Eraser, Pencil, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MicToggleButton from "@/components/magicui/listening-indicator";
import { IconRenderer } from "@/components/ui/IconRenderer";

export default function DrawPage() {
  const navigation = useNavigate();
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const parentRef = useRef(null);

  const PENCIL_WIDTH = 22;
  const PENCIL_COLOR = '#000';
  const ERASER_WIDTH = 40;
  const SAMPLE_SIZE = 0.8
  // 1. 도구 상태 추가 및 초기값 설정
  const [tool, setTool] = useState("pencil");
  const [isDrawing, setIsDrawing] = useState(false);

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
        ctx.lineWidth = ERASER_WIDTH; // 지우개 크기
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = PENCIL_COLOR; // 연필 색상
        ctx.lineWidth = PENCIL_WIDTH; // 연필 크기
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

  // 도형 예시
  const shapeExamples = [
    {
      name: 'Circle',
      draw: (ctx, canvas) => {
        const size = Math.min(canvas.width, canvas.height) * SAMPLE_SIZE;
        const center = { x: canvas.width /2, y: canvas.height /2 };
        ctx.beginPath();
        ctx.arc(center.x, center.y, size / 2, 0, 2 * Math.PI);
        ctx.stroke();
      }
    },
    {
      name: 'Square',
      draw: (ctx, canvas) => {
        const size = Math.min(canvas.width, canvas.height) * SAMPLE_SIZE;
        const startX = (canvas.width - size) / 2;
        const startY = (canvas.height - size) / 2;
        ctx.strokeRect(startX, startY, size, size);
      }
    },
    {
      name:'Triangle',
     draw: (ctx, canvas) => {
            const size = Math.min(canvas.width, canvas.height) * SAMPLE_SIZE;
            const centerX = canvas.width / 2;
            const startY = (canvas.height - size) / 2 + size;
            ctx.beginPath();
            ctx.moveTo(centerX, startY - size); // Top
            ctx.lineTo(centerX + size / 2, startY); // Right bottom
            ctx.lineTo(centerX - size / 2, startY); // Left bottom
            ctx.closePath();
            ctx.stroke();
        }
    }
  ]
  const drawShape = useCallback((shapeName) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    // 그리기 전 스타일 설정
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = PENCIL_COLOR;
    ctx.lineWidth = PENCIL_WIDTH;

    // 기존 캔버스 내용을 유지하면서 도형만 추가.
    const shape = shapeExamples.find(s => s.name === shapeName);
    if(shape) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      shape.draw(ctx, canvas)
    }
  }, [])
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
          className="size-10 mr-2 cursor-pointer"
          onClick={() => navigation("/")}
        />
        <h1 className="text-4xl font-bold">AI를 통한 그림그리기</h1>
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
            <p className="font-semibold mb-2 text-4xl">그리기 도구</p>
            <div className="flex flex-row w-full justify-between">
              <button
                className={`px-3 py-2 rounded bg-green-400`}
                onClick={() => setTool("pencil")}
              >
                <Pencil className="size-20" />
              </button>
              <button
                className={`px-3 py-2 rounded border-4 border-red-600 text-red-600`}
                onClick={() => setTool("eraser")}
              >
                <Eraser className="size-20" />
              </button>
              <button
                className="px-3 py-2 rounded bg-red-700 text-white"
                onClick={clearCanvas}
              >
                <X className="size-20" />
              </button>
            </div>
          </div>

          <div className="border p-3 rounded-md flex-1 overflow-hidden">
            <p className="font-semibold mb-2 text-4xl">그리기 도우미</p>
            <div className="flex flex-col space-y-4 h-full">
                <div className="flex flex-row justify-between"> 
                  {shapeExamples.map((shape) => (
                    <button
                      className="px-3 py-2 rounded border shadow-lg"
                      key={shape.name}
                      onClick={() => drawShape(shape.name)}
                    >
                      <IconRenderer icon={shape.name} />
                    </button>
                  ))
                  }
                </div>
              <MicToggleButton
                micText={'text-6xl'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
