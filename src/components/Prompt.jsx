import MicToggleButton from "./magicui/listening-indicator";

export default function Prompt() {
  const greeting = "무엇을 도와드릴까요?";

  const handleClickEvent = (text) => {
    console.log("text = ", text);
  };
  return (
    <div className="flex flex-col justify-between h-full">
      {/* <-- flex flex-col justify-between h-full 추가 */}
      {/* 1. 인사말 텍스트 */}
      <p className="text-5xl w-full whitespace-normal text-center p-4">
        {greeting}
      </p>
      {/* 2. 말하기 버튼 영역 */}

      {/* <-- shadow-lg 추가 */}
      <MicToggleButton
        greeting={greeting}
        onStart={() => handleClickEvent("start")}
        onStop={() => handleClickEvent("end")}
      />
    </div>
  );
}
