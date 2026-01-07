import { useRef, useCallback, useEffect } from "react";
import MicToggleButton from "./magicui/listening-indicator";
import Dialog from "./Dialog";
import { useVoiceChat } from "@/contexts/VoiceChatContext";
import { cn } from "@/lib/utils";
import { ThreeDot } from "react-loading-indicators";

export default function Prompt({ text = "text-6xl", micText = "text-7xl" }) {
  const scrollRef = useRef(null);

  // Hooks
  const {
    isRecording,
    messages,
    fullResponse,
    handleStartRecording,
    handleStopRecording,
    initGreeting,
    currentLang,
  } = useVoiceChat();

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
    messages.length > 0 &&
    messages[messages.length - 1].role === "user" &&
    fullResponse === "";

  useEffect(() => {
    scrollToBottom();
  }, [fullResponse, messages, scrollToBottom]);

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* 1. 메시지 출력 영역 */}
      <div
        ref={scrollRef}
        className="flex-grow overflow-y-auto p-3 space-y-6 scroll-smooth"
      >
        {/* 대화 내역이 없을 때 표시될 초기 문구 */}
        {messages.length === 0 && !fullResponse && (
          <div className="flex justify-center items-center h-full">
            <p
              className={`${text} text-gray-400 font-bold text-center break-keep`}
            >
              {initGreeting}
            </p>
          </div>
        )}

        {/* 메시지 맵핑 */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "w-full flex flex-col",
              // ✅ 유저는 오른쪽(end), AI는 왼쪽(start) 정렬
              msg.role === "user" ? "items-end" : "items-start"
            )}
          >
            <div
              className={cn(
                "p-4 rounded-3xl max-w-[85%] shadow-md",
                // ✅ 역할에 따른 색상 및 말풍선 꼬리(모서리) 처리
                msg.role === "user"
                  ? "bg-blue-500 text-white rounded-tr-none" // 유저: 파랑
                  : "bg-white text-gray-800 border border-gray-100 rounded-tl-none" // AI: 흰색
              )}
            >
              <p
                dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }}
              />
            </div>
            {/* 시간 표시 */}
            <span className="text-xs text-gray-400 mt-2 px-1">
              {formatTime(msg.timestamp)}
            </span>
          </div>
        ))}

        {/* ✅ AI 실시간 스트리밍 답변 영역 (항상 좌측) */}
        {fullResponse && (
          <div className="w-full flex flex-col items-start animate-in fade-in duration-300">
            <div className="bg-white p-4 rounded-3xl rounded-tl-none border border-gray-100 shadow-md">
              <p
                dangerouslySetInnerHTML={{
                  __html: parseMarkdown(fullResponse),
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. 하단 컨트롤 영역 (마이크 버튼) */}
      <div className="flex justify-center p-3 bg-white/50 backdrop-blur-sm rounded-b-xl">
        <MicToggleButton
          onStart={handleStartRecording}
          onStop={handleStopRecording}
          isListening={isRecording}
          micText={micText}
          iconSize="size-24"
        />
      </div>

      {/* 3. 로딩/생각 중 다이얼로그 */}
      <Dialog isOpen={isThinking} onClose={() => {}} title="생각 중...">
        <div className="text-center px-10 py-5 flex flex-col items-center">
          <div className="flex space-x-2 mb-8">
                 <ThreeDot variant="bounce" color="#3174cc" size="large" text="" textColor=""/>
          </div>
          <p className="text-3xl font-black text-gray-700 break-keep">
            질문을 이해하고 있어요...
          </p>
        </div>
      </Dialog>
    </div>
  );
}
