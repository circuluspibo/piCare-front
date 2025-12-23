// src/hooks/useVoiceChat.js

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
      // manualVoice 인자 추가
      if (!text || text.trim().length === 0) return;

      // 인자로 전달된 목소리가 있으면 그것을 쓰고, 없으면 Context의 값을 사용
      const targetVoice =
        manualVoice !== undefined ? manualVoice : personaVoice;

      const ttsUrl =
        `${ttsBaseURL}/tts?` +
        new URLSearchParams({
          text: text.trim(),
          voice: `${targetVoice}`, // 결정된 목소리 값 사용
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

  // 2. TTS 큐 감시 및 실행 (이 부분이 "playTtsQueue" 역할을 수행)
  useEffect(() => {
    const processQueue = async () => {
      // 조건: TTS 활성화 && 현재 재생 중 아님 && 큐에 문장이 있음
      if (!enableTTS || isPlayingTts || ttsQueue.length === 0) return;

      setIsPlayingTts(true); // 잠금

      const nextSentence = ttsQueue[0];
      // 큐에서 현재 문장 제외
      setTtsQueue((prev) => prev.slice(1));

      console.log("[Queue 처리 시작]:", nextSentence);
      await playTtsSentence(nextSentence);

      setIsPlayingTts(false); // 잠금 해제
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

        // 문장 구분 기호: . ! ? \n
        const sentenceRegex = /[^.!?\n]+[.!?\n]/g;

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            // 미처 처리되지 않은 마지막 문장 처리
            const remainingText = accumulatedResponse
              .slice(lastSentenceEnd)
              .trim();
            if (remainingText) addToTtsQueue(remainingText);

            // 한글 필터링
            const koreanResponse = accumulatedResponse.replace(
              /[^가-힣\s]/g,
              ""
            );
            setAnswerList((prev) => [...prev, koreanResponse]);
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          accumulatedResponse += chunk;
          setFullResponse(accumulatedResponse);

          // 스트리밍 중 문장이 완성될 때마다 큐에 추가
          let match;
          sentenceRegex.lastIndex = lastSentenceEnd;
          while ((match = sentenceRegex.exec(accumulatedResponse)) !== null) {
            const sentence = match[0].trim();
            if (sentence) {
              addToTtsQueue(sentence);
            }
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

          // 필터: 특수기호 제거 및 유효 텍스트 확인
          const cleanedText = recognizedText
            .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣ?.!,]/g, "")
            .trim();

          if (cleanedText) {
            setQuestionList((prev) => [...prev, cleanedText]);
            setQuestionTimes((prev) => [...prev, Date.now()]);
            await sendMessage(cleanedText); // 여기서 txt2chat 호출
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
    currentLang,
    initGreeting: "무엇을 도와드릴까요?",
    resetVoiceChat,
    playTtsSentence,
  };
}
