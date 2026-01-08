// src/hooks/useVoiceChat.js

import { useState, useRef, useEffect, useCallback, useContext } from "react";
import { GlobalContext } from "@/contexts/GlobalContext";
import { PERSONA_SYSTEMS } from "@/utils/PersonaSystem";
import { getTxt2Chat, postStt } from "@/api/gpuService";
import { getTts } from "@/api/cpuService";
import { postLogger } from "@/api/loggerService";

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

  // 고유 대화 ID 생성
  const generateConvId = () => {
    return typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };
  // 로거 호출 함수
  const sendToLogger = useCallback(
    async (convId, userPrompt, aiResponse = "") => {
      try {
        await postLogger({
          conversation_id: convId,
          user_prompt: userPrompt,
          ai_response: aiResponse,
          personaId: personaId,
        });
        console.log("[Logger] 데이터 저장 성공");
      } catch (err) {
        console.error("[Logger] 데이터 저장 실패:", err);
      }
    },
    [personaId]
  );
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

      const ttsUrl = await getTts(text, targetVoice, currentLang);
      return new Promise((resolve) => {
        const audio = new Audio(ttsUrl);
        audio.onended = () => {
          URL.revokeObjectURL(ttsUrl);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(ttsUrl);
          resolve();
        };
        audio.play().catch((err) => {
          console.warn("[재생 차단됨]:", err);
          URL.revokeObjectURL(ttsUrl);
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
    async (message, convId) => {
      if (!message) return;

      setFullResponse("");
      let accumulatedResponse = "";
      let lastSentenceEnd = 0;

      try {
        const res = await getTxt2Chat(message, currentSystem, currentLang);

        const reader = res.getReader();
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

            if (convId) {
              sendToLogger(convId, message, koreanResponse);
            }
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
    [currentSystem, currentLang, addToTtsQueue, addMessage, sendToLogger]
  );

  // 5. 음성 녹음 및 STT 전송
  const handleStartRecording = async () => {
    if (isRecording) return;
    let chunks = [];
    try {
      setIsRecording(true);
      const currentConvId = generateConvId();

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
          const cleanedText = res.replace(/[^ㄱ-ㅎㅏ-ㅣ가-힣\s]/g, "").trim();

          if (cleanedText) {
            addMessage("user", cleanedText);
            if (enableTTS) {
              await sendMessage(cleanedText, currentConvId);
            } else {
              // [케이스 B] STT만 실행되는 경우: 즉시 로깅 (ai_response는 빈 값)
              sendToLogger(currentConvId, cleanedText, "");
            }
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
