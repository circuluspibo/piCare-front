// LearnBySpeak.jsx
/* eslint-disable no-unused-vars */
import React, { useState, useRef, useEffect } from "react";
import { Square, AudioLines } from "lucide-react";
import { getAsset } from "@/api/haniService";

export default function LearnBySpeak({
  item,
  handleAnswer,
  currentItemIdx,
  currentLearningCnt,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [startTime, setStartTime] = useState(null);

  const audioRef = useRef(null);
  const repeatRef = useRef(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    return () => stopPlayback();
  }, [item, currentItemIdx, currentLearningCnt]);

  const stopPlayback = () => {
    cancelledRef.current = true;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.onended = null;
      audioRef.current = null;
    }

    setIsPlaying(false);
  };

  const playSound = () => {
    if (isPlaying || isRecording) return;

    setIsPlaying(true);
    repeatRef.current = 0;
    cancelledRef.current = false;

    const playLoop = () => {
      if (cancelledRef.current) return;

      const url = getAsset({
        content: item.letter,
        type: "sound",
      });

      const audio = new Audio(url);
      audioRef.current = audio;

      audio
        .play()
        .then(() => {
          audio.onended = () => {
            repeatRef.current++;

            if (repeatRef.current < 3 && !cancelledRef.current) {
              setTimeout(playLoop, 600);
            } else {
              stopPlayback();
            }
          };
        })
        .catch(() => {
          stopPlayback();
        });
    };

    playLoop();
  };

  const onStartRecord = () => {
    if (isPlaying) stopPlayback();

    setTranscript("");
    setStartTime(Date.now());
  };

  const onStopRecord = () => {
    stop();
  };

  const checkPronunciation = () => {
    //
  };

  return (
    <div className="grid h-full grid-cols-12 gap-4">
      <div className="col-span-9 grid grid-rows-[auto_1fr] gap-4">
        <div className="w-full p-4 text-2xl font-bold text-center border rounded-lg shadow bg-lime-200">
          {`"말하기"를 누르고 "${item.letter}"을/를 소리내어 말해보세요.`}
        </div>

        <div className="grid w-full h-full grid-cols-9 gap-4">
          <div className="flex items-center justify-center col-span-4 bg-white border rounded-lg shadow">
            <p className="text-9xl">{item.letter}</p>
          </div>

          <div className="flex flex-col items-center justify-center col-span-5 gap-6 bg-white border rounded-lg shadow">
            <button
              onClick={playSound}
              disabled={isPlaying}
              className="bg-lime-500 rounded-2xl text-4xl py-4 px-8 font-bold transition-colors disabled:bg-gray-200"
            >
              {isPlaying ? "🔊 재생 중..." : "🔊 소리 듣기"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center col-span-3 p-8 bg-white border rounded-lg shadow-sm gap-8">
        {!transcript && (
          <button
            onClick={onStartRecord}
            disabled={isPlaying}
            className="flex flex-col items-center justify-center gap-10 py-8 text-3xl font-bold bg-lime-500 rounded-2xl animate-focus w-full disabled:opacity-50"
          >
            <p className="text-9xl">🎙️</p>
            <p>말하기</p>
          </button>
        )}

        {transcript && (
          <div className="flex flex-col items-center justify-center gap-6 w-full">
            <p className="text-2xl font-extrabold text-center text-lime-600">
              {/* {error ? error : transcript ? "인식되었습니다" : "듣는 중..."} */}
            </p>

            {
              <button
                onClick={onStopRecord}
                className="flex items-center justify-center gap-2 text-2xl font-bold bg-red-500 text-white py-3 px-6 rounded-xl w-full"
              >
                <Square /> 중지
              </button>
            }

            <button
              onClick={checkPronunciation}
              disabled={""}
              className={`flex items-center justify-center gap-2 text-2xl font-bold py-3 px-6 rounded-xl w-full transition 
                    "bg-blue-500 text-white"
                  `}
            >
              <AudioLines /> 제출하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
