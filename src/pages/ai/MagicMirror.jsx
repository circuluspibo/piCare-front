import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useContext,
} from "react";
import { ArrowBigLeft, Camera, RotateCcw, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { postFace2Img } from "@/api/gpuService";
import { useLocation, useNavigate } from "react-router-dom";
import { GlobalContext } from "@/contexts/GlobalContext";

export default function MagicMirror() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const [isActive, setIsActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResultMode, setIsResultMode] = useState(false);

  const [count, setCount] = useState(null);
  const [isShutter, setIsShutter] = useState(false);

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { humanInfo } = useContext(GlobalContext);

  const pathParts = pathname.split("/").filter(Boolean);
  const previous = pathParts[0];

  // 1. 카메라 제어 최적화 및 메모리 누수 방지
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
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
      console.error("[FAILED] access camera:", error);
      alert("카메라 권한을 확인해주세요.");
    }
  };

  const handleReset = () => {
    setIsResultMode(false);
    startCamera();
  };

  // 2. 캡처 및 AI 생성 로직 최적화
  const processCapture = async () => {
    if (!canvasRef.current) return;

    setIsShutter(true);
    setTimeout(() => setIsShutter(false), 150);

    setIsProcessing(true);
    setIsResultMode(true);

    try {
      // 퀄리티 최적화된 Blob 추출
      const blob = await new Promise((resolve) =>
        canvasRef.current.toBlob(resolve, "image/jpeg", 1.0),
      );
      // image debug 용
      // const link = document.createElement('a');
      // link.href = URL.createObjectURL(blob);
      // link.download = `test_${Date.now()}.jpg`;
      // link.click();
      const file = new File([blob], "mirror.jpg", { type: "image/jpeg" });
      alert("Before : HumainInfo = ", humanInfo);
      const gender = humanInfo.gender === "M" ? "male" : "female";
      const systemPrompt = `Solo: 1.5, Age: ${humanInfo.age}, Gender: ${gender}, Style: Selfie, Condition: 10 Years younger version and better facial skin of input file`;
      const res = await postFace2Img(file, systemPrompt);

      stopCamera();

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.src = res;
      img.onload = () => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
    } catch (error) {
      console.error("[FAILED] processCapture:", error);
      setIsResultMode(false);
      startCamera();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMagicMirror = () => {
    if (isProcessing || count !== null) return;
    setCount(3);
    timerRef.current = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          clearTimer();
          processCapture();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleMirrorClick = () => {
    if (isProcessing) return;
    if (!isActive) startCamera();
    else {
      stopCamera();
      setIsActive(false);
    }
  };

  // 3. 렌더링 루프 최적화 (alpha: false)
  useEffect(() => {
    let videoId;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d", { alpha: false });

    const renderFrame = () => {
      if (isResultMode) return;
      if (video.readyState >= 2) {
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

    if (isActive && !isResultMode) videoId = requestAnimationFrame(renderFrame);
    return () => {
      cancelAnimationFrame(videoId);
      clearTimer();
    };
  }, [isActive, isResultMode]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);
  return (
    <div className="flex items-center justify-center w-full h-full overflow-hidden gap-10">
      {/* LEFT: Mirror Frame (기존 스타일 보존) */}
      <div
        className="relative flex-shrink-0 w-8/12 h-full cursor-pointer transition-transform duration-500"
        onClick={handleMirrorClick}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#c4a484] via-[#8b5a2b] to-[#5d3a1a] rounded-2xl p-4 border-t-[4px] border-l-[4px] border-white/30">
          <div className="w-full h-full rounded-2xl border-[8px] border-[#2a1d13] bg-[#3d2b1f] p-3 shadow-[inset_0_4px_20px_rgba(0,0,0,0.8)] relative">
            <div className="relative w-full h-full overflow-hidden rounded-[24px] bg-[#222] shadow-2xl">
              <video ref={videoRef} autoPlay playsInline className="hidden" />
              <canvas
                ref={canvasRef}
                className={cn(
                  "w-full h-full object-cover transition-opacity duration-1000",
                  isActive ? "opacity-100" : "opacity-40",
                )}
              />

              {/* Guide Area */}
              {isActive && !isResultMode && !count && !isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-72 h-72 border-2 border-dashed border-white/40 rounded-[100px] my-4 shadow-[0_0_40px_rgba(0,0,0,0.5)]" />
                  <p className="bg-[#5d3a1a]/80 text-[#f5e6d3] px-8 py-2 rounded-full text-2xl font-bold backdrop-blur-sm border border-white/10">
                    원 안에 얼굴을 맞춰주세요
                  </p>
                </div>
              )}

              {/* Countdown & Effects */}
              {count !== null && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <span className="text-[200px] font-black text-[#f59e0b] drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)] animate-pulse">
                    {count}
                  </span>
                </div>
              )}
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
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-40 backdrop-blur-md">
                  <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#c4a484] to-transparent shadow-[0_0_15px_#c4a484] animate-scan absolute top-0" />
                  <p className="text-[#c4a484] text-4xl font-black animate-pulse tracking-widest">
                    분석 중...
                  </p>
                </div>
              )}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/10 via-transparent to-black/20" />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Sophisticated UI Area (보완된 디자인) */}
      <div className="w-4/12 h-full flex flex-col justify-between py-2">
        {/* 상단: 타이틀 및 안내 섹션 */}
        {/* 1. 뒤로가기 버튼 */}
        <button
          onClick={() => navigate(`/${previous}`)}
          className={cn(
            "w-full bg-slate-50 rounded-2xl",
            "flex items-center justify-center py-3 shadow-md",
            "active:translate-y-1 active:border-b-[2px] transition-all group",
          )}
        >
          <ArrowBigLeft
            className="size-12 text-blue-500 transition-transform"
            fill="currentColor"
          />
          <span className="text-3xl font-black text-slate-700 ml-2">
            뒤로가기
          </span>
        </button>
        <div className="flex flex-col gap-6">
          {/* 고급스러운 명판(Plaque) 스타일의 메시지 박스 */}
          <div className="bg-[#fffdfa] border-2 border-[#e5e0d8] border-b-[6px] rounded-[2.5rem] p-10 shadow-md flex flex-col items-center text-center transition-all">
            <p className="text-2xl font-bold text-[#5d3a1a]/70 leading-relaxed break-keep tracking-tight">
              {isProcessing
                ? "거울 속의 시간을\n거꾸로 돌리고 있습니다..."
                : !isActive
                  ? "왼쪽의 마법 거울을 터치하여\n새로운 나를 만나보세요."
                  : isResultMode
                    ? "마법이 완성되었습니다.\n정말 멋진 모습이네요!"
                    : "준비가 되셨다면 아래의\n젊어지기 버튼을 눌러주세요."}
            </p>
          </div>
        </div>

        {/* 하단: 동작 버튼 섹션 */}
        <div className="w-full flex flex-col gap-6">
          {!isResultMode && count === null && (
            <button
              onClick={handleMagicMirror}
              disabled={isProcessing || !isActive}
              className={cn(
                "w-full py-8 rounded-xl text-6xl font-black",
                "flex flex-col items-center justify-center gap-2",
                isActive
                  ? "bg-amber-800 text-stone-100 border-b-[8px] border-stone-900 active:translate-y-2"
                  : "bg-stone-300 text-stone-500 border-b-[8px] border-stone-400 cursor-not-allowed opacity-60",
              )}
            >
              <span>젊어지기</span>
            </button>
          )}

          {isResultMode && !isProcessing && (
            <button
              onClick={handleReset}
              className="w-full py-10 rounded-2xl text-5xl font-black bg-white text-stone-800 border-2 border-stone-800 border-b-[8px] border-stone-900 shadow-xl active:translate-y-2 group flex items-center justify-center gap-5"
            >
              <RotateCcw
                size={48}
                strokeWidth={4}
                className="transition-transform"
              />
              <span>다시 하기</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
