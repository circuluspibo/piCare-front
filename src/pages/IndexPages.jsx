import Prompt from "@/components/Prompt";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
// PersonaSelector 외에 PersonaToggle 컴포넌트가 필요합니다.
import {
  PersonaSelector,
  PersonaThumbnail,
  PersonaToggle,
} from "@/components/ui/persona";
import { useState, useMemo } from "react"; // useMemo 추가
import { PERSONAS } from "@/assets/data/personaData";
import { buttonLabels } from "@/assets/data/buttonLabels";

export default function Main() {
  // 1. 성별 필터링 상태 추가: 기본값은 'male'
  const [selectedGender, setSelectedGender] = useState("male");
  const [selectedPersona, setSelectedPersona] = useState(PERSONAS[0]);

  // 성별에 따라 페르소나 리스트 필터링 (useMemo 사용)
  const filteredPersonas = useMemo(() => {
    return PERSONAS.filter((p) => p.gender === selectedGender);
  }, [selectedGender]);

  const usingHref = (url) => {
    window.location.href = url;
  };
  const handleClickEvent = (value) => {
    switch (value) {
      case "language": {
        const hrefURL = import.meta.env.VITE_HANI_URL;
        if (hrefURL) {
          usingHref(hrefURL);
        }
        return;
      }
      default: {
        return console.log("not yet");
      }
    }
  };
  const handleToggleEvent = (gender) => {
    // 1. 성별 변경
    setSelectedGender(gender);

    const newFiltered = PERSONAS.filter((p) => p.gender === gender);
    setSelectedPersona(newFiltered[0]);
  };
  // 3. 버튼 텍스트 가운데 정렬을 위한 스타일 조정
  const buttonStyle =
    "flex flex-1 flex-col justify-center text-xl font-medium rounded-xl text-center";
  return (
    <>
      <div className="flex w-full h-full mx-auto bg-gray-100 p-4 rounded-xl shadow-lg">
        {/** SECTION:페르소나 (20%) */}
        <div
          className={`w-1/5 flex flex-col items-center justify-start rounded-l-xl ${
            selectedGender === "male" ? "bg-blue-100" : "bg-pink-100"
          } `}
        >
          <PersonaSelector>
            {/* 4. 성별 토글 컴포넌트 배치 */}
            <PersonaToggle
              selectedGender={selectedGender}
              onToggle={(v) => handleToggleEvent(v)}
            />

            {/* 썸네일 그리드 영역: h-full 대신 명확한 max-height 지정 및 중앙 정렬 */}
            <div className="grid grid-cols-1 gap-3 overflow-y-hidden mt-4 mb-2">
              {filteredPersonas.map((p) => (
                <PersonaThumbnail
                  key={p.id}
                  src={p.src}
                  alt={p.id}
                  gender={p.gender}
                  // Thumbnail 컴포넌트 내에서 w-full h-full 및 rounded 제거 가정
                  isSelected={selectedPersona.id === p.id}
                  onClick={() => setSelectedPersona(p)}
                />
              ))}
            </div>
          </PersonaSelector>
        </div>

        {/** SECTION: 프롬프트/챗봇 (55%) */}
        <div className="w-7/12 bg-white p-6 border-x border-gray-300 shadow-inner">
          <div className="text-xl text-gray-600 h-full">
            <Prompt />
          </div>
        </div>

        {/** SECTION: 버튼 영역 (25%) */}
        <div className="w-1/4 flex flex-col h-full p-4 gap-2 bg-gray-300 rounded-r-xl">
          {buttonLabels.map((v, i) => (
            <Button
              key={i}
              onClick={() => handleClickEvent(v.value)}
              size="sm"
              className={cn(buttonStyle, `bg-${v.color}-500`)} 
            >
              <p className="whitespace-normal text-center text-4xl">{v.label}</p>
            </Button>
          ))}
        </div>
      </div>
    </>
  );
}
