/* eslint-disable no-unused-vars */
import * as React from "react";
import { Mic, StopCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useState } from "react";

// Soundwave
const SoundWaveIcon = () => (
  <div className="relative flex items-center justify-center">
    {/* 파동 링: animate-ping으로 확장하며 사라지는 효과 */}
    <div className="absolute inset-0 rounded-full bg-white/50 animate-ping duration-1000"></div>
    {/* 중앙 마이크 아이콘 (motion으로 미세 진동) */}
    <motion.div
      initial={{ scale: 1 }}
      animate={{ scale: 1.05 }}
      transition={{
        duration: 0.5,
        repeat: Infinity,
        repeatType: "reverse",
      }}
    >
      <Mic className="w-20 h-20 text-white relative z-10" />
    </motion.div>
  </div>
);

// Toggle
function MicToggleButton({ onStart, onStop }) {
  const [isListening, setIsListening] = useState(false);

  const handleButtonClick = () => {
    if (!isListening) {
      setIsListening(true);
      onStart(); // '말하기' 이벤트 시작
    } else {
      setIsListening(false);
      onStop(); // '듣기 종료' 이벤트
    }
  };

  // 상태에 따른 버튼 클래스 결정 (배경색 전환)
  const buttonClass = cn(
    "flex items-center justify-center w-full rounded-xl px-2 py-2 shadow-lg transition-colors duration-300",
    {
      "bg-red-600 hover:bg-red-700": isListening,
      "bg-blue-600 hover:bg-blue-700": !isListening,
    }
  );

  return (
    <motion.button
      className={buttonClass}
      onClick={handleButtonClick}
      whileTap={{ scale: 0.98 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isListening ? (
          // SECTION: 듣기종료
          <motion.div
            key="listening"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="flex items-center text-white"
          >
            <SoundWaveIcon />
            <p className="text-center font-medium text-7xl">듣기 종료</p>
          </motion.div>
        ) : (
          // SECTION: 말하기
          <motion.div
            key="mic"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="flex items-center text-white"
          >
            <Mic className="w-20 h-20" />
            <p className="text-center font-medium text-7xl">말하기</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export default MicToggleButton;
