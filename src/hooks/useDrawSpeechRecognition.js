import { useRef, useCallback } from "react";

export function useDrawSpeechRecognition({
  onTextChange,
  onRecordingChange,
  lang = "ko-KR",
}) {
  const recognitionRef = useRef(null);

  const startSpeechRecognition = useCallback(() => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      onRecordingChange(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onTextChange(transcript);
    };

    recognition.onerror = (e) => {
      console.error("SpeechRecognition Error:", e);
    };

    recognition.onend = () => {
      onRecordingChange(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [lang, onTextChange, onRecordingChange]);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  return {
    startSpeechRecognition,
    stopSpeechRecognition,
  };
}
