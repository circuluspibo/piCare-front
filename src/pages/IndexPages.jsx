import Prompt from "@/components/Prompt";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PersonaSelector,
  PersonaThumbnail,
  PersonaToggle,
} from "@/components/ui/persona";
import { useState, useMemo } from "react";
import { PERSONAS } from "@/assets/data/personaData";
import { buttonLabels } from "@/assets/data/buttonLabels";

export default function Main() {
  const [selectedGender, setSelectedGender] = useState("male");
  const [selectedPersona, setSelectedPersona] = useState(PERSONAS[0]);

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
    setSelectedGender(gender);

    const newFiltered = PERSONAS.filter((p) => p.gender === gender);
    setSelectedPersona(newFiltered[0]);
  };

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
            <PersonaToggle
              selectedGender={selectedGender}
              onToggle={(v) => handleToggleEvent(v)}
            />

            <div className="grid grid-cols-1 gap-3 overflow-hidden mt-4 mb-2">
              {filteredPersonas.map((p) => (
                <PersonaThumbnail
                  key={p.id}
                  icon={p.icon}
                  gender={p.gender}
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
        <div className="w-1/4 flex flex-col h-full p-2 gap-2 bg-gray-300 rounded-r-xl">
          {buttonLabels.map((v, i) => (
            <Button
              key={i}
              onClick={() => handleClickEvent(v.value)}
              size="sm"
              className={cn(buttonStyle, `bg-${v.color}-900`)}
            >
              <p className="whitespace-normal text-center text-5xl ">
                {v.label}
              </p>
            </Button>
          ))}
        </div>
      </div>
    </>
  );
}
