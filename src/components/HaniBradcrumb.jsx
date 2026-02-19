import { useLearnContext } from "@/contexts/learnContext";
import { COLORS, METHODS } from "@/utils/haniUtil";
import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import colors from "tailwindcss/colors";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "./ui/breadcrum";
import SimpleStepper from "./ui/stepper";
import { AnimatedCircularProgressBar } from "./magicui/animated-circular-progress-bar";

const TARGETS = {
  vowel: "모음",
  consonant: "자음",
  letter: "글자",
  word: "낱말",
};
export default function HaniBreadcrumb() {
  const {
    character,
    chapter,
    method,
    item,
    handleContentListToggle,
    currentQuestion,
    repeatSettings,
    contentData,
    currentItemIdx,
  } = useLearnContext();
  const target = contentData?.target;
  return (
    <div className="flex w-full justify-between items-center">
      <div className="inline-flex items-center">
        <Link
          className="p-1 mr-1 w-12 h-12 bg-transparent rounded-full opacity-65"
          to={`/learn/${character}/${chapter}?target=${target}`}
        >
          <ChevronLeft className="w-10 h-10" />
        </Link>
        <Breadcrumb>
          <BreadcrumbList className="font-bold text-[2.5rem]">
            <BreadcrumbItem>
              <BreadcrumbLink
                asChild
                className={`font-extrabold text-${target} text-${target}-700`}
              >
                <Link to={`/learn/${character}`}>{TARGETS[target]}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                asChild
                className={`font-extrabold text-${method}-500`}
              >
                <Link to={`/learn/${character}/${chapter}?target=${target}`}>
                  {METHODS[method]}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {item && (
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="font-extrabold text-black">
                  <div>
                    <button
                      className="px-1 py-0 font-extrabold bg-transparent btn"
                      onClick={handleContentListToggle}
                    >
                      "{item.letter}"
                    </button>
                    학습
                  </div>
                </BreadcrumbLink>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex gap-8 items-center">
        <div className="flex gap-2 items-center">
          <span className="text-sm font-bold">반복</span>
          <SimpleStepper
            currentStep={currentQuestion}
            totalSteps={repeatSettings.correct}
            activeColor={`bg-${COLORS[method]}-500`}
            style={{ minWidth: `${repeatSettings.correct * 2.5}rem` }}
          />
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-sm font-bold">진행</span>
          <AnimatedCircularProgressBar
            className="w-12 h-12"
            max={contentData?.contents?.length || 0}
            min={1}
            value={currentItemIdx + 1}
            gaugePrimaryColor={
              COLORS[method] ? colors[COLORS[method]][500] : "#f59e42"
            }
            gaugeSecondaryColor={colors.gray["200"]}
          />
        </div>
      </div>
    </div>
  );
}
