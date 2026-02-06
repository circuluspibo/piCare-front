import React, { useState, useRef, useContext, useMemo } from "react";
import { Button } from "@/components/ui/button";
import Dialog from "@/components/Dialog";
import { IconRenderer } from "@/components/ui/IconRenderer";
import { cn } from "@/lib/utils";
import { ThreeDot } from "react-loading-indicators";
import { postVoice2Wav } from "@/api/gpuService";
import { getTtsBlob } from "@/api/cpuService";
import { GlobalContext } from "@/contexts/GlobalContext";

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

  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const highlightRef = useRef(-1);
  const mediaRecorderRef = useRef(null);
  const audioChunkRef = useRef([]);

  const { humanInfo } = useContext(GlobalContext);
  const targetVoice = useMemo(() => {
    if (!humanInfo) return 42;
    const { age, gender } = humanInfo;
    const isMale = gender === "M";
    if (age > 50) return isMale ? 42 : 65;
    return isMale ? 48 : 7;
  }, [humanInfo]);

  // 에메랄드 톤 하이라이트 UI 업데이트
  const updateHighlightUI = (index, active) => {
    const el = document.getElementById(`char-${index}`);
    if (el) {
      el.className = cn(
        "transition-colors duration-200",
        active
          ? "text-emerald-600 font-black scale-110 inline-block"
          : "text-slate-300",
      );
    }
  };

  const handleStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunkRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) =>
        audioChunkRef.current.push(e.data);

      mediaRecorderRef.current.start();
      setStage("recording");

      highlightRef.current = 0;
      timerRef.current = setInterval(() => {
        if (highlightRef.current < currentScript.length) {
          updateHighlightUI(highlightRef.current, true);
          highlightRef.current += 1;
        } else {
          clearInterval(timerRef.current);
        }
      }, 250);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStop = () => {
    if (mediaRecorderRef.current && stage === "recording") {
      clearInterval(timerRef.current);
      mediaRecorderRef.current.onstop = async () => {
        setStage("loading");
        try {
          const targetBlob = new Blob(audioChunkRef.current, {
            type: "audio/wav",
          });
          const sourceBlob = await getTtsBlob(currentScript, targetVoice);
          const response = await postVoice2Wav(targetBlob, sourceBlob);

          setResultAudio(response);
          setStage("result");
          setTimeout(() => {
            if (audioRef.current) {
              setIsPlaying(true);
              audioRef.current.play();
            }
          }, 800);
        } catch (err) {
          setStage("idle");
        }
      };
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
  };

  const handleReset = () => {
    setStage("idle");
    setResultAudio(null);
    highlightRef.current = -1;
    setCurrentScript(
      USER_SCRIPT_LIST[Math.floor(Math.random() * USER_SCRIPT_LIST.length)],
    );
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#F0FDF4] rounded-3xl overflow-hidden p-4 md:p-6 shadow-inner border-2 border-white/50">
      <main className="flex-1 flex flex-row items-center justify-center gap-4 md:gap-8 overflow-hidden px-2">
        {/* 로봇 섹션 */}
        <div
          className={cn(
            "relative flex-shrink-0 transition-all duration-500",
            stage === "recording" && "scale-105",
            isPlaying && "animate-bounce",
          )}
        >
          <div className="absolute inset-0 bg-emerald-200/30 blur-3xl rounded-full" />
          <img
            src="/images/voice.png"
            alt="robot"
            className="relative w-auto h-[35vh] max-h-[320px] object-contain drop-shadow-2xl"
          />
          {isPlaying && (
            <div className="absolute bottom-[24%] left-[44%] w-[12%] h-[4%] bg-slate-800 rounded-full animate-ping" />
          )}
          <div
            className={cn(
              "absolute top-2 right-6 w-4 h-4 rounded-full border-2 border-white shadow-sm",
              stage === "recording"
                ? "bg-red-500 animate-pulse"
                : "bg-emerald-400",
            )}
          />
        </div>

        {/* 인터랙션 섹션 */}
        <div className="flex-1 max-w-xl h-full flex items-center justify-center">
          {stage === "recording" ? (
            <div className="w-full bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl border-4 border-emerald-50 relative animate-in slide-in-from-right-10">
              <div className="hidden md:block absolute -left-5 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[15px] border-t-transparent border-r-[25px] border-r-white border-b-[15px] border-b-transparent" />
              <p className="text-2xl md:text-3xl font-bold text-slate-800 leading-relaxed flex flex-wrap justify-start">
                {currentScript.split(" ").map((word, wordIdx) => (
                  <span key={wordIdx} className="flex mr-2 mb-1">
                    {" "}
                    {/* 단어 단위로 묶음 */}
                    {word.split("").map((char, charIdx) => {
                      // 전체 문장에서 이 글자가 몇 번째 인덱스인지 계산
                      const absoluteIndex =
                        currentScript
                          .split("")
                          .slice(0, currentScript.indexOf(word, wordIdx))
                          .length + charIdx;

                      return (
                        <span
                          key={charIdx}
                          id={`char-${absoluteIndex}`}
                          className="text-slate-300 transition-all duration-200"
                        >
                          {char}
                        </span>
                      );
                    })}
                  </span>
                ))}
              </p>
            </div>
          ) : stage === "result" ? (
            <div className="flex flex-col items-center gap-6 animate-in zoom-in">
              <div className="bg-emerald-100 text-emerald-800 px-6 py-2 rounded-full text-xl font-black shadow-sm border border-emerald-200">
                목소리 학습 완료! ✨
              </div>
              <audio
                ref={audioRef}
                src={resultAudio}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
              <Button
                onClick={() => {
                  setIsPlaying(true);
                  audioRef.current.play();
                }}
                disabled={isPlaying}
                className="w-48 h-16 md:w-60 md:h-24 rounded-[2rem] bg-orange-500 text-white text-2xl md:text-4xl font-black border-b-[10px] border-orange-800 active:border-b-0 active:translate-y-2 transition-all shadow-xl hover:bg-orange-400"
              >
                {isPlaying ? "말하는 중" : "다시 듣기"}
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <p className="text-5xl font-black text-emerald-900/80">
                "나를 따라해봐!"
              </p>
            </div>
          )}
        </div>
      </main>

      {/* 푸터: 에메랄드 포인트 */}
      <footer className="flex-none w-full max-w-5xl mx-auto bg-white/80 backdrop-blur-md p-3 md:p-4 rounded-[2.5rem] shadow-lg flex items-center justify-between border-2 border-emerald-50 mt-2">
        <div className="flex items-center gap-3 ml-3">
          <div
            className={cn(
              "w-3 h-3 rounded-full shadow-inner",
              stage === "recording"
                ? "bg-red-500 animate-pulse"
                : "bg-emerald-300",
            )}
          />
          <span className="text-sm md:text-lg font-black text-emerald-900/70">
            {stage === "idle" && "새로운 목소리를 배워볼까요?"}
            {stage === "recording" && "로봇이 귀를 기울이고 있어요"}
            {stage === "loading" && "기억하는 중입니다..."}
            {stage === "result" && "짜잔! 똑같죠?"}
          </span>
        </div>
        <div className="flex gap-2">
          {stage === "idle" && (
            <Button
              onClick={handleStart}
              className="h-12 md:h-16 px-8 md:px-12 rounded-2xl bg-emerald-600 text-white text-lg md:text-2xl font-black border-b-6 border-emerald-800 hover:bg-emerald-500 active:border-b-0 active:translate-y-1"
            >
              시작하기
            </Button>
          )}
          {stage === "recording" && (
            <Button
              onClick={handleStop}
              className="h-12 md:h-16 px-8 md:px-12 rounded-2xl bg-red-500 text-white text-lg md:text-2xl font-black border-b-6 border-red-800 hover:bg-red-400 active:border-b-0 active:translate-y-1"
            >
              다 읽었어요
            </Button>
          )}
          {stage === "result" && (
            <Button
              onClick={handleReset}
              className="h-12 md:h-16 px-8 md:px-12 rounded-2xl bg-slate-500 text-white text-lg md:text-2xl font-black border-b-6 border-slate-700 hover:bg-slate-400 active:border-b-0 active:translate-y-1"
            >
              다시 하기
            </Button>
          )}
        </div>
      </footer>

      {/* 로딩 다이얼로그: 에메랄드 테마 */}
      <Dialog isOpen={stage === "loading"} onClose={() => {}} title="">
        <div className="p-8 flex flex-col items-center gap-6">
          <ThreeDot color="#10b981" size="large" />
          <p className="text-3xl font-black text-emerald-900">
            열심히 배우고 있어요!
          </p>
        </div>
      </Dialog>
    </div>
  );
}
