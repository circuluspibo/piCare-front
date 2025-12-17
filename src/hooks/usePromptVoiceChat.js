import { useState, useRef, useCallback, useEffect } from "react";

export default function usePromptVoiceChat({ enableTTS = false }) {
  const recognitionRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [questionList, setQuestionList] = useState([]);
  const [answerList, setAnswerList] = useState([]);
  const [fullResponse, setFullResponse] = useState("");
  const [questionTimes, setQuestionTimes] = useState([]);
  const [currentLang] = useState("ko-KR");

  const initGreeting = "마이크를 눌러 질문해 주세요";

  const speak = useCallback(
    (text) => {
      if (!enableTTS) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = currentLang;
      window.speechSynthesis.speak(utterance);
    },
    [enableTTS, currentLang]
  );

  const handleStartRecording = useCallback(() => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = currentLang;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setQuestionList((prev) => [...prev, text]);
      setQuestionTimes((prev) => [...prev, Date.now()]);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [currentLang]);

  const handleStopRecording = useCallback(async () => {
    recognitionRef.current?.stop();

    // 🔹 예시 응답 (기존 API 연동 부분 그대로 유지 가능)
    const mockAnswer = "이것은 예시 응답입니다.";
    setAnswerList((prev) => [...prev, mockAnswer]);
    setFullResponse(mockAnswer);
    speak(mockAnswer);
  }, [speak]);

  return {
    isRecording,
    questionList,
    answerList,
    fullResponse,
    questionTimes,
    handleStartRecording,
    handleStopRecording,
    initGreeting,
    currentLang,
  };
}
