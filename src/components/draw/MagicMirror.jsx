import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Camera, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { postFace2Img } from "@/api/gpuService";
import { getHeartbeat, getStartCollection } from "@/api/npuService";

export default function MagicMirror() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [isActive, setIsActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResultMode, setIsResultMode] = useState(false);

  // 추가된 UI 상태
  const [count, setCount] = useState(null); // 카운트다운 숫자
  const [isShutter, setIsShutter] = useState(false); // 셔터 효과

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
      setIsResultMode(false);
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

  const handleReset = () => {
    setIsResultMode(false);
    startCamera();
  };

  // 실제 캡처 및 생성 로직 (카운트다운 종료 후 실행)
  const processCapture = async () => {
    if (!canvasRef.current) return;

    // 1. 셔터 효과(플래시) 발생
    setIsShutter(true);
    setTimeout(() => setIsShutter(false), 150);

    setIsProcessing(true);
    setIsResultMode(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    try {
      // await getStartCollection();
      // const hbResp = await getHeartbeat();
      // const hbResult = await JSON.parse(JSON.stringify(hbResp));
      // const hbData = hbResult.data;
      // console.log("hbData = ", hbData);
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg")
      );
      const file = new File([blob], "mirror.jpg", { type: "image/jpeg" });
      const systemPrompt = `(Solo:1.5), 1 man, (neutral facial bone structure:1.4), 30s version of this man, clear skin texture, natural lighting, high quality, photorealistic, sharp focus`;
      const res = await postFace2Img(file, systemPrompt);

      stopCamera();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const img = new Image();
      img.src = res;
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
    } catch (error) {
      console.log(`[Error : ${error}]`);
      setIsResultMode(false);
      startCamera();
    } finally {
      setIsProcessing(false);
    }
  };

  // 버튼 클릭 시 카운트다운 핸들러
  const handleMagicMirror = () => {
    if (isProcessing || count !== null) return;

    setCount(3); // 3초 카운트다운 시작
    const timer = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          processCapture(); // 0초가 되면 캡처 실행
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleMirrorClick = () => {
    if (!isActive) {
      startCamera();
    } else {
      stopCamera();
      setIsActive(false);
    }
  };
  useEffect(() => {
    let videoId;
    const renderFrame = () => {
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

    if (isActive && !isResultMode) renderFrame();
    return () => cancelAnimationFrame(videoId);
  }, [isActive, isResultMode]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="flex items-center justify-center w-full h-full overflow-hidden gap-6 p-2">
      <div
        className="relative flex-shrink-0 w-8/12 h-full cursor-pointer transition-transform duration-500 hover:scale-[1.01]"
        onClick={handleMirrorClick}
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

            {/* 1. 점선 가이드라인 (카메라 활성 시에만 표시) */}
            {isActive && !isResultMode && !count && !isProcessing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="w-56 h-72 border-4 border-dashed border-white/60 rounded-[100px] mb-8 shadow-[0_0_20px_rgba(0,0,0,0.2)]" />
                <p className="bg-black/40 text-white px-6 py-2 rounded-full text-2xl font-bold backdrop-blur-sm">
                  점선 안에 얼굴을 맞춰주세요
                </p>
              </div>
            )}

            {/* 2. 카운트다운 숫지 표시 */}
            {count !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-20">
                <span className="text-[150px] font-black text-white drop-shadow-2xl animate-ping">
                  {count}
                </span>
              </div>
            )}

            {/* 3. 셔터 효과 (플래시) */}
            {isShutter && (
              <div className="absolute inset-0 bg-white z-50 animate-in fade-in duration-75" />
            )}

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

            {isProcessing && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-40 backdrop-blur-sm">
                {/* 1. 스캔 라인 효과 */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-slate-400 to-transparent shadow-[0_0_15px_#fbbf24] animate-scan" />

                {/* 3. 단계별 텍스트 (순차적 표시 느낌) */}
                <div className="text-center space-y-4">
                  <p className="text-white text-5xl font-black tracking-tighter animate-bounce">
                    젊음의 마법을 부리는 중...
                  </p>
                  <div className="flex justify-center gap-2">
                    <span className="w-3 h-3 bg-slate-400 rounded-full animate-[bounce_1s_infinite_100ms]" />
                    <span className="w-3 h-3 bg-slate-400 rounded-full animate-[bounce_1s_infinite_200ms]" />
                    <span className="w-3 h-3 bg-slate-400 rounded-full animate-[bounce_1s_infinite_300ms]" />
                  </div>
                </div>
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
              <h2 className="text-4xl font-black text-[#5d3a1a] mb-4 break-keep">
                젊어지는 거울
              </h2>
              <p className="text-3xl text-stone-600 font-bold break-keep leading-relaxed">
                왼쪽의 거울을 누르면
                <br />
                <span className="text-amber-700">마법</span>이 시작됩니다.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-between text-center animate-in zoom-in-95 duration-500 gap-6 w-full h-full">
            <div>
              <h2 className="text-5xl font-extrabold text-[#2D3A5A] break-keep leading-snug">
                {isResultMode && !isProcessing
                  ? "와우! 정말 멋져요!"
                  : count !== null
                  ? "움직이지 마세요!"
                  : isProcessing
                  ? "젊어지는 중"
                  : "가장 예쁜\n미소를 지어보세요"}
              </h2>
            </div>

            <div className="flex flex-col w-full gap-4">
              {!isResultMode && count === null && (
                <button
                  onClick={handleMagicMirror}
                  disabled={isProcessing || count !== null}
                  className={cn(
                    "w-full py-10 rounded-2xl text-5xl font-black transition-all active:translate-y-2 active:shadow-none",
                    "bg-amber-500 text-white border-b-8 border-amber-800"
                  )}
                >
                  젊어지기
                </button>
              )}

              {isResultMode && !isProcessing && (
                <button
                  onClick={handleReset}
                  className="w-full py-10 rounded-2xl text-5xl bg-indigo-600 text-white border-b-8 border-indigo-900 transition-all active:translate-y-1 active:shadow-none flex items-center justify-center gap-4"
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
