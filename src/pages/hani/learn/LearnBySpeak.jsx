/* eslint-disable no-unused-vars */
import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, AudioLines, Square, Mic, Loader2 } from "lucide-react";
import { postStt } from "@/api/gpuService";
import { useIntegratedMonitor } from "@/hooks/useIntegratedMonitor";
import Letters from "@/components/Letters";
import { JOSA } from "@/utils/haniUtil";
import { getAsset } from "@/api/haniService";

export default function LearnBySpeak({
  item,
  target,
  handleAnswer,
  currentItemIdx,
  currentQuestion,
  currentLearningCnt,
  method,
}) {
  const [[type, message], setAlert] = useState(["", ""]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [transcript, setTranscript] = useState("");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);
  const repeatRef = useRef(0);
  const cancelledRef = useRef(false);

  const { startQuestion, submitAnswer } = useIntegratedMonitor();

  useEffect(() => {
    startQuestion();
    setTranscript("");
    setIsRecording(false);
    setIsAnalyzing(false);
    setAlert(["", ""]);

    return () => {
      stopMediaTracks();
      document.dispatchEvent(new Event("stop-sound"));
    };
  }, [currentItemIdx, currentLearningCnt, startQuestion]);

  const stopMediaTracks = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  const handleStartRecording = async () => {
    try {
      setAlert(["", ""]);
      setTranscript("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setIsAnalyzing(true);
        const audioBlob = new Blob(chunksRef.current, {
          type: "audio/ogg;codecs=opus",
        });
        const formData = new FormData();
        formData.append("file", audioBlob, "voice.ogg");

        try {
          const res = await postStt(formData, "ko-KR");
          const cleanedText = res.replace(/[^ㄱ-ㅎㅏ-ㅣ가-힣\s]/g, "").trim();

          if (cleanedText) {
            setTranscript(cleanedText);
          } else {
            setAlert([
              "destructive",
              "인식된 글자가 없습니다. 다시 말씀해주세요.",
            ]);
            setIsRecording(false);
          }
        } catch (error) {
          setAlert(["destructive", "서버 분석 중 오류가 발생했습니다."]);
          setIsRecording(false);
        } finally {
          setIsAnalyzing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      setAlert(["destructive", "마이크 권한 오류가 발생했습니다."]);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      stopMediaTracks();
    }
  };

  const checkPronunciation = () => {
    if (!transcript) return;
    const isCorrect =
      transcript.replace(/\s/g, "") === item.letter.replace(/\s/g, "");
    const data = submitAnswer(transcript, item.letter);

    handleAnswer({
      user: transcript,
      correct: item.letter,
      isCorrect: isCorrect,
      responseTime: data.solvingTime,
      concentration: {
        level: "high",
        focusRate: 100,
        faceDetected: true,
        attentionScore: 1,
      },
    });
    setTranscript("");
    setIsRecording(false);
  };

  const playSound = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    repeatRef.current = 0;
    cancelledRef.current = false;

    const stopHandler = () => {
      document.removeEventListener("stop-sound", stopHandler);
      cancelledRef.current = true;
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
    };
    document.addEventListener("stop-sound", stopHandler);

    try {
      const url = await getAsset({ content: item.letter, type: "sound" });
      const playOnce = () => {
        if (cancelledRef.current) return;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.play().catch(() => setIsPlaying(false));
        audio.onended = () => {
          repeatRef.current += 1;
          if (repeatRef.current < 3 && !cancelledRef.current) {
            setTimeout(playOnce, 500);
          } else {
            setIsPlaying(false);
            document.removeEventListener("stop-sound", stopHandler);
          }
        };
      };
      playOnce();
    } catch (err) {
      setIsPlaying(false);
    }
  };

  return (
    <div className="grid h-full grid-cols-12 gap-4">
      <div className="col-span-9 grid grid-rows-[auto_1fr] gap-4">
        <div className="w-full row-span-1 p-2 text-2xl font-bold text-center border rounded-lg shadow bg-lime-200">
          {`"말하기"를 누르고 "${item.letter}"${JOSA().c(item.name, "을/를")} 소리내어 말해보세요.`}
        </div>

        <div className="grid w-full h-full grid-cols-9 row-span-2 gap-4">
          <div className="flex items-center justify-center w-full h-full col-span-4 bg-white border rounded-lg shadow">
            <img
              src={getAsset({ content: item.letter })}
              alt={item.letter}
              className="p-4 w-2/3 h-auto"
            />
          </div>

          <div className="flex flex-col items-center justify-center w-full h-full col-span-5 gap-6 bg-white border rounded-lg shadow">
            <Letters
              n={1}
              letter={item.letter}
              className="text-9xl font-extrabold"
              noBorder
            />
            <button
              onClick={playSound}
              disabled={isPlaying}
              className="bg-lime-500 rounded-2xl text-4xl py-4 px-8 font-bold hover:bg-lime-600 transition-colors"
            >
              {isPlaying ? "🔊 듣는 중..." : "🔊 소리 듣기"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center col-span-3 p-8 bg-white border rounded-lg shadow-sm gap-8">
        {/* 1. 대기 상태: 마이크 버튼 */}
        {!isRecording && !isAnalyzing && !transcript && (
          <button
            onClick={handleStartRecording}
            className="flex flex-col items-center justify-center gap-10 py-8 text-3xl font-bold bg-lime-500 rounded-2xl animate-focus hover:bg-lime-600 h-fit w-full max-w-48"
          >
            <p className="text-9xl">🎙️</p>
            <p className="max-w-fit text-wrap">말하기</p>
          </button>
        )}

        {/* 2. 녹음 중 / 분석 중 / 결과 확인 UI 통합 영역 */}
        {(isRecording || isAnalyzing || transcript) && (
          <div className="flex flex-col items-center justify-center gap-6 w-full">
            <p className="text-2xl font-extrabold text-center text-lime-600 animate-focus">
              {isAnalyzing
                ? "분석 중..."
                : isRecording
                  ? "듣는 중..."
                  : "인식 완료"}
            </p>

            {transcript && (
              <div className="text-center p-4 bg-lime-50 rounded-xl border border-lime-200 w-full">
                <p className="text-sm text-lime-600 mb-1">인식 결과</p>
                <p className="font-bold text-2xl text-black">"{transcript}"</p>
              </div>
            )}

            <div className="flex flex-col gap-3 w-full">
              {/* 녹음 중일 때만 보이는 정지 버튼 */}
              {isRecording && (
                <button
                  className="flex items-center justify-center gap-2 text-2xl font-bold bg-red-500 text-white rounded-xl py-4 hover:bg-red-600 transition-colors"
                  onClick={handleStopRecording}
                >
                  <Square size={24} fill="currentColor" /> 정지
                </button>
              )}

              {/* 결과가 있을 때만 보이는 제출 및 다시하기 */}
              {transcript && !isAnalyzing && (
                <>
                  <button
                    className="flex items-center justify-center gap-2 text-2xl font-bold bg-lime-500 text-white rounded-xl py-4 hover:bg-lime-600 transition-colors"
                    onClick={checkPronunciation}
                  >
                    <AudioLines size={24} /> 제출하기
                  </button>
                  <button
                    className="text-lg font-bold text-gray-500 underline"
                    onClick={handleStartRecording}
                  >
                    다시 녹음하기
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {message && (
          <div className="flex items-center gap-2 p-3 text-sm font-medium text-red-600 bg-red-50 rounded-lg">
            <AlertCircle size={18} />
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
