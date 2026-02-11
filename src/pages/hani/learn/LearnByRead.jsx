import { getAsset } from "@/api/haniService";
import Letters from "@/components/Letters";
import Options from "@/components/Options";
import { useIntegratedMonitor } from "@/hooks/useIntegratedMonitor";
import { JOSA } from "@/utils/haniUtil";
import { useCallback, useEffect, useState } from "react";

export default function LearnByRead({
  item,
  target,
  handleAnswer,
  currentItemIdx,
  currentQuestion,
  currentLearningCnt,
  contents,
  isSubmitting,
}) {
  // 선택 옵션 생성
  const [options, setOptions] = useState([]);
  const generateChoices = useCallback(() => {
    if (!item || !contents.length) return;

    const correct = item.letter;
    const pool = contents.map((i) => i.letter);
    const choices = [correct];

    // 무한 루프 방지 가드 추가 (데이터가 3개 미만일 경우 대비)
    const targetLength = Math.min(3, pool.length);

    while (choices.length < targetLength) {
      const random = pool[Math.floor(Math.random() * pool.length)];
      if (!choices.includes(random)) choices.push(random);
    }

    const newOne = [...choices].sort(() => Math.random() - 0.5);

    setTimeout(() => {
      setOptions(newOne);
    }, 300);
  }, [item, contents]);

  const { startQuestion, submitAnswer } = useIntegratedMonitor();

  useEffect(() => {
    startQuestion();
    generateChoices();
  }, [item?.letter, currentQuestion, startQuestion, generateChoices]);
  const handleSelect = (choice) => {
    const data = submitAnswer(choice, item.letter);
    // console.log("data = ", data);
    if (!data.isCorrect) {
      generateChoices();
    }

    // 백엔드 오리지널 페이로드 규격에 맞게 데이터 패키징
    const attemptPayload = {
      user: choice,
      correct: item.letter,
      isCorrect: data.isCorrect,
      responseTime: data.solvingTime,
      concentration: {
        level: data.concentrationLevel,
        focusRate: data.focusRate,
        faceDetected: data.faceDetected,
        attentionScore: data.attentionScore,
      },
    };

    handleAnswer(attemptPayload);
  };
  return (
    <>
      <div className="grid h-full grid-cols-12 gap-4">
        <div className="col-span-9 grid grid-rows-[auto_1fr] gap-4">
          <div className="w-full row-span-1 p-2 text-2xl font-bold text-center border rounded-lg shadow border-neutral-300 bg-amber-300/80">
            {`"${item.letter}"${JOSA().c(item.name, "을/를")} 찾아보세요.`}
          </div>
          <div className="grid w-full h-full grid-cols-9 row-span-2 gap-4">
            {/* 힌트 영역 */}
            <div className="flex items-center justify-center w-full h-full col-span-4 gap-4 bg-white border rounded-lg shadow">
              {target !== "letter" && (
                <div className="flex items-center justify-center col-span-2 p-4 font-extrabold text-9xl">
                  <img
                    src={getAsset({ content: item.letter })}
                    alt={item.letter}
                    className={target === "word" ? "p-2 aspect-square" : ""}
                  />
                </div>
              )}
              {target === "letter" && (
                <div className="flex items-center justify-center w-full pr-4 text-6xl font-extrabold">
                  <img
                    src={getAsset({ content: item.components[0] })}
                    alt={item.components[0]}
                    className="flex-1 object-contain w-1/3 h-auto scale-75"
                  />
                  <span>+</span>
                  <img
                    src={getAsset({ content: item.components[1] })}
                    alt={item.components[1]}
                    className="flex-1 object-contain w-1/3 h-auto"
                  />
                  <span>=</span>
                </div>
              )}
            </div>
            {/* 문제-보기 영역 */}
            <div className="flex items-center justify-center w-full h-full col-span-5 gap-2 bg-white border rounded-lg shadow">
              {target !== "word" && (
                <Letters
                  n={1}
                  letter={item.letter}
                  className="col-span-1 p-2 font-extrabold"
                  noBorder
                />
              )}
              {target === "word" && (
                <>
                  {item.components.map((c, i) => (
                    <Letters
                      n={item.components.length + 1}
                      letter={c}
                      key={`${c}-${i}`}
                      className="col-span-1 p-2 font-extrabold"
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
        {/* 보기 영역 */}
        <Options
          id={`${currentItemIdx}-${currentLearningCnt}-${currentQuestion}-${target}`}
          enabled={!isSubmitting}
          correctAnswer={item.letter}
          options={options}
          onSelect={handleSelect}
          color="amber"
          currentItemIndex={currentItemIdx}
        />
      </div>
      );
    </>
  );
}
