import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Camera, RotateCcw } from "lucide-react"; // 리셋 아이콘 추가
import { cn } from "@/lib/utils";
import { postFace2Img } from "@/api/gpuService";

export default function MagicMirror() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [isActive, setIsActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResultMode, setIsResultMode] = useState(false); // 1. 결과 모드 상태 추가

  // 카메라 중지
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // 카메라 시작
  const startCamera = async () => {
    try {
      stopCamera();
      setIsResultMode(false); // 시작 시 결과 모드 해제

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsActive(true);
      }
    } catch (error) {
      console.log(`[Failed to access camera : ${error}]`);
      alert("카메라를 찾을 수 없거나 권한이 없습니다.");
    }
  };

  // 3. 리셋 기능: 처음 상태로 되돌리기
  const handleReset = () => {
    setIsResultMode(false);
    setIsActive(true);
    // 캔버스를 비우지 않아도 renderFrame 루프가 다시 그려주기 시작합니다.
  };

  const handleMagicMirror = async () => {
    if(!canvasRef.current || isProcessing) return;

    setIsProcessing(true);
    // 1. API 호출 시작과 동시에 결과 모드 활성화 (renderFrame 루프 중단 효과)
    setIsResultMode(true); 
    
    const canvas = canvasRef.current;
    try {
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg")
      );
      const file = new File([blob], "mirror.jpg", { type: "image/jpeg" });
      
      const prompt = '젊어진 모습을 보여줘';
      const res = await postFace2Img(file, prompt);
      
      // 2. 해당 캔버스에 호출 결과 그리기
      const img = new Image();
      img.src = res;
      img.onload = () => {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // 결과 이미지는 반전 없이 정방향으로 그림
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
    } catch (error) {
      console.log(`[Failed to capture video : ${error}]`);
      setIsResultMode(false); // 에러 시 다시 카메라 화면으로
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    let videoId;
    const renderFrame = () => {
      // 1. 결과 모드(isResultMode)일 때는 캔버스 업데이트를 중단함
      if (isResultMode) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2) {
        const ctx = canvas.getContext("2d");
        if (canvas.width !== canvas.clientWidth) {
          canvas.width = canvas.clientWidth;
          canvas.height = canvas.clientHeight;
        }
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
      videoId = requestAnimationFrame(renderFrame);
    };

    if (isActive && !isResultMode) {
      renderFrame();
    }

    return () => {
      if (videoId) cancelAnimationFrame(videoId);
    };
  }, [isActive, isResultMode]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="flex items-center justify-center w-full h-full max-h-[479px] overflow-hidden gap-6 p-2">
      <div
        className="relative flex-shrink-0 w-8/12 h-full cursor-pointer transition-transform duration-500 hover:scale-[1.01]"
        onClick={() => !isActive && startCamera()}
      >
        <div className="absolute inset-0 bg-[#5d3a1a] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] border-[12px] border-[#8b5a2b] p-3">
          <div className="relative w-full h-full overflow-hidden rounded-2xl bg-slate-200">
            <video ref={videoRef} autoPlay playsInline className="hidden" />
            <canvas
              ref={canvasRef}
              className={`w-full h-full object-cover transition-opacity duration-1000 ${
                isActive ? "opacity-100" : "opacity-0"
              }`}
            />
            {!isActive && (
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 via-white to-blue-50 flex flex-col items-center justify-center p-4 text-center">
                <Camera className="size-32 text-blue-400 mb-6 animate-bounce" />
                <p className="text-6xl font-black text-blue-600 break-keep leading-tight">
                  거울을
                  <br />
                  터치하세요
                </p>
              </div>
            )}
            {/* 처리 중 로딩 오버레이 */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center z-10">
                <div className="animate-spin rounded-full h-24 w-24 border-t-8 border-b-8 border-white mb-4"></div>
                <p className="text-white text-4xl font-bold">마법을 부리는 중...</p>
              </div>
            )}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/20 via-transparent to-black/10" />
          </div>
        </div>
      </div>

      <div className="flex flex-col w-4/12 h-full justify-center items-center px-2">
        {!isActive ? (
          <div className="flex flex-col items-center gap-6 text-center animate-in fade-in duration-700">
            <div className="bg-amber-100 p-6 rounded-full">
              <Sparkles className="size-16 text-amber-600" />
            </div>
            <div>
              <h2 className="text-6xl font-black text-[#5d3a1a] mb-4">청춘 거울</h2>
              <p className="text-3xl text-stone-600 font-bold break-keep leading-relaxed">
                왼쪽의 거울을 누르면<br />
                <span className="text-amber-700">마법</span>이 시작됩니다.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center animate-in zoom-in-95 duration-500 gap-6 w-full">
            <div>
              <h2 className="text-5xl font-extrabold text-[#2D3A5A] break-keep leading-tight">
                {isResultMode && !isProcessing ? "와우! 정말 멋져요!" : "가장 예쁜\n미소를 지어보세요"}
              </h2>
            </div>

            {/* 버튼 그룹 */}
            <div className="flex flex-col w-full gap-4">
              <button
                onClick={handleMagicMirror}
                disabled={isProcessing || isResultMode}
                className={cn(
                  "w-full py-10 rounded-3xl text-5xl font-black transition-all active:translate-y-2 active:shadow-none",
                  isProcessing || isResultMode
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-gradient-to-b from-orange-400 to-red-500 text-white border-b-8 border-red-700"
                )}
              >
                {isProcessing ? "변신 중..." : "젊어지기"}
              </button>

              {/* 3. 리셋 버튼 추가 */}
              {isResultMode && !isProcessing && (
                <button
                  onClick={handleReset}
                  className="w-full py-8 rounded-3xl text-4xl font-black bg-stone-500 text-white border-b-8 border-stone-700 transition-all active:translate-y-1 active:shadow-none flex items-center justify-center gap-4"
                >
                  <RotateCcw className="size-10" />
                  다시 찍기
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}