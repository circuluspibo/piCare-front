import { useCallback, useRef } from "react";

export function useSpeechRecognition({ onTextChange, onRecordingChange }) {
  const recognitionRef = useRef(null);
  const forceStopRef = useRef(false);

  const getSpeechRecognitionConstructor = () =>
    window.SpeechRecognition || window.webkitSpeechRecognition;

  /**
   * 내부 정리용 (native recognition 완전 종료)
   */
  const disposeRecognition = useCallback(
    ({ uiOnly = false } = {}) => {
      const rec = recognitionRef.current;
      if (!rec) return;

      rec.onend = null;
      rec.onerror = null;
      rec.onresult = null;

      rec.stop && rec.stop();
      rec.abort && rec.abort();

      recognitionRef.current = null;

      if (!uiOnly) {
        onRecordingChange(false);
      }
    },
    [onRecordingChange]
  );

  /**
   * 외부에서 호출하는 "정지"
   */
  const stopSpeechRecognition = useCallback(async () => {
    forceStopRef.current = true;
    disposeRecognition({ uiOnly: false });
  }, [disposeRecognition]);

  /**
   * 음성 인식 시작
   */
  const startSpeechRecognition = useCallback(async () => {
    const SR = getSpeechRecognitionConstructor();
    if (!SR) return;
    if (!window.isSecureContext) return;

    try {
      // TTS 중단
      window.speechSynthesis?.cancel?.();

      // 기존 세션 정리 (UI는 유지)
      disposeRecognition({ uiOnly: true });

      const rec = new SR();
      recognitionRef.current = rec;

      rec.lang = "ko-KR";
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.continuous = true;

      forceStopRef.current = false;

      rec.onstart = () => {
        onRecordingChange(true);
      };

      rec.onresult = (e) => {
        let text = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const seg = e.results[i][0]?.transcript || "";
          text = seg.trim();
        }
        // console.log("rec = ", text);
        onTextChange(text);
      };

      rec.onerror = (e) => {
        if (forceStopRef.current) return;
        console.error(e);
      };

      rec.onend = () => {
        if (!forceStopRef.current) {
          try {
            rec.start();
          } catch {
            setTimeout(() => {
              rec.start();
            }, 300);
          }
        }
      };

      rec.start();
    } catch (error) {
      console.error(error);
    }
  }, [disposeRecognition, onTextChange, onRecordingChange]);

  return {
    startSpeechRecognition,
    stopSpeechRecognition,
    // disposeRecognition, // 필요 없으면 안 써도 됨
  };
}
