/* eslint-disable no-unused-vars */
import * as React from "react";
import { Mic } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useState } from "react";

// Soundwave 아이콘: iconSize를 인자로 받음
const SoundWaveIcon = ({ iconSize }) => (
  <div className="relative flex items-center justify-center mr-2">
    <div className="absolute inset-0 rounded-full bg-white/50 animate-ping duration-1000"></div>
    <motion.div
      initial={{ scale: 1 }}
      animate={{ scale: 1.05 }}
      transition={{
        duration: 0.5,
        repeat: Infinity,
        repeatType: "reverse",
      }}
    >
      {/* Lucide 아이콘의 size 속성 혹은 className에 외부 사이즈 적용 */}
      <Mic className={cn("text-black relative z-10", iconSize)} />
    </motion.div>
  </div>
);

// iconSize props 추가 (기본값 설정 가능)
function MicToggleButton({
  onStart,
  onStop,
  micText,
  className,
  iconSize = "size-16",
}) {
  const [isListening, setIsListening] = useState(false);

  const handleButtonClick = () => {
    if (!isListening) {
      setIsListening(true);
      onStart();
    } else {
      setIsListening(false);
      onStop();
    }
  };

  const buttonClass = cn(
    "flex items-center justify-center w-full rounded-xl p-1 transition-colors duration-300",
    {
      "bg-yellow-700 border-b-[8px] border-yellow-900 text-black": isListening,
      "bg-indigo-700 border-b-[8px] border-indigo-900 text-white": !isListening,
    },
    className
  );

  return (
    <motion.button
      className={buttonClass}
      onClick={handleButtonClick}
      whileTap={{ scale: 0.98 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isListening ? (
          <motion.div
            key="listening"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={cn("flex items-center justify-center", micText)}
          >
            {/* 종료 상태일 때 아이콘 크기 적용 */}
            <SoundWaveIcon iconSize={iconSize} />
            <p className="text-center font-black">종료</p>
          </motion.div>
        ) : (
          <motion.div
            key="mic"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={cn("flex items-center justify-center", micText)}
          >
            {/* 대기 상태일 때 아이콘 크기 적용 */}
            <Mic className={cn("mr-1", iconSize)} />
            <p className="text-center font-black">말하기</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export default MicToggleButton;
