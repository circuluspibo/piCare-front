import React, { useState, useRef, useContext, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Dialog from "@/components/Dialog";
import { cn } from "@/lib/utils";
import { RotateCcw, Headphones, ArrowBigLeft } from "lucide-react";
import { postStt, postVoice2Wav } from "@/api/gpuService";
import { getTtsBlob } from "@/api/cpuService";
import { GlobalContext } from "@/contexts/GlobalContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useTracker } from "@/hooks/useTracker";

const USER_SCRIPT_LIST = [
  "사랑하는 우리 가족들아, 오늘도 건강하고 웃음 가득한 하루 보내렴. 언제나 너희를 응원하고 아주 많이 사랑한다.",
  "오늘 날씨가 참 맑고 좋네요. 기분 좋은 바람도 솔솔 불어오니, 차 한 잔 마시면서 여유로운 시간 보내세요.",
  "인생은 아름다운 여행이라고 합니다. 오늘도 새로운 풍경을 마주하듯 즐겁고 행복하게 보내시길 바랍니다.",
  "우리 예쁜 손주들, 할머니 목소리 듣고 오늘도 힘차게 보내렴. 너희는 세상에서 가장 소중한 보물이란다.",
];

export default function VoiceReplication() {
  const [stage, setStage] = useState("idle");
  const [isPlaying, setIsPlaying] = useState(false);
  const [resultAudio, setResultAudio] = useState(null);
  const [currentScript, setCurrentScript] = useState(
    () => USER_SCRIPT_LIST[Math.floor(Math.random() * USER_SCRIPT_LIST.length)],
  );
  const { recordTouch, recordScore, recordSpeech, save, resetIdleTimer } =
    useTracker();
  const processStartTimeRef = useRef(null);

  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const mediaRecorderRef = useRef(null);
  const audioChunkRef = useRef([]);

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pathParts = pathname.split("/").filter(Boolean);
  const previous = pathParts[0];

  const { humanInfo } = useContext(GlobalContext);
  const targetVoice = useMemo(() => {
    if (!humanInfo) return 42;
    const { age, gender } = humanInfo;
    const isMale = gender === "M";
    if (age > 50) return isMale ? 42 : 65;
    return isMale ? 48 : 7;
  }, [humanInfo]);

  // 타이머 로직: 구 버전의 직관적인 인덱스 기반 강조 적용
  useEffect(() => {
    if (stage === "recording") {
      setHighlightIndex(0);
      timerRef.current = setInterval(() => {
        setHighlightIndex((prev) => {
          if (prev < currentScript.length) return prev + 1;
          clearInterval(timerRef.current);
          return prev;
        });
      }, 250);
    } else {
      clearInterval(timerRef.current);
      setHighlightIndex(-1);
    }
    return () => clearInterval(timerRef.current);
  }, [stage, currentScript]);

  const handleStart = async () => {
    recordTouch();
    resetIdleTimer();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunkRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) =>
        audioChunkRef.current.push(e.data);

      mediaRecorderRef.current.start();
      setStage("recording");
    } catch (e) {
      console.error(e);
      alert("마이크 권한이 필요합니다.");
    }
  };

  const handleStop = () => {
    recordTouch();
    processStartTimeRef.current = Date.now();

    if (mediaRecorderRef.current && stage === "recording") {
      mediaRecorderRef.current.onstop = async () => {
        setStage("loading");
        try {
          const targetBlob = new Blob(audioChunkRef.current, {
            type: "audio/wav",
          });
          const recognizedText = await postStt(targetBlob, "ko");
          const finalPrompt =
            recognizedText && recognizedText.trim().length > 0
              ? recognizedText
              : currentScript;

          const sourceBlob = await getTtsBlob(finalPrompt, targetVoice);
          const response = await postVoice2Wav(targetBlob, sourceBlob);

          setResultAudio(response);
          setStage("result");

          const duration = processStartTimeRef.current
            ? Math.floor((Date.now() - processStartTimeRef.current) / 1000)
            : 0;

          recordScore(1, 1, duration);
          recordSpeech(currentScript);
          await save();
        } catch (err) {
          console.error(err);
          setStage("idle");
        }
      };
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
  };
  const handleReset = () => {
    recordTouch();
    setStage("idle");
    setResultAudio(null);
    setHighlightIndex(-1);
    setCurrentScript(
      USER_SCRIPT_LIST[Math.floor(Math.random() * USER_SCRIPT_LIST.length)],
    );
  };
  useEffect(() => {
    let playTimer;
    if (resultAudio && stage === "result" && audioRef.current) {
      playTimer = setTimeout(() => {
        setIsPlaying(true);

        audioRef.current.play().catch((error) => {
          console.log("자동 재생이 차단되었습니다.", error);
          setIsPlaying(false);
        });
      }, 800);
    }
    return () => {
      if (playTimer) clearTimeout(playTimer);
    };
  }, [resultAudio, stage]);
  const renderKaraokeText = (script, hIndex) => {
    let charCounter = 0; // 전체 글자 순서를 추적하기 위한 카운터

    // 1. 공백을 기준으로 단어 리스트를 만듭니다.
    return script.split(" ").map((word, wordIndex) => (
      // 2. 각 단어를 하나의 span(덩어리)으로 감쌉니다.
      // 여기서 inline-block을 주면 단어 단위로 break-keep 효과가 납니다.
      <span
        key={wordIndex}
        className="inline-block whitespace-nowrap mr-[0.3em]"
      >
        {word.split("").map((char) => {
          const currentIndex = charCounter++; // 글자마다 인덱스 부여
          const isHighlighted = currentIndex < hIndex;

          return (
            <span
              key={currentIndex}
              className={cn(
                "transition-colors duration-200",
                isHighlighted ? "text-neutral-900" : "text-neutral-300",
              )}
            >
              {char}
            </span>
          );
        })}
      </span>
    ));
  };
  return (
    <div
      className="flex w-full h-full gap-4 overflow-hidden"
      onClickCapture={resetIdleTimer}
    >
      {/* LEFT SECTION: Main Display Area (2/3) */}
      <div className="flex-[2] relative bg-amber-50 rounded-2xl border-2 border-slate-100 overflow-hidden flex flex-col">
        <div className="flex-1 flex items-center justify-center relative p-6">
          {/* 은은한 원고지 배경 패턴 */}
          <div
            className="absolute inset-0 opacity-[0.04] rotate-1 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(#000 2px, transparent 2px), linear-gradient(90deg, #000 2px, transparent 2px)`,
              backgroundSize: "60px 60px",
            }}
          />

          <div className="relative z-10 w-full text-center">
            {stage === "result" && resultAudio ? (
              <div className="flex flex-col items-center gap-8 animate-in zoom-in duration-500">
                <div className="p-8 bg-cyan-50 rounded-full border-4 border-white shadow-lg">
                  <Headphones
                    size={80}
                    className="text-cyan-600 animate-bounce"
                  />
                </div>
                <h2 className="text-6xl font-black text-slate-800 tracking-tighter">
                  준비 완료!
                </h2>
              </div>
            ) : (
              <h2 className="text-5xl font-black text-center leading-relaxed break-keep">
                {renderKaraokeText(currentScript, highlightIndex)}
              </h2>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SECTION: Controls (1/3 영역) */}
      <div className="flex-1 flex flex-col gap-3 h-full">
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
        {/* 1. 상단 안내창: 비중을 높여(flex-[1.2]) 로봇과 설명을 더 강조 */}
        <div className="flex-[1.2] bg-white rounded-2xl p-4 shadow-md border-b-[8px] border-slate-200 flex flex-col items-center justify-center text-center gap-3">
          {/* 로봇 프로필 이미지: 크기를 키워 시인성 확보 */}
          <div className="relative">
            <div
              className={cn(
                "w-32 h-32 rounded-2xl bg-cyan-50 border-2 border-cyan-100 flex items-center justify-center transition-all duration-500 shadow-inner",
                stage === "recording"
                  ? "ring-8 ring-rose-500/10 animate-pulse"
                  : "",
              )}
            >
              <img
                src="/images/voice.png"
                alt="robot"
                className={cn(
                  "w-24 h-24 object-contain transition-transform duration-500",
                  stage === "recording" && "scale-110",
                )}
              />
            </div>
            {/* 상단 배지 */}
            <div
              className={cn(
                "absolute -top-2 -right-2 w-8 h-8 rounded-full border-4 border-white shadow-md",
                stage === "recording" ? "bg-rose-500" : "bg-cyan-400",
              )}
            />
          </div>

          {/* 설명 문구: 텍스트 크기를 키우고 행간을 넉넉히 조절 */}
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-slate-800 leading-[1.3] break-keep">
              {stage === "idle" && "로봇에게 말을\n가르쳐주세요"}
              {stage === "recording" && "천천히 끝까지\n읽어주세요"}
              {stage === "loading" && "열심히 공부를\n하고 있어요"}
              {stage === "result" && "짜잔! 저랑\n정말 똑같아요"}
            </h2>
          </div>
        </div>

        {/* 2. 하단 제어 버튼 영역: 남은 공간(flex-1)을 효율적으로 사용 */}
        <div className="flex-1 flex flex-col gap-4">
          {stage === "idle" && (
            <Button
              onClick={handleStart}
              className="flex-1 rounded-2xl bg-cyan-600 text-white text-5xl font-black border-b-[8px] border-cyan-800 shadow-xl active:translate-y-2 active:border-b-0 transition-all flex items-center justify-center gap-4"
            >
              대본 읽기
            </Button>
          )}

          {stage === "recording" && (
            <Button
              onClick={handleStop}
              className="flex-1 rounded-2xl bg-rose-500 text-white text-5xl font-black border-b-[8px] border-rose-800 shadow-xl active:translate-y-2 active:border-b-0 transition-all flex flex-col items-center justify-center gap-2"
            >
              <div className="w-12 h-3 bg-white/40 rounded-full animate-bounce mb-2" />
              녹음 종료
            </Button>
          )}

          {stage === "result" && (
            <div className="flex-1 flex flex-col gap-4">
              <Button
                onClick={() => {
                  recordTouch(); // [변경] 재생 버튼 클릭 활동 기록
                  setIsPlaying(true);
                  audioRef.current.play();
                }}
                disabled={isPlaying}
                className="flex-[2] rounded-2xl bg-cyan-600 text-white text-5xl font-black border-b-[12px] border-cyan-800 shadow-xl active:translate-y-2 active:border-b-0 transition-all flex items-center justify-center gap-4"
              >
                {isPlaying ? "듣는 중" : "다시 듣기"}
              </Button>
              <Button
                onClick={handleReset}
                className="flex-1 rounded-2xl bg-white text-slate-500 text-2xl font-black border-2 border-slate-200 border-b-8 active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center gap-3"
              >
                <RotateCcw size={28} />
                다른 대본으로 하기
              </Button>
            </div>
          )}
        </div>
      </div>

      <audio
        ref={audioRef}
        src={resultAudio}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
      {/* Loading Dialog */}
      <Dialog isOpen={stage === "loading"} onClose={() => {}} title="">
        <div className="py-6 flex flex-col items-center gap-3">
          {/* 로봇 이미지 섹션: 부드러운 둥둥 뜨기 효과 */}
          <div className="relative flex items-center justify-center">
            {/* 바닥 그림자: 로봇이 뜰 때 같이 변하게 하면 입체감이 살아납니다 */}
            <img
              src="/images/robotThinking.png"
              alt="thinking robot"
              className="w-52 h-52 object-contain animate-bounce relative z-10 duration-800"
            />
          </div>

          {/* 텍스트 섹션: 가독성 극대화 */}
          <div className="flex flex-col gap-4 items-center">
            <h3 className="text-4xl font-black text-slate-800 text-center leading-tight break-keep">
              로봇이 목소리를 열심히 배우고 있어요
            </h3>
            <p className="text-2xl font-bold text-cyan-600 animate-pulse tracking-widest">
              잠시만 기다려주세요...
            </p>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
