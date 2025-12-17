import { useRef, useCallback, useEffect } from "react";
import MicToggleButton from "./magicui/listening-indicator";
import usePromptVoiceChat from "@/hooks/usePromptVoiceChat";

export default function Prompt({ text = "text-6xl", micText = "text-7xl" }) {
  const scrollRef = useRef(null);

  const enableTTS = true;
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
  } = usePromptVoiceChat({ enableTTS });

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
                    __html: parseMarkdown(answerList[idx] || fullResponse),
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center mt-4">
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
