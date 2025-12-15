// src/components/Prompt.jsx

import { useRef, useCallback, useEffect } from "react";
import MicToggleButton from "./magicui/listening-indicator";
import useVoiceChat from "@/hooks/useVoiceChat"; // 💡 모듈화된 훅 임포트

export default function Prompt({ text = "text-6xl", micText = "text-7xl" }) {
  // 스크롤 참조만 남김
  const scrollRef = useRef(null);

  // 💡 모듈화된 훅 사용: 모든 상태와 핵심 함수를 가져옵니다.
  const enableTTS = true
  const {
    isRecording,
    questionList,
    answerList,
    fullResponse,
    questionTimes,
    handleStartRecording,
    handleStopRecording,
    initGreeting,
    currentLang,
  } = useVoiceChat({enableTTS});

  // 헬퍼 함수: 시간 포맷팅
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString(currentLang, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // 헬퍼 함수: 마크다운 파싱
  const parseMarkdown = useCallback((text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br>");
  }, []);

  // 헬퍼 함수: 스크롤을 맨 아래로 이동
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [fullResponse, scrollToBottom]);


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
        {/* 💡 훅에서 가져온 핸들러를 사용 */}
        <MicToggleButton
          onStart={handleStartRecording}
          onStop={handleStopRecording}
          isListening={isRecording}
          micText={micText}
        />
      </div>
    </div>
  );
}