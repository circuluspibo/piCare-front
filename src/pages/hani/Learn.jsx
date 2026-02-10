import { useLearnContext } from "@/contexts/learnContext";
import LearnByRead from "./learn/LearnByRead";
import LearnBySpeak from "./learn/LearnBySpeak";
import LearnByListen from "./learn/LearnByListen";
import LearnByWrite from "./learn/LearnByWrite";

export default function Learn() {
  const {
    item,
    target,
    isDataLoading,
    contentData,
    currentQuestion,
    currentItemIdx,
    currentLearningCnt,
    isSessionLoading,
    sendAnswer,
    method,
  } = useLearnContext();

  // NOTE: 사용자 풀이 결과 전송
  const handleAnswer = (attemptPayload) => {
    // attemptPayload에는 user, correct, isCorrect, responseTime, concentration이 들어있음
    sendAnswer(attemptPayload);
    // console.log("sendAnswer = ", attemptPayload);
  };

  // NOTE: 데이터가 로딩 중일 때 빈 화면(또는 로딩바)을 보여줍니다.
  if (isDataLoading || isSessionLoading) {
    return (
      <div className="flex items-center justify-center h-full text-2xl">
        학습 데이터를 불러오는 중입니다...
      </div>
    );
  }
  // NOTE: 데이터 로딩은 끝났는데 item이 없는 경우 (예외 처리)
  if (!item) {
    return <div>학습 컨텐츠를 찾을 수 없습니다.</div>;
  }

  const commonProps = {
    item,
    target,
    handleAnswer,
    currentItemIdx,
    currentQuestion,
    currentLearningCnt,
    contents: contentData?.contents,
  };
  return (
    <>
      {item && (
        <>
          {method === "read" && <LearnByRead {...commonProps} />}
          {method === "listen" && <LearnByListen {...commonProps} />}
          {method === "speak" && <LearnBySpeak {...commonProps} />}
          {/** TODO: Write에 맞는 OCR 모델 변경 필요할듯 */}
          {/* {method === "write" && <LearnByWrite {...commonProps} />} */}
        </>
      )}
    </>
  );
}
