import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MagicMirror() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [isActive, setIsActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const startCamera = async () => {
    try {
      stopCamera();

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

  const handleMagicMirror = () => {
    console.log("handleMagicMirror");
  };
  // 1. 카메라 렌더링 전용 루프
  useEffect(() => {
    let videoId;
    const renderFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2) {
        const ctx = canvas.getContext("2d");
        if (canvas.width !== canvas.clientWidth) {
          canvas.width = canvas.clientWidth;
          canvas.height = canvas.clientHeight;
        }
        ctx.save(); // 상태 저장 추가
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore(); // 상태 복구 추가 (필수: 안하면 계속 뒤집힘)
      }
      videoId = requestAnimationFrame(renderFrame);
    };

    if (isActive) {
      renderFrame();
    }

    return () => {
      if (videoId) cancelAnimationFrame(videoId);
      // 여기서 stopCamera를 호출하지 않습니다! (isActive가 바뀔 때마다 꺼짐 방지)
    };
  }, [isActive]);

  // 2. 컴포넌트 언마운트 시에만 카메라 종료 전용
  useEffect(() => {
    return () => {
      stopCamera(); // 컴포넌트를 완전히 나갈 때만 실행
    };
  }, []);

  return (
    <div className="flex items-center justify-center w-full h-full max-h-[479px] overflow-hidden gap-6 p-2">
      {/* 왼쪽: 거울 영역 (기존 로직 유지) */}
      <div
        className="relative flex-shrink-0 w-8/12 h-full cursor-pointer transition-transform duration-500 hover:scale-[1.01]"
        onClick={() => !isActive && startCamera()}
      >
        <div className="absolute inset-0 bg-[#5d3a1a] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] border-[12px] border-[#8b5a2b] p-3">
          <div className="relative w-full h-full overflow-hidden rounded-2xl bg-slate-200">
            <video ref={videoRef} autoPlay playsInline className="hidden" />
            <canvas
              ref={canvasRef}
              onClick={() => setIsActive(false)}
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
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/20 via-transparent to-black/10" />
          </div>
        </div>
      </div>

      {/* 오른쪽: 조작 영역 (시니어 맞춤형 보완) */}
      <div className="flex flex-col w-4/12 h-full justify-center items-center px-2">
        {!isActive ? (
          /* 1. 거울 변경 전: 사용 안내 모드 */
          <div className="flex flex-col items-center gap-6 text-center animate-in fade-in duration-700">
            <div className="bg-amber-100 p-6 rounded-full">
              <Sparkles className="size-16 text-amber-600" />
            </div>
            <div>
              <h2 className="text-6xl font-black text-[#5d3a1a] mb-4">
                청춘 거울
              </h2>
              <p className="text-3xl text-stone-600 font-bold break-keep leading-relaxed">
                왼쪽의 거울을 누르면
                <br />
                <span className="text-amber-700">마법</span>이 시작됩니다.
              </p>
            </div>
          </div>
        ) : (
          /* 2. 거울 변경 후: 기능 실행 모드 */
          <div className="flex flex-col items-center text-center animate-in zoom-in-95 duration-500 gap-6">
            <div>
              <h2 className="text-5xl font-extrabold text-[#2D3A5A] break-keep leading-tight">
                가장 예쁜
                <br />
                미소를 지어보세요
              </h2>
            </div>

            <button
              onClick={handleMagicMirror}
              disabled={isProcessing}
              className={cn(
                "w-full py-10 rounded-3xl text-5xl font-black transition-all active:translate-y-2 active:shadow-none",
                isProcessing
                  ? "bg-gray-400 text-white"
                  : "bg-gradient-to-b from-orange-400 to-red-500 text-white border-b-8 border-red-700"
              )}
            >
              {isProcessing ? "변신 중..." : "젊어지기"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
