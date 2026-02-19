/* eslint-disable react-hooks/exhaustive-deps */
import { getAsset } from "@/api/haniService";
import Options from "@/components/Options";
import { useIntegratedMonitor } from "@/hooks/useIntegratedMonitor";
import { JOSA, TARGETS } from "@/utils/haniUtil";
import React, { useState, useEffect, useRef } from "react";

const LearnByListen = ({
  item,
  target,
  handleAnswer, // Learn.jsx의 handleAnswer
  contents, // 전체 데이터 (보기 생성을 위해 contents 사용)
  currentItemIdx, // 이름 통일
  currentLearningCount,
  isSubmitting,
}) => {
  const [options, setOptions] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayed, setPlayed] = useState(false);

  const audioRef = useRef(null);
  const repeatRef = useRef(0);
  const cancelledRef = useRef(false);

  const { startQuestion, submitAnswer } = useIntegratedMonitor();

  // 보기 생성 로직 (경량화: contents에서 바로 추출)
  const generateChoices = () => {
    setIsPlaying(false);
    const correct = item.letter;
    const pool = contents?.map((i) => i.letter) || [];
    const choices = [correct];
    while (choices.length < 3 && pool.length >= 3) {
      const random = pool[Math.floor(Math.random() * pool.length)];
      if (!choices.includes(random)) choices.push(random);
    }
    setTimeout(() => {
      setOptions(choices.sort(() => Math.random() - 0.5));
    }, 300);
  };

  const stopPlayback = () => {
    cancelledRef.current = true;
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setPlayed(true);
  };

  const handleSelect = (choice) => {
    document.dispatchEvent(new Event("stop-sound"));

    // 모니터링 데이터 생성
    const data = submitAnswer(choice, item.letter);
    const isCorrect = choice === item.letter;

    if (!isCorrect) {
      setPlayed(false);
      generateChoices();
    }

    handleAnswer({
      user: choice,
      correct: item.letter,
      isCorrect: choice === item.letter,
      responseTime: data.solvingTime,
      concentration: {
        level: data.concentrationLevel || "high",
        focusRate: 100,
        faceDetected: true,
        attentionScore: 1,
      },
    });
  };

  const playSound = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    setPlayed(false);
    repeatRef.current = 0;
    cancelledRef.current = false;

    const stopHandler = () => {
      document.removeEventListener("stop-sound", stopHandler);
      stopPlayback();
    };
    document.addEventListener("stop-sound", stopHandler);

    try {
      const url = getAsset({ content: item.letter, type: "sound" });
      const playOnce = () => {
        if (cancelledRef.current) return;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.play().catch(() => stopPlayback());
        audio.onended = () => {
          repeatRef.current += 1;
          if (repeatRef.current < 2 && !cancelledRef.current) {
            setTimeout(playOnce, 500);
          } else {
            stopPlayback();
            document.removeEventListener("stop-sound", stopHandler);
          }
        };
      };
      playOnce();
    } catch (err) {
      stopPlayback();
    }
  };

  useEffect(() => {
    startQuestion(); // 문항 시작 시 타이머 시작
    setPlayed(false);
    document.dispatchEvent(new Event("stop-sound"));
    generateChoices();
    return () => document.dispatchEvent(new Event("stop-sound"));
  }, [currentItemIdx, currentLearningCount]);

  return (
    <div className="grid h-full grid-cols-12 gap-4">
      <div className="col-span-9 grid grid-rows-[auto_1fr] gap-4">
        {/* 상단 가이드 */}
        <div className="w-full row-span-1 p-2 text-2xl font-bold text-center border rounded-lg shadow bg-cyan-200">
          {`"소리 듣기"를 선택하여 들리는 소리와 같은 "${TARGETS[target]}"${JOSA().c(TARGETS[target], "을/를")} 선택하세요.`}
        </div>

        <div className="grid w-full h-full grid-cols-9 row-span-2 gap-4">
          {/* 좌측 힌트 영역 */}
          <div className="flex items-center justify-center w-full h-full col-span-4 gap-4 bg-white border rounded-lg shadow">
            {target !== "letter" ? (
              <img
                src={getAsset({ content: item.letter })}
                alt={item.letter}
                className="p-4 w-2/3 h-auto"
              />
            ) : (
              <div className="flex items-center justify-center w-full pr-4 text-6xl font-extrabold">
                <img
                  src={getAsset({ content: item.components[0] })}
                  alt="comp1"
                  className="w-1/3"
                />
                <span>+</span>
                <img
                  src={getAsset({ content: item.components[1] })}
                  alt="comp2"
                  className="w-1/3"
                />
                <span>=</span>
              </div>
            )}
          </div>

          {/* 우측 재생 영역 */}
          <div className="flex flex-col items-center justify-center w-full h-full col-span-5 gap-2 bg-white border rounded-lg shadow">
            <button
              onClick={playSound}
              disabled={isPlaying}
              className={`flex flex-col items-center justify-center gap-6 p-8 rounded-2xl transition-all ${
                isPlaying
                  ? "bg-cyan-100 text-teal-500"
                  : "bg-cyan-500 text-white animate-focus"
              }`}
            >
              <p className="text-9xl">🔊</p>
              <p className="text-3xl font-bold">
                {isPlaying ? "소리 듣는 중..." : "소리 듣기"}
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* 우측 보기 영역 */}
      <Options
        id={`${currentItemIdx}-${currentLearningCount}`}
        enabled={isPlayed && !isSubmitting} // 소리를 들어야 선택 가능
        correctAnswer={item.letter}
        options={options}
        onSelect={handleSelect}
        color="cyan"
        currentItemIndex={currentItemIdx}
      />
    </div>
  );
};

export default LearnByListen;
