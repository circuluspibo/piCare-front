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
      console.log("[FAILED] access camera MSG : ", error);
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
      await getStartCollection();
      const hbResp = await getHeartbeat();
      const hbResult = await JSON.parse(JSON.stringify(hbResp));
      // console.log("hbResult = ", hbResult);
      const { human } = hbResult.data;

      console.log("human = ", human);
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg"),
      );

      // image debug 용
      // const link = document.createElement('a');
      // link.href = URL.createObjectURL(blob);
      // link.download = `test_${Date.now()}.jpg`;
      // link.click();
      
      const file = new File([blob], "mirror.jpg", { type: "image/jpeg" });
      const gender = human.gender === "M" ? "man" : "woman";
      const systemPrompt = `(Solo:1.5), ${human.age} ${gender}, (neutral facial bone structure:1.4), 10 year younger version of this ${gender}, clear skin texture, natural lighting, high quality, photorealistic, sharp focus`;
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
      console.log("[FAILED] processCamera MSG : ", error);
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
        {/* 외부 영역: 깊이감 있는 브론즈 골드 프레임 디자인 */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#c4a484] via-[#8b5a2b] to-[#5d3a1a] rounded-2xl p-4 border-t-[4px] border-l-[4px] border-white/30">
          {/* 프레임 내부 몰딩: 블랙 유광 포인트로 고급감 극대화 */}
          <div className="w-full h-full rounded-2xl border-[8px] border-[#2a1d13] bg-[#3d2b1f] p-3 shadow-[inset_0_4px_20px_rgba(0,0,0,0.8)] relative">
            {/* 거울 유리창 영역 (내부 로직 유지) */}
            <div className="relative w-full h-full overflow-hidden rounded-[24px] bg-slate-200 shadow-2xl">
              <video ref={videoRef} autoPlay playsInline className="hidden" />
              <canvas
                ref={canvasRef}
                className={`w-full h-full object-cover transition-opacity duration-1000 ${
                  isActive ? "opacity-100" : "opacity-0"
                }`}
              />

              {/* 1. 점선 가이드라인 */}
              {isActive && !isResultMode && !count && !isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-72 h-72 border-4 border-dashed border-white/60 rounded-[100px] mb-8 mt-2 shadow-[0_0_30px_rgba(0,0,0,0.3)]" />
                  <p className="bg-black/40 text-white px-8 py-2 rounded-full text-2xl font-black backdrop-blur-md border border-white/20">
                    점선 안에 얼굴을 맞춰주세요
                  </p>
                </div>
              )}

              {/* 2. 카운트다운 숫자 표시 */}
              {count !== null && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-20">
                  <span className="text-[180px] font-black text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] animate-ping">
                    {count}
                  </span>
                </div>
              )}

              {/* 3. 셔터 효과 (플래시) */}
              {isShutter && (
                <div className="absolute inset-0 bg-white z-50 animate-in fade-in duration-75" />
              )}

              {!isActive && (
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-300 via-white to-blue-200 flex flex-col items-center justify-center p-4 text-center">
                  <Camera className="size-32 text-blue-400 mb-2 animate-bounce duration-800" />
                  <p className="text-6xl font-black text-blue-600 break-keep leading-tight">
                    거울을
                    <br />
                    터치하세요
                  </p>
                </div>
              )}

              {isProcessing && (
                <div className="absolute inset-0 bg-[#1a110a]/70 flex flex-col items-center justify-center z-40 backdrop-blur-md">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[#fbbf24] to-transparent shadow-[0_0_20px_#fbbf24] animate-scan" />
                  <div className="text-center space-y-6">
                    <p className="text-amber-200 text-5xl font-black tracking-tighter animate-pulse">
                      마법의 시간이 흐르는 중...
                    </p>
                    <div className="flex justify-center gap-3">
                      <span className="w-4 h-4 bg-amber-400 rounded-full animate-bounce delay-100" />
                      <span className="w-4 h-4 bg-amber-500 rounded-full animate-bounce delay-200" />
                      <span className="w-4 h-4 bg-amber-600 rounded-full animate-bounce delay-300" />
                    </div>
                  </div>
                </div>
              )}

              {/* 거울 표면 유리 반사 효과: 브론즈 톤에 맞춰 따뜻하게 조절 */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/20 via-transparent to-[#8b5a2b]/10" />
            </div>
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
              <h2 className="text-5xl font-extrabold text-slate-900 break-keep leading-snug">
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
                    "bg-amber-500 text-white border-b-8 border-amber-800",
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
