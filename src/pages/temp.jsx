import React, { useRef, useState, useEffect, useCallback } from "react";
import Prompt from "@/components/Prompt";

export default function DrawPage() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const parentRef = useRef(null);

  // 드로잉
  const startDraw = (e) => {
    const x =
      e.nativeEvent?.offsetX ??
      e.touches?.[0].clientX - e.target.getBoundingClientRect().left;
    const y =
      e.nativeEvent?.offsetY ??
      e.touches?.[0].clientY - e.target.getBoundingClientRect().top;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
  };

  const draw = (e) => {
    const x =
      e.nativeEvent?.offsetX ??
      e.touches?.[0].clientX - e.target.getBoundingClientRect().left;
    const y =
      e.nativeEvent?.offsetY ??
      e.touches?.[0].clientY - e.target.getBoundingClientRect().top;
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
  };

  const endDraw = () => {
    ctxRef.current.closePath();
  };

  const clearCanvas = () => {
    const c = canvasRef.current;
    ctxRef.current.clearRect(0, 0, c.width, c.height); // 투명 클리어
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = parentRef?.current?.clientWidth;
    canvas.height = parentRef?.current?.clientHeight;
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 25;
    ctxRef.current = ctx;
    clearCanvas(false);
  }, []);
  return (
    <div className="flex flex-col w-full h-full p-4">
      <header className="pb-2 mb-2 border-b">
        <h1 className="text-2xl font-bold">AI를 통한 그림그리기</h1>
      </header>

      <div className="flex flex-1 gap-2 h-[calc(100%-70px)]">
        {/* Canvas area - 70% */}
        <div className="w-3/5 border border-red-300 p-2">
          <div
            className="w-full h-full"
            style={{ minHeight: 400 }}
            ref={parentRef}
          >
            {/* 캔버스 요소: mousedown, mousemove 이벤트를 React 합성 이벤트로 처리 */}
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

        {/* Sidebar - 30% */}
        <div className="w-2/5 flex flex-col gap-2">
          <div className="border p-3 rounded-md">
            <p className="font-semibold mb-2">그리기 도구</p>
            <div className="flex flex-col gap-2 text-2xl">
              <div className="w-full">
                <button
                  className={`px-3 py-2 rounded w-1/2 ${
                    tool === "pencil" ? "bg-gray-200" : "bg-white"
                  }`}
                  onClick={() => setTool("pencil")}
                >
                  ✏️ 연필
                </button>
                <button
                  className={`px-3 py-2 rounded w-1/2 ${
                    tool === "eraser" ? "bg-gray-200" : "bg-white"
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
            <p className="font-semibold mb-2">프롬프트</p>
            <Prompt textSize={promptSize} />
          </div>
        </div>
      </div>
    </div>
  );
}
