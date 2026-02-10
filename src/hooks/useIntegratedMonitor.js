import { useRef, useCallback } from "react";

export const useIntegratedMonitor = () => {
  const questionStartTime = useRef(null);

  const startQuestion = useCallback(() => {
    questionStartTime.current = Date.now();
  }, []);

  const submitAnswer = useCallback((userAnswer, correctAnswer) => {
    const isCorrect = userAnswer === correctAnswer;
    const solvingTime = questionStartTime.current
      ? (Date.now() - questionStartTime.current) / 1000
      : 0;

    return {
      solvingTime,
      isCorrect,
      concentrationLevel: "high",
      focusRate: 100,
      faceDetected: true,
      attentionScore: 1,
    };
  }, []);

  return { startQuestion, submitAnswer };
};
