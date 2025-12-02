import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// --- 1. PersonaSelector (전체 컨테이너) ---
const PersonaSelector = React.forwardRef(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        // 상위 컴포넌트(Main)에서 flex-col을 이미 적용했으므로 단순화
        className={cn(
          "flex flex-col items-center justify-start w-full h-full rounded-l-xl",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);
PersonaSelector.displayName = "PersonaSelector";

// 성별 선택 토글
const PersonaToggle = ({ selectedGender, onToggle }) => {
  const isMale = selectedGender === "male";

  return (
    <div className="flex w-full justify-center mt-2 ">
      <button
        onClick={() => onToggle("male")}
        className={cn(
          "px-4 py-2 text-xl font-bold transition-colors shadow-md",
          isMale
            ? "bg-blue-500 text-white rounded-l-lg"
            : "bg-gray-200 text-gray-700 rounded-l-lg hover:bg-gray-300"
        )}
      >
        남자
      </button>
      <button
        onClick={() => onToggle("female")}
        className={cn(
          "px-4 py-2 text-xl font-bold transition-colors shadow-md",
          !isMale
            ? "bg-pink-500 text-white rounded-r-lg"
            : "bg-gray-200 text-gray-700 rounded-r-lg hover:bg-gray-300"
        )}
      >
        여자
      </button>
    </div>
  );
};
PersonaToggle.displayName = "PersonaToggle";

// 이미지 썸네일
const thumbnailVariants = cva(
  "cursor-pointer transition-all duration-300 transform relative overflow-hidden",
  {
    variants: {
      isSelected: {
        true: "shadow-1xl scale-[1.05]", // 확대 비율을 줄여 잘림 방지
        false: "border-gray-300 hover:border-gray-400 scale-100",
      },
      // 성별에 따른 테두리 색상만 변경
      gender: {
        male: "border-blue-500 ring-blue-300",
        female: "border-pink-500 ring-pink-300",
      },
    },
    defaultVariants: {
      isSelected: false,
      gender: "male",
    },
    compoundVariants: [
      {
        isSelected: true,
        gender: "male",
        className: "ring-4", // 선택된 남성일 경우 파란색 링 추가
      },
      {
        isSelected: true,
        gender: "female",
        className: "ring-4", // 선택된 여성일 경우 핑크색 링 추가
      },
    ],
  }
);

const PersonaThumbnail = React.forwardRef(
  ({ src, alt, isSelected, gender, onClick, className, ...props }, ref) => {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex items-center justify-center w-full", // <- 크기 확대
          thumbnailVariants({ isSelected, gender, className })
        )}
        ref={ref}
        {...props}
      >
        <div className="w-full h-full p-2 flex items-center justify-center">
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      </button>
    );
  }
);
PersonaThumbnail.displayName = "PersonaThumbnail";

// --- 4. Export ---
export { PersonaSelector, PersonaThumbnail, PersonaToggle };
