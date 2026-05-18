import { useLearnContext } from "@/contexts/learnContext";
import LearnByRead from "./learn/LearnByRead";
import LearnByListen from "./learn/LearnByListen";
import LearnByWrite from "./learn/LearnByWrite";
import { useTracker } from "@/hooks/useTracker";
import { useEffect, useRef } from "react";
import { postFeature } from "@/api/picareService";

export default function Learn() {
  const {
    item,
    target,
    contentData,
    currentItemIdx,
    isDataLoading,
    isSessionLoading,
    sendAnswer,
    method,
    isSubmitting,
    resultData, // [추가] Context에서 계산된 최종 결과 데이터
  } = useLearnContext();

  const { recordTouch, recordScore, save, resetIdleTimer } = useTracker();
  const isSavedRef = useRef(false);
  const featureStartRef = useRef(null);

  // method 확정 시 feature_log start 전송
  useEffect(() => {
    if (method) {
      featureStartRef.current = Date.now();
      postFeature({ featureId: `learn_${method}`, command: "start" });
    }
    // 중단 이탈 시 complete 전송 (isSavedRef로 정상 완료와 중복 방지)
    return () => {
      if (!isSavedRef.current && featureStartRef.current && method) {
        const duration = Math.round((Date.now() - featureStartRef.current) / 1000);
        postFeature({ featureId: `learn_${method}`, command: "complete", duration });
      }
    };
  }, [method]);

  // [핵심 변경] 최종 결과(resultData)가 업데이트되면 트래커에 기록하고 저장
  useEffect(() => {
    // resultData.time이 0보다 크다는 것은 세션이 종료되어 시간이 계산되었다는 의미
    if (resultData && resultData.time > 0 && !isSavedRef.current) {
      const totalQuestions = contentData?.contents?.length || 0;

      // 1. 서버에서 계산된 정확한 전체 시간과 최종 성공 개수로 업데이트
      recordScore(totalQuestions, resultData.successCount, resultData.time);

      // 2. 트래커 최종 저장 (isCompleted = true)
      save();

      // 3. feature_log complete 전송
      if (method && featureStartRef.current) {
        const duration = Math.round((Date.now() - featureStartRef.current) / 1000);
        postFeature({ featureId: `learn_${method}`, command: "complete", duration });
      }

      isSavedRef.current = true;
      console.log(
        "학습 완료: 전체 소요 시간으로 트래커 저장 완료",
        resultData.time,
      );
    }
  }, [resultData, contentData, recordScore, save, method]);

  const handleAnswer = async (attemptPayload) => {
    // 이제 개별 문항에서는 점수만 실시간 업데이트 (시간은 0으로 보냄)
    const totalQty = contentData?.contents?.length || 0;
    const currentSuccess = attemptPayload.isCorrect
      ? currentItemIdx + 1
      : currentItemIdx;

    recordScore(totalQty, currentSuccess, 0);
    sendAnswer(attemptPayload);
  };

  if (isDataLoading || isSessionLoading) {
    return (
      <div className="flex items-center justify-center h-full text-2xl">
        학습 데이터를 불러오는 중입니다...
      </div>
    );
  }

  if (!item) return <div>학습 컨텐츠를 찾을 수 없습니다.</div>;

  const commonProps = {
    item,
    target,
    handleAnswer,
    currentItemIdx,
    contents: contentData?.contents,
    isSubmitting,
    onInteraction: () => {
      recordTouch();
      resetIdleTimer();
    },
  };

  return (
    <>
      {item && (
        <>
          {method === "read" && <LearnByRead {...commonProps} />}
          {method === "listen" && <LearnByListen {...commonProps} />}
          {method === "write" && <LearnByWrite {...commonProps} />}
        </>
      )}
    </>
  );
}
