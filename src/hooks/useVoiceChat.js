// src/hooks/useVoiceChat.js

import { useState, useRef, useEffect, useCallback, useContext } from "react";
import { GlobalContext } from "@/contexts/GlobalContext";
import { PERSONA_SYSTEMS } from "@/utils/PersonaSystem";
import { getTxt2Chat, postStt } from "@/api/gpuService";
import { getTts } from "@/api/cpuService";

export default function useVoiceChat({ enableTTS }) {
  const mediaRecorderRef = useRef(null);
  const { currentLang, personaId, personaVoice } = useContext(GlobalContext);

  const [isRecording, setIsRecording] = useState(false);
  const [gumStream, setGumStream] = useState(null);

  const [messages, setMessages] = useState([]); // {id, role: 'user | 'ai', text, timestamp },

  const [isPlayingTts, setIsPlayingTts] = useState(false);
  const [ttsQueue, setTtsQueue] = useState([]); // 음성 재생 대기열
  const [fullResponse, setFullResponse] = useState("");

  const currentSystem = PERSONA_SYSTEMS[personaId];

  // 메시지 추가 헬퍼 함수
  const addMessage = useCallback((role, text) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        role,
        text,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  // 1. 실제 오디오 재생 함수
  const playTtsSentence = useCallback(
    async (text, manualVoice) => {
      if (!text || text.trim().length === 0) return;

      const targetVoice =
        manualVoice !== undefined ? manualVoice : personaVoice;

      const ttsUrl = getTts(text, targetVoice, currentLang);
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
    [currentLang, personaVoice]
  );

  // 2. TTS 큐 감시 및 실행 (이 부분이 "playTtsQueue" 역할을 수행)
  useEffect(() => {
    const processQueue = async () => {
      if (!enableTTS || isPlayingTts || ttsQueue.length === 0) return;

      setIsPlayingTts(true);
      const nextSentence = ttsQueue[0];

      setTtsQueue((prev) => prev.slice(1));
      // console.log("[Queue 처리 시작]:", nextSentence);
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
        const res = getTxt2Chat(message, currentSystem, currentLang);

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
            addMessage("ai", koreanResponse);
            setFullResponse("");
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
    [currentSystem, currentLang, addToTtsQueue, addMessage]
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
          const res = await postStt(formData, currentLang);
          if (!res.ok) throw new Error(`STT ERROR: ${res.status}`);

          const result = await res.json();
          const recognizedText = (result.text || result.data || "").trim();

          const cleanedText = recognizedText
            .replace(/[^ㄱ-ㅎㅏ-ㅣ가-힣\s]/g, "")
            .trim();

          if (cleanedText) {
            addMessage("user", cleanedText);
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
    setMessages([]);
    setFullResponse("");
    setTtsQueue([]);
    setIsPlayingTts(false);
  }, []);

  return {
    isRecording,
    messages,
    fullResponse,
    isPlayingTts,
    handleStartRecording,
    handleStopRecording,
    sendMessage,
    currentLang,
    initGreeting: "무엇을 도와드릴까요?",
    resetVoiceChat,
    playTtsSentence,
    addMessage,
  };
}
