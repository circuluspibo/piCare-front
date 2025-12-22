import { useRef, useCallback, useEffect } from "react";
import MicToggleButton from "./magicui/listening-indicator";
import useVoiceChat from "@/hooks/useVoiceChat"; // 수정: 통합 훅 임포트
import Dialog from "./Dialog";

export default function Prompt({ text = "text-6xl", micText = "text-7xl" }) {
  const scrollRef = useRef(null);

  const enableTTS = true;
  // Hooks
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
  } = useVoiceChat({ enableTTS });

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

  // EventHandler
  const onStopClick = () => {
    handleStopRecording();
  };
  const isThinking =
    !isRecording &&
    questionList.length > 0 &&
    fullResponse === "" &&
    answerList.length < questionList.length;

  useEffect(() => {
    scrollToBottom();
  }, [fullResponse, questionList, scrollToBottom]); // questionList 추가하여 신규 질문 시에도 작동

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-grow overflow-y-auto p-4 space-y-4">
        {questionList.length === 0 && (
          <div className="flex justify-center items-center h-full">
            <p className={`${text} text-gray-600 font-semibold`}>
              {initGreeting}
            </p>
          </div>
        )}

        {questionList.map((q, idx) => (
          <div key={idx} className="w-full">
            <div className="flex flex-col items-end">
              <div className="bg-blue-500 text-white p-3 rounded-xl rounded-tr-none">
                <p dangerouslySetInnerHTML={{ __html: parseMarkdown(q) }} />
              </div>
              <span className="text-xs text-gray-500 mt-1">
                {formatTime(questionTimes[idx])}
              </span>
            </div>

            <div className="flex justify-start mt-2">
              <div className="bg-white p-3 rounded-xl rounded-tl-none border">
                <p
                  dangerouslySetInnerHTML={{
                    __html: parseMarkdown(
                      answerList[idx] ||
                        (idx === questionList.length - 1 ? fullResponse : "")
                    ),
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center mt-4">
        <MicToggleButton
          onStart={handleStartRecording} // 핸들러 명칭 일치
          onStop={onStopClick} // 핸들러 명칭 일치
          isListening={isRecording}
          micText={micText}
          iconSize="size-24"
        />
      </div>
      {/* 대화용 로딩 다이얼로그 */}
      <Dialog
        isOpen={isThinking}
        onClose={() => {}}
        title="AI 친구가 생각하고 있어요"
      >
        <div className="text-center p-10 flex flex-col items-center">
          <div className="flex space-x-2 mb-8">
            {/* 점이 통통 튀는 애니메이션 */}
            <div className="w-4 h-4 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-4 h-4 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-4 h-4 bg-blue-600 rounded-full animate-bounce"></div>
          </div>
          <p className="text-3xl font-black text-gray-700">
            대답을 준비하고 있어요...
          </p>
        </div>
      </Dialog>
    </div>
  );
}
