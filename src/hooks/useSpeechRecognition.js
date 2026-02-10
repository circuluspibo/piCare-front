import { useState, useEffect, useRef } from "react";

export default function useSpeechRecognition({ lang = "ko-KR" } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState([]);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      console.warn("이 브라우저는 Web Speech API를 지원하지 않습니다.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      setMessages((prev) => [...prev, { role: "user", text: transcript }]);
    };

    recognition.onerror = (event) => {
      console.error("STT 오류:", event.error);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    return () => recognition.stop();
  }, [lang]);

  const handleStartRecording = () => {
    if (!recognitionRef.current) return;
    setIsRecording(true);
    recognitionRef.current.start();
  };

  const handleStopRecording = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
  };

  return { isRecording, messages, handleStartRecording, handleStopRecording };
}
