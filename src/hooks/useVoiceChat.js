// src/hooks/useVoiceChat.js

import { useState, useRef, useEffect, useCallback, useContext } from "react";
import LANGUAGE_SYSTEMS from "@/utils/LanguageSystem";
import { GlobalContext } from "@/contexts/GlobalContext";

export default function useVoiceChat({ enableTTS }) {
  // 참조 관리
  const mediaRecorderRef = useRef(null);
  const { currentLang, personaVoice } = useContext(GlobalContext); // GlobalContext에서 설정 가져오기

  // 상태 관리
  const [isRecording, setIsRecording] = useState(false);
  const [gumStream, setGumStream] = useState(null);
  const [questionList, setQuestionList] = useState([]);
  const [answerList, setAnswerList] = useState([]);
  const [isPlayingTts, setIsPlayingTts] = useState(false);
  const [ttsQueue, setTtsQueue] = useState([]);
  const [fullResponse, setFullResponse] = useState("");
  const [questionTimes, setQuestionTimes] = useState([]);

  // 유틸리티 및 상수
  const currentSystem = LANGUAGE_SYSTEMS[currentLang];
  const apiBaseURL = import.meta.env.VITE_API_BASE_URL;
  const ttsBaseURL = import.meta.env.VITE_TTS_BASE_URL;

  // 헬퍼 함수: TTS 문장 재생
  const playTtsSentence = useCallback(
    async (text) => {
      const ttsUrl =
        `${ttsBaseURL}/tts?` +
        new URLSearchParams({
          text,
          voice: `${personaVoice}`,
          lang: currentLang,
          static: "0",
          isPlay: "0",
        });

      return new Promise((resolve) => {
        const audio = new Audio(ttsUrl);
        // 오류 또는 재생 완료 시 resolve 호출하여 다음 큐로 진행
        audio.onended = resolve;
        audio.onerror = resolve;
        // 오디오 재생을 시도하고, Promise가 rejected 되는 경우를 처리하여 다음 큐로 진행
        audio.play().catch(resolve);
      });
    },
    [ttsBaseURL, currentLang, personaVoice]
  ); // currentVoice는 상수이므로 의존성 배열에서 제거 가능

  // 헬퍼 함수: TTS 큐에 문장 추가
  const addToTtsQueue = useCallback((text) => {
    if (!enableTTS) {
      return;
    }

    setTtsQueue((prev) => [...prev, text]);
  }, []);

  // TTS 재생 및 큐 로직 (useEffect의 의존성으로 사용되므로 useCallback으로 감싸야 함)
  const processTtsQueue = useCallback(async () => {
    if (!enableTTS) {
      return;
    }

    // 이미 재생 중이거나 큐가 비어있으면 실행하지 않음
    if (ttsQueue.length === 0 || isPlayingTts) return;

    // 큐 처리를 시작하면서 재생 상태로 변경
    setIsPlayingTts(true);
    const queueSnapshot = [...ttsQueue];
    setTtsQueue([]);

    for (const text of queueSnapshot) {
      await playTtsSentence(text);
    }
    setIsPlayingTts(false);
  }, [ttsQueue, isPlayingTts, playTtsSentence, enableTTS]);

  // TTS 큐가 업데이트될 때마다 processTtsQueue 실행
  useEffect(() => {
    if (!enableTTS) {
      return;
    }

    processTtsQueue();
  }, [ttsQueue, processTtsQueue, enableTTS]);

  // 서버에 메시지 전송 및 스트리밍 응답 처리
  const sendMessage = useCallback(
    async (message) => {
      if (!message) return;
      setFullResponse("");
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

        if (!res.ok) {
          throw new Error(`NETWORK ERROR: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedResponse = "";

        // 문장 구분 정규식
        const sentenceRegex = /([^.!?\n]*[.!?\n]\s*)/g;

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            // 남은 텍스트 처리
            const remainingText = accumulatedResponse
              .slice(lastSentenceEnd)
              .trim();
            if (remainingText) {
              addToTtsQueue(remainingText);
            }

            setAnswerList((prev) => [...prev, accumulatedResponse]);

            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          accumulatedResponse += chunk;

          setFullResponse(accumulatedResponse);

          let processedLength = 0;
          const segmentToAnalyze = accumulatedResponse.slice(lastSentenceEnd);
          let match;
          sentenceRegex.lastIndex = 0;

          // 문장 단위로 TTS 큐에 추가
          while ((match = sentenceRegex.exec(segmentToAnalyze)) !== null) {
            const sentence = match[0].trim();

            if (sentence) {
              addToTtsQueue(sentence);
            }
            // 길이 누적
            processedLength += match[0].length;
          }
          lastSentenceEnd += processedLength;
        }
      } catch (error) {
        console.error(`TEXT MESSAGE ERROR : `, error);
      }
    },
    [apiBaseURL, currentSystem, currentLang, addToTtsQueue]
  );

  // 녹음 시작 핸들러
  const handleStartRecording = async () => {
    if (isRecording) return;
    let chunks = [];
    try {
      setIsRecording(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      setGumStream(stream);

      const recorder = new MediaRecorder(stream, { audioBitsPerSecond: 16000 });
      recorder.addEventListener("dataavailable", (e) => {
        chunks.push(e.data);
      });

      recorder.addEventListener("stop", async () => {
        const audioBlob = new Blob(chunks, { type: "audio/ogg;codecs=opus" });
        const formData = new FormData();
        formData.append("file", audioBlob, "voice.ogg");

        try {
          // STT API 호출
          const res = await fetch(
            `${apiBaseURL}/stt?lang=${currentLang}&isPlay=0`,
            { method: "POST", body: formData }
          );

          if (!res.ok) {
            throw new Error(`STT ERROR: ${res.status}`);
          }

          const result = await res.json();
          let recognizedText = "";
          if (result.text && result.text.trim()) {
            recognizedText = result.text.trim();
          } else if (result.data && result.data.trim()) {
            recognizedText = result.data.trim();
          }

          if (recognizedText) {
            // 질문 상태 업데이트 후 LLM에 전송
            setQuestionList((prev) => [...prev, recognizedText]);
            setQuestionTimes((prev) => [...prev, Date.now()]);
            await sendMessage(recognizedText);
          } else {
            console.log("Not recognized");
          }
        } catch (error) {
          console.error("Voice recognition error:", error);
        }
        chunks = [];
      });

      mediaRecorderRef.current = recorder;
      recorder.start();
    } catch (error) {
      console.error("Recording start error:", error);
      setIsRecording(false);
    }
  };

  // 녹음 중지 핸들러
  const handleStopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (gumStream) {
      gumStream.getAudioTracks().forEach((track) => track.stop());
      setGumStream(null);
    }
  };

  return {
    // 상태
    isRecording,
    questionList,
    answerList,
    fullResponse,
    questionTimes,
    isPlayingTts,
    // 핸들러/액션
    handleStartRecording,
    handleStopRecording,
    sendMessage, // 외부에서 텍스트로도 메시지를 보낼 수 있도록 노출
    // 기타 유틸리티
    currentLang,
    initGreeting: "무엇을 도와드릴까요?",
  };
}
