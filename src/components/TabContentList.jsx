/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef } from "react";

const TopContentList = ({
  open,
  color,
  data,
  currentIndex,
  onSelect,
  onClose,
}) => {
  const scrollContainerRef = useRef(null);
  const selectedButtonRef = useRef(null);
  const item = data?.[currentIndex];

  const getItemClasses = useCallback((letter) => {
    const len = letter?.length || 0;

    // 길이에 따른 클래스 (폰트 사이즈, 최소 너비)
    // 5자 이상일 때는 최소 너비를 더 크게 잡아 글자가 깨지지 않게 함
    const configs = {
      1: "text-2xl min-w-[70px]",
      2: "text-xl min-w-[90px]",
      3: "text-lg min-w-[110px]",
      4: "text-base min-w-[130px]",
      5: "text-sm min-w-[150px]",
    };

    return configs[len] || configs[5];
  }, []);

  const scrollByAmount = (direction = "left", amount = 150) => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = direction === "left" ? -amount : amount;
    scrollContainerRef.current.scrollBy({
      left: scrollAmount,
      behavior: "smooth",
    });
  };

  const variants = {
    hidden: () => ({
      opacity: 0,
      y: -100,
    }),
    visible: { opacity: 1, y: 0 },
  };

  useEffect(() => {
    if (open) {
      const node = document.getElementsByName(`content_${item.letter}`);
      const nodeitem = node[0];
      nodeitem.focus();
      nodeitem.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={variants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="absolute top-0 left-0 right-0 z-30 flex w-full h-24 gap-2 shadow-lg bg-white/50 backdrop-blur-2xl"
        >
          <div
            className="absolute top-0 bottom-0 left-0 flex h-full px-2 py-0 cursor-pointer bg-gradient-to-r from-white/95 to-transparent"
            onClick={() => scrollByAmount("left", 150)}
          >
            <ChevronLeft className={`text-${color}-500 m-auto`} />
          </div>
          {/* 메인 리스트 컨테이너 (Flex) */}
          <div
            className="flex-1 flex gap-3 px-14 py-4 overflow-x-auto no-scrollbar items-center scroll-smooth"
            ref={scrollContainerRef}
          >
            {data?.map((item, i) => {
              const isSelected = i === currentIndex;
              const responsiveClasses = getItemClasses(item.letter);
              const isComplete = item.complete;
              // 공통 베이스 스타일
              const baseStyle = `flex-shrink-0 h-14 rounded-xl font-black transition-all duration-200 flex items-center justify-center px-4 ${responsiveClasses}`;

              // 상태별 컬러 스타일
              const stateStyle = !isComplete
                ? isSelected
                  ? `bg-${color}-400 text-${color}-50 shadow-md scale-105 z-10`
                  : `bg-${color}-50 border border-${color}-400 text-${color}-400`
                : `bg-gray-50 border border-gray-300 text-gray-400 opacity-60`;

              return (
                <button
                  key={item.name || i}
                  name={`content_${item.letter}`}
                  ref={isSelected ? selectedButtonRef : null}
                  className={`${baseStyle} ${stateStyle}`}
                  disabled={isComplete}
                  onClick={() => !isComplete && onSelect(i)}
                >
                  <span className="truncate whitespace-nowrap">
                    {item.letter}
                  </span>
                </button>
              );
            })}
          </div>
          <div
            className="absolute top-0 bottom-0 right-0 flex h-full px-2 py-0 cursor-pointer bg-gradient-to-l from-white/95 to-transparent"
            onClick={() => scrollByAmount("right", 150)}
          >
            <ChevronRight className={`text-${color}-500 m-auto`} />
          </div>
          <div
            className={`absolute left-1/2 -translate-x-1/2 top-full py-2 px-6 bg-${color}-500 text-white rounded-b-xl cursor-pointer`}
            onClick={onClose}
          >
            <ChevronUp />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TopContentList;
