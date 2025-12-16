import Prompt from "@/components/Prompt";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PersonaContainer, PersonaThumbnail } from "@/components/ui/persona";
import { useContext, useEffect, useState } from "react";
import { PERSONAS } from "@/assets/data/personaData";
import { buttonLabels } from "@/assets/data/buttonLabels";
import { IconRenderer } from "@/components/ui/IconRenderer";
import { useNavigate } from "react-router-dom";
import { GlobalContext } from "@/contexts/GlobalContext";

export default function Main() {
  const {updatePersona} = useContext(GlobalContext);
  const navigation = useNavigate();
  // TODO: 선택된 Persona에 따른 Voice 값 받아함.
  const [selectedPersona, setSelectedPersona] = useState(PERSONAS[0]);
  // 버튼 이벤트 헨들러
  const handleClickEvent = (value) => {
    switch (value) {
      case "language": {
        const url = import.meta.env.VITE_HANI_URL;
        return (window.location.href = url);
      }
      case "excercise": {
        return navigation("/exercise");
      }
      case "draw": {
        return navigation("/draw");
      }
      default: {
        return;
      }
    }
  };

  useEffect(() => {
    const personaId = selectedPersona.id;
    switch (personaId) {
      case "grandpa":
        return updatePersona(42, personaId); //91
      case "grandma":
        return updatePersona(65, personaId); //57, 88
      case "man":
        return updatePersona(48, personaId); 
      case "woman":
        return updatePersona(49, personaId); //26
      case "boy":
        return updatePersona(25, personaId); //17, 18
      case "girl":
        return updatePersona(22, personaId); //5, 22, 76, 45
    }
  }, [selectedPersona, updatePersona]);
  return (
    <>
      <div className="flex w-full h-full mx-auto bg-gray-100 p-2 rounded-xl shadow-lg overflow-hidden">
        {/** SECTION:페르소나 (10%) */}
        <div
          className={`w-1/10 flex flex-col items-center justify-start rounded-l-xl`}
        >
          <PersonaContainer>
            <div className="grid grid-cols-1 gap-1 overflow-hidden p-1 h-full">
              {PERSONAS.map((p) => (
                <PersonaThumbnail
                  key={p.id}
                  icon={p.icon}
                  gender={p.gender}
                  isSelected={selectedPersona.id === p.id}
                  onClick={() => setSelectedPersona(p)}
                />
              ))}
            </div>
          </PersonaContainer>
        </div>

        {/** SECTION: 프롬프트/챗봇 (65%) */}
        <div className="w-8/12 bg-white p-3 border-x border-gray-300 shadow-inner">
          <div className="text-xl text-gray-600 h-full">
            <Prompt />
          </div>
        </div>

        {/** SECTION: 버튼 영역 (25%) */}
        <div className="w-1/4 flex flex-col h-full p-2 gap-2 bg-gray-300 rounded-r-2xl">
          {buttonLabels.map((v, i) => (
            <Button
              key={i}
              onClick={() => handleClickEvent(v.value)}
              size="sm"
              className={cn(
                "flex flex-1 flex-col justify-center text-xl font-bold rounded-2xl text-center shadow-lg ",
                `bg-${v.color}-200 text-${v.color}-800`
              )}
            >
              <div className="flex flex row items-center gap-2">
                {/** FIXME: size 프롭스가 여기서만 왜 안 먹히는지 모르겠음. */}
                <IconRenderer icon={v.icon} style={{ width: 80, height: 80 }} />
                <p className="whitespace-normal text-center  text-6xl">
                  {v.label}
                </p>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </>
  );
}
