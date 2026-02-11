import React from "react";

/**
 * 간단한 Stepper 컴포넌트
 * @param {number} currentStep - 현재 step (1부터 시작, 1~N)
 * @param {number} totalSteps - 전체 step 개수
 * @param {string} activeColor - 활성화된 step의 tailwind 색상 클래스 (예: 'bg-amber-500')
 * @param {string} className - 최상위 div에 적용할 tailwind 클래스
 */
const SimpleStepper = ({
  currentStep = 1,
  totalSteps = 3,
  activeColor = "bg-slate-500",
  className = "",
  style = {},
}) => {
  return (
    <div className={`flex items-center ${className}`} style={style}>
      {Array.from({ length: totalSteps }).map((_, idx) => {
        const stepNum = idx + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        return (
          <React.Fragment key={idx}>
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all
                ${isCompleted || isCurrent ? `${activeColor}` : "bg-gray-200"}
              `}
            >
              <span
                className={`font-bold text-base
                ${isCompleted || isCurrent ? "text-white" : "text-black"}
              `}
              >
                {stepNum}
              </span>
            </div>
            {/* 마지막 step이 아니면 선 추가 */}
            {idx !== totalSteps - 1 && (
              <div
                className={`flex-1 h-1 ${
                  idx < currentStep - 1 ? `${activeColor}` : "bg-gray-200"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default SimpleStepper;
