// Dialog.jsx

import React from "react";

/**
 * 이식성 높은 범용 Dialog 컴포넌트
 *
 * @param {boolean} isOpen - Dialog를 표시할지 여부
 * @param {function} onClose - Dialog를 닫을 때 호출되는 함수 (필수)
 * @param {string} title - Dialog의 제목
 * @param {React.ReactNode} children - Dialog 본문에 들어갈 내용
 * @param {Array<{text: string, onClick: function, style?: string}>} actions - Dialog 하단의 버튼 배열
 * @param {string} titleStyle - 제목 텍스트에 적용할 Tailwind CSS 클래스 (선택 사항)
 */
export default function Dialog({
  isOpen,
  onClose,
  title,
  children,
  actions,
  titleStyle = "text-3xl font-bold mb-4",
}) {
  if (!isOpen) return null;

  // Dialog 외부를 클릭했을 때 닫히는 동작 방지 (필요시 추가)
  // const handleBackdropClick = (e) => {
  //   if (e.target === e.currentTarget) {
  //     onClose();
  //   }
  // };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      // onClick={handleBackdropClick}
    >
      <div className="bg-white p-8 rounded-lg shadow-2xl text-center max-w-md w-full animate-fadeInDown rounded-xl">
        {/* 제목 (Title) */}
        {title && <h3 className={titleStyle}>{title}</h3>}

        {/* 본문 내용 (Children) */}
        <div className="text-gray-700 text-left">{children}</div>

        {/* 액션 버튼 (Actions) */}

        <div className="flex justify-center space-x-4">
          {actions !== undefined &&
            actions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  action.onClick();
                  // 일반적으로 버튼 클릭 후 닫기
                  onClose();
                }}
                // 기본 스타일과 props로 받은 style을 병합
                className={`font-bold py-2 px-4 rounded transition duration-200 ${
                  action.style || "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {action.text}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
