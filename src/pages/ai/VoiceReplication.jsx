import React, { useState, useEffect, useRef, useContext } from "react";
import { Button } from "@/components/ui/button";
import Dialog from "@/components/Dialog";
import { IconRenderer } from "@/components/ui/IconRenderer";
import { cn } from "@/lib/utils";
import { ThreeDot } from "react-loading-indicators";
import { postVoice2Wav } from "@/api/gpuService";
import { getTts, getTtsBlob } from "@/api/cpuService";
import { GlobalContext } from "@/contexts/GlobalContext";

const USER_SCRIPT_LIST = [
  "사랑하는 우리 가족들아, 오늘도 건강하고 웃음 가득한 하루 보내렴. 언제나 너희를 응원하고 아주 많이 사랑한다.",
  "오늘 날씨가 참 맑고 좋네요. 기분 좋은 바람도 솔솔 불어오니, 차 한 잔 마시면서 여유로운 시간 보내세요.",
  "인생은 아름다운 여행이라고 합니다. 오늘도 새로운 풍경을 마주하듯 즐겁고 행복하게 보내시길 바랍니다.",
  "푸른 하늘 아래 복숭아꽃이 활짝 피었습니다. 숲속 새들의 노랫소리를 들으며 천천히 산책을 해볼까요?",
  "우리 예쁜 손주들, 할머니 목소리 듣고 오늘도 힘차게 보내렴. 너희는 세상에서 가장 소중한 보물이란다.",
];

