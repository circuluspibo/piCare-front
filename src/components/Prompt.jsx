import { useRef, useState, useEffect, useCallback, useContext } from "react";
import MicToggleButton from "./magicui/listening-indicator";
import LANGUAGE_SYSTEMS from "@/utils/LanguageSystem";
import {
  playTtsSentence,
  startMotion,
  stopMotion,
  fetchStt,
  fetchChatStream,
} from "../api";
import { GlobalContext } from "@/contexts/GlobalContext";

export default function Prompt({ text = "text-6xl", micText = "text-7xl" }) {
  // 참조 관리
  const mediaRecorderRef = useRef(null);
  const scrollRef = useRef(null);

  // 상태 관리
  const [isRecording, setIsRecording] = useState(false);
  const [gumStream, setGumStream] = useState(null);
  const [questionList, setQuestionList] = useState([]);
  const [answerList, setAnswerList] = useState([]);
  const [isPlayingTts, setIsPlayingTts] = useState(false);
  const [ttsQueue, setTtsQueue] = useState([]);
  const [fullResponse, setFullResponse] = useState("");
  const [questionTimes, setQuestionTimes] = useState([]);

  // 유틸리티
  const { currentLang, personaVoice } = useContext(GlobalContext);
  const initGreeting = "무엇을 도와드릴까요?";
  const currentSystem = LANGUAGE_SYSTEMS[currentLang];

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString(currentLang, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };
  const parseMarkdown = useCallback((text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br>");
  }, []);
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // TTS 재생 및 큐 로직
  const playTts = useCallback(
    (text) => playTtsSentence(text, currentLang, personaVoice),
    [currentLang, personaVoice]
  );

  // TTS API 호출 및 모션 제어 (API 호출 부분이 startMotion, stopMotion으로 대체됨)
  const processTtsQueue = useCallback(async () => {
    if (ttsQueue.length === 0 || isPlayingTts) return;

    setIsPlayingTts(true);
    const queueSnapshot = [...ttsQueue];
    setTtsQueue([]);

    startMotion().catch((e) => console.error("Motion API Error:", e));

    for (const text of queueSnapshot) {
      await playTts(text);
    }

    // 재생 완료 후 Stop API 호출 및 상태 해제 (모듈 함수 사용)
    stopMotion().catch((e) => console.error("Stop API Error:", e));
    setIsPlayingTts(false);
  }, [ttsQueue, isPlayingTts, playTts]);

  // processTtsQueue 함수 호출
  useEffect(() => {
    processTtsQueue();

    return () => {};
  }, [ttsQueue, processTtsQueue]);

  const addToTtsQueue = useCallback((text) => {
    setTtsQueue((prev) => [...prev, text]);
  }, []);

  // NOTE: 녹음 및 정지 핸들러
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

        try {
          // STT API 호출 (모듈 함수 사용)
          const recognizedText = await fetchStt(audioBlob, currentLang);

          if (recognizedText) {
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

  const sendMessage = async (message) => {
    if (!message) return;
    setFullResponse("");
    let accumulatedResponse = "";
    let lastSentenceEnd = 0;

    setIsPlayingTts(false);
    setTtsQueue([]); // 새로운 메시지 시작 시 기존 TTS 큐 초기화

    try {
      const sentenceRegex = /([^.!?\n]*[.!?\n]\s*)/g;

      // Chat Stream API 호출 (모듈 함수 사용)
      await fetchChatStream(message, currentSystem, currentLang, (chunk) => {
        accumulatedResponse += chunk;
        setFullResponse(accumulatedResponse);
        scrollToBottom();

        // 청크를 문장 단위로 분리하여 TTS 큐에 추가
        let processedLength = 0;
        const segmentToAnalyze = accumulatedResponse.slice(lastSentenceEnd);
        let match;
        sentenceRegex.lastIndex = 0;

        while ((match = sentenceRegex.exec(segmentToAnalyze)) !== null) {
          const sentence = match[0].trim();

          if (sentence) {
            addToTtsQueue(sentence);
          }
          processedLength += match[0].length;
        }
        lastSentenceEnd += processedLength;
      });

      const remainingText = accumulatedResponse.slice(lastSentenceEnd).trim();
      if (remainingText) {
        addToTtsQueue(remainingText);
      }
      setAnswerList((prev) => [...prev, accumulatedResponse]);
    } catch (error) {
      console.error(`TEXT MESSAGE ERROR : `, error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div
        ref={scrollRef}
        className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50 rounded-lg shadow-inner"
      >
        {questionList.length === 0 && (
          <div className="flex justify-center items-center h-full">
            <p className={`${text} text-gray-600 font-semibold`}>
              {initGreeting}
            </p>
          </div>
        )}

        {questionList.length > 0 &&
          questionList.map((q, idx) => (
            <div key={idx} className="w-full">
              {/* 질문 영역 - 오른쪽 정렬 */}
              <div className="flex flex-col items-end">
                <div className="bg-blue-500 text-white p-3 rounded-xl rounded-tr-none max-w-xs md:max-w-md shadow">
                  <p dangerouslySetInnerHTML={{ __html: parseMarkdown(q) }} />
                </div>

                {questionTimes[idx] && (
                  <span className="text-xs text-gray-500 mt-1 mr-1">
                    {formatTime(questionTimes[idx])}
                  </span>
                )}
              </div>

              {/* 답변영역 - 왼쪽 정렬 */}
              <div className="flex justify-start items-end mt-2 gap-2">
                <div className="bg-white text-gray-800 p-3 rounded-xl rounded-tl-none max-w-xs md:max-w-md shadow border border-gray-200">
                  {answerList[idx] ? (
                    <p
                      dangerouslySetInnerHTML={{
                        __html: parseMarkdown(answerList[idx]),
                      }}
                    />
                  ) : idx === questionList.length - 1 && fullResponse ? (
                    <p
                      dangerouslySetInnerHTML={{
                        __html: parseMarkdown(fullResponse),
                      }}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          ))}
      </div>

      <div className="flex justify-center items-center mt-4">
        <MicToggleButton
          onStart={handleStartRecording}
          onStop={handleStopRecording}
          micText={micText}
          isListening={isRecording}
        />
      </div>
    </div>
  );
}
