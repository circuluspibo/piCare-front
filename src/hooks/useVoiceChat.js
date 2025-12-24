import { useState, useRef, useEffect, useCallback, useContext } from "react";
import { GlobalContext } from "@/contexts/GlobalContext";
import { PERSONA_SYSTEMS } from "@/utils/PersonaSystem";

export default function useVoiceChat({ enableTTS }) {
  const mediaRecorderRef = useRef(null);
  const { currentLang, personaId, personaVoice } = useContext(GlobalContext);

  const [isRecording, setIsRecording] = useState(false);
  const [gumStream, setGumStream] = useState(null);
  const [questionList, setQuestionList] = useState([]);
  const [answerList, setAnswerList] = useState([]);
  const [isPlayingTts, setIsPlayingTts] = useState(false);
  const [ttsQueue, setTtsQueue] = useState([]); // 음성 재생 대기열
  const [fullResponse, setFullResponse] = useState("");
  const [questionTimes, setQuestionTimes] = useState([]);

  const currentSystem = PERSONA_SYSTEMS[personaId];
  const apiBaseURL = import.meta.env.VITE_API_BASE_URL;
  const ttsBaseURL = import.meta.env.VITE_TTS_BASE_URL;

  // 1. 실제 오디오 재생 함수
  const playTtsSentence = useCallback(
    async (text, manualVoice) => {
      if (!text || text.trim().length === 0) return;

      const targetVoice =
        manualVoice !== undefined ? manualVoice : personaVoice;

      const ttsUrl =
        `${ttsBaseURL}/tts?` +
        new URLSearchParams({
          text: text.trim(),
          voice: `${targetVoice}`,
          lang: currentLang,
          static: "0",
          isPlay: "0",
        });

      return new Promise((resolve) => {
        const audio = new Audio(ttsUrl);
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch((err) => {
          console.warn("[재생 차단됨]:", err);
          resolve();
        });
      });
    },
    [ttsBaseURL, currentLang, personaVoice]
  );

  // 2. TTS 큐 감시 및 실행
  useEffect(() => {
    const processQueue = async () => {
      if (!enableTTS || isPlayingTts || ttsQueue.length === 0) return;
      setIsPlayingTts(true);
      const nextSentence = ttsQueue[0];
      setTtsQueue((prev) => prev.slice(1));
      await playTtsSentence(nextSentence);
      setIsPlayingTts(false);
    };
    processQueue();
  }, [ttsQueue, isPlayingTts, enableTTS, playTtsSentence]);

  // 3. 텍스트를 큐에 추가하는 헬퍼
  const addToTtsQueue = useCallback(
    (text) => {
      if (!enableTTS || !text.trim()) return;
      setTtsQueue((prev) => [...prev, text.trim()]);
    },
    [enableTTS]
  );

  // [추가된 기능]: 외부에서 메시지를 직접 주입 (자동모드/테스트용)
  const injectMessage = useCallback(
    (question, answer) => {
      if (!answer) return;
      setQuestionList((prev) => [...prev, question]);
      setQuestionTimes((prev) => [...prev, Date.now()]);
      setAnswerList((prev) => [...prev, answer]);
      addToTtsQueue(answer); // 화면 표시와 동시에 음성 재생 대기열 추가
    },
    [addToTtsQueue]
  );

  // 4. LLM 스트리밍 응답 처리
  const sendMessage = useCallback(
    async (message) => {
      if (!message) return;
      setFullResponse("");
      let accumulatedResponse = "";
      let lastSentenceEnd = 0;

      try {
        const res = await fetch(
          `${apiBaseURL}/txt2chat?` +
            new URLSearchParams({
              prompt: message,
              system: currentSystem,
              isPlay: "0",
              lang: currentLang,
            })
        );
        if (!res.ok) throw new Error(`NETWORK ERROR: ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        const sentenceRegex = /[^.!?\n]+[.!?\n]/g;

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            const remainingText = accumulatedResponse
              .slice(lastSentenceEnd)
              .trim();
            if (remainingText) addToTtsQueue(remainingText);
            const koreanResponse = accumulatedResponse.replace(
              /[^ㄱ-ㅎㅏ-ㅣ가-힣\s]/g,
              ""
            );
            setAnswerList((prev) => [...prev, koreanResponse]);
            break;
          }
          const chunk = decoder.decode(value, { stream: true });
          accumulatedResponse += chunk;
          setFullResponse(accumulatedResponse);

          let match;
          sentenceRegex.lastIndex = lastSentenceEnd;
          while ((match = sentenceRegex.exec(accumulatedResponse)) !== null) {
            const sentence = match[0].trim();
            if (sentence) addToTtsQueue(sentence);
            lastSentenceEnd = sentenceRegex.lastIndex;
          }
        }
      } catch (error) {
        console.error(`TEXT MESSAGE ERROR : `, error);
      }
    },
    [apiBaseURL, currentSystem, currentLang, addToTtsQueue]
  );

  // 5. 음성 녹음 및 STT 전송
  const handleStartRecording = async () => {
    if (isRecording) return;
    let chunks = [];
    try {
      setIsRecording(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setGumStream(stream);
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/ogg;codecs=opus" });
        const formData = new FormData();
        formData.append("file", audioBlob, "voice.ogg");
        try {
          const res = await fetch(
            `${apiBaseURL}/stt?lang=${currentLang}&isPlay=0`,
            { method: "POST", body: formData }
          );
          if (!res.ok) throw new Error(`STT ERROR: ${res.status}`);
          const result = await res.json();
          const recognizedText = (result.text || result.data || "").trim();
          const cleanedText = recognizedText
            .replace(/[^ㄱ-ㅎㅏ-ㅣ가-힣\s]/g, "")
            .trim();
          if (cleanedText) {
            setQuestionList((prev) => [...prev, cleanedText]);
            setQuestionTimes((prev) => [...prev, Date.now()]);
            await sendMessage(cleanedText);
          }
        } catch (error) {
          console.error("STT Process error:", error);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
    } catch (error) {
      console.error("Recording error:", error);
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    if (gumStream) {
      gumStream.getAudioTracks().forEach((track) => track.stop());
      setGumStream(null);
    }
  };

  const resetVoiceChat = useCallback(() => {
    setQuestionList([]);
    setAnswerList([]);
    setFullResponse("");
    setTtsQueue([]);
    setIsPlayingTts(false);
    setQuestionTimes([]);
  }, []);

  return {
    isRecording,
    questionList,
    answerList,
    fullResponse,
    questionTimes,
    isPlayingTts,
    handleStartRecording,
    handleStopRecording,
    sendMessage,
    injectMessage,
    currentLang,
    initGreeting: "무엇을 도와드릴까요?",
    resetVoiceChat,
    playTtsSentence,
  };
}