export default function VoiceReplication() {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultAudio, setResultAudio] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const timerRef = useRef(null);

  // 녹음 데이터 보관
  const mediaRecorderRef = useRef(null);
  const audioChunkRef = useRef([]);

  const [currentScript, setCurrentScript] = useState(
    () => USER_SCRIPT_LIST[Math.floor(Math.random() * USER_SCRIPT_LIST.length)],
  );

  const { personaVoice } = useContext(GlobalContext);
  // --- 오디오 재생 함수 ---
  const handlePlayAudio = () => {
    if (audioRef.current && !isPlaying) {
      setIsPlaying(true); // 버튼 비활성화 상태로 변경
      audioRef.current.play();
    }
  };

  // --- 오디오가 끝났을 때 감지하는 로직 ---
  const handleAudioEnded = () => {
    setIsPlaying(false); // 버튼 다시 활성화
  };

  useEffect(() => {
    if (isRecording) {
      setHighlightIndex(0);
      // 글자당 250ms 간격으로 강조 (속도는 필요에 따라 조절 가능)
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
  }, [isRecording, currentScript]);
  // --------------------------------

  const sendVoiceFile = async (sourceFile, targetFile) => {
    setLoading(true);
    try {
      const response = await postVoice2Wav(sourceFile, targetFile);
      // console.log("response = ", response);

      setResultAudio(response);
    } catch (error) {
      console.error(`[Failed to sendVoice file - sendVoiceFile] E: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunkRef.current = []; // 데이터 초기화

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunkRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.start();
      setIsFlipped(true);
      setIsRecording(true);
    } catch (error) {
      console.log(`[Failed to start record - handleStart] E: ${error}`);
    }
  };

  const handleStop = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = async () => {
        // 파일 전처리
        // makeTarget
        const targetBlob = new Blob(audioChunkRef.current, {
          type: "audio/wav",
        });
        const targetFile = new File([targetBlob], "target.wav", {
          type: "audio/wav",
        });

        const sourceBlob = await getTtsBlob(currentScript, personaVoice);
        const sourceFile = new File([sourceBlob], "source.wav", {
          type: "audio/wav",
        });
        sendVoiceFile();

        // 마이크 종료
        mediaRecorderRef.current?.stream
          .getTracks()
          .forEach((track) => track.stop());
      };
    }

    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const handleReset = () => {
    setIsFlipped(false);
    setResultAudio(null);
    setHighlightIndex(-1); // 인덱스 초기화
    const nextIndex = Math.floor(Math.random() * USER_SCRIPT_LIST.length);
    setCurrentScript(USER_SCRIPT_LIST[nextIndex]);
  };

  return (
    <div className="flex w-full h-full mx-auto p-2 rounded-xl overflow-hidden">
      {/* [좌측 섹션] 카드 뒤집기 영역 */}
      <div className="w-8/12 p-2 [perspective:2000px]">
        <div
          className={cn(
            "relative w-full h-full duration-1000 [transform-style:preserve-3d] transition-transform shadow-xl rounded-2xl",
            isFlipped ? "[transform:rotateY(180deg)]" : "",
          )}
        >
          {/* 앞면: 안내 대기 화면 */}
          <div className="absolute inset-0 [backface-visibility:hidden] bg-white rounded-2xl flex flex-col items-center justify-center p-10 overflow-hidden">
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: `url('https://www.transparenttextures.com/patterns/natural-paper.png')`,
              }}
            />
            <div className="bg-blue-50 p-8 rounded-full mb-6 border-2 border-blue-100 shadow-lg relative z-10">
              <IconRenderer
                icon="Mic"
                style={{ width: 60, height: 60 }}
                className="text-blue-500 animate-pulse"
              />
            </div>
            <h2 className="text-4xl font-black text-slate-800 text-center leading-tight relative z-10">
              내 목소리를 <br />
              AI 친구에게 들려주세요
            </h2>
          </div>

          <div
            className={cn(
              "absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl flex flex-col items-center justify-center p-12 overflow-hidden",
              `${!resultAudio ? "bg-[#fdfcf0]" : "bg-white"}`,
            )}
          >
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `url('https://www.transparenttextures.com/patterns/paper-fibers.png')`,
              }}
            />
            <div
              className="absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage: !resultAudio
                  ? `linear-gradient(#000 1.5px, transparent 1.5px), linear-gradient(90deg, #000 1.5px, transparent 1.5px)`
                  : "",
                backgroundSize: "60px 60px",
              }}
            />

            {!resultAudio ? (
              <div className="relative z-10 flex flex-col items-center w-full">
                <div className="absolute -top-6 flex gap-24">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-6 h-6 bg-slate-300/50 rounded-full shadow-inner"
                    />
                  ))}
                </div>

                <div className="bg-white border-2 border-amber-100 px-6 py-8 rounded-lg shadow-xl [transform:rotate(-1deg)]">
                  {/* 변경 적용된 가라오케 텍스트 렌더링 */}
                  <h2 className="text-4xl font-black text-center leading-snug break-keep tracking-tight font-serif">
                    {currentScript.split("").map((char, index) => (
                      <span
                        key={index}
                        className={cn(
                          "transition-colors duration-300",
                          index < highlightIndex
                            ? "text-slate-900"
                            : "text-slate-300",
                        )}
                      >
                        {char}
                      </span>
                    ))}
                  </h2>
                </div>
              </div>
            ) : (
              <div className="relative z-10 flex flex-col items-center gap-8">
                <h2 className="text-5xl font-black text-slate-800">
                  목소리 준비 완료!
                </h2>
                <audio
                  ref={audioRef}
                  src={resultAudio}
                  onEnded={handleAudioEnded}
                  className="hidden"
                />
                <Button
                  onClick={handlePlayAudio}
                  disabled={isPlaying} // 재생 중일 때 버튼 비활성화
                  className={cn(
                    "w-full max-w-sm h-28 flex items-center justify-center gap-4 text-5xl font-black rounded-2xl transition-all shadow-xl",
                    isPlaying
                      ? "bg-slate-200 text-slate-400 border-b-0 translate-y-2 cursor-not-allowed"
                      : "bg-orange-500 text-white border-b-[10px] border-orange-700 hover:bg-orange-600 active:border-b-0 active:translate-y-2",
                  )}
                >
                  <IconRenderer
                    icon="Headphones"
                    style={{ width: 60, height: 60 }}
                  />
                  {isPlaying ? "듣는 중..." : "듣기"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* [우측 섹션] 제어 버튼 */}
      <div className="w-4/12 flex flex-col h-full p-2 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-lg flex items-center justify-center gap-4">
          <div
            className={cn(
              "w-8 h-8 rounded-full",
              isRecording ? "bg-red-500 animate-pulse" : "bg-slate-300",
            )}
          />
          <span className="text-3xl font-black text-slate-700 uppercase tracking-tighter">
            {isRecording ? "녹음중" : "대기중"}
          </span>
        </div>

        <div className="flex-1 flex flex-col gap-5">
          {!isFlipped ? (
            <Button
              onClick={handleStart}
              className="flex-1 flex flex-col gap-3 text-5xl font-black rounded-2xl bg-blue-600 text-white border-b-[12px] border-blue-800 hover:bg-blue-700 active:border-b-0 active:translate-y-3 transition-all shadow-xl"
            >
              <IconRenderer icon="Play" style={{ width: 60, height: 60 }} />
              대본 읽기
            </Button>
          ) : isRecording ? (
            <Button
              onClick={handleStop}
              className="flex-1 flex flex-col gap-3 text-5xl font-black rounded-2xl bg-red-500 text-white border-b-[12px] border-red-700 hover:bg-red-600 active:border-b-0 active:translate-y-3 transition-all shadow-xl"
            >
              <IconRenderer icon="Square" style={{ width: 60, height: 60 }} />
              녹음 종료
            </Button>
          ) : (
            <Button
              onClick={handleReset}
              className="flex-1 flex flex-col gap-3 text-5xl font-black rounded-2xl bg-emerald-500 text-white border-b-8 border-emerald-800 hover:bg-emerald-600 shadow-xl"
            >
              <IconRenderer
                icon="RotateCcw"
                style={{ width: 60, height: 60 }}
              />
              다시 하기
            </Button>
          )}
        </div>
      </div>

      <Dialog
        isOpen={loading}
        onClose={() => setLoading(false)}
        title="AI 목소리 생성"
      >
        <div className="text-center p-10 flex flex-col items-center gap-8">
          <ThreeDot variant="bounce" color="#3b82f6" size="large" />
          <p className="text-3xl font-black text-slate-800">
            어르신의 목소리를
            <br />
            열심히 공부하고 있어요!
          </p>
        </div>
      </Dialog>
    </div>
  );
}
