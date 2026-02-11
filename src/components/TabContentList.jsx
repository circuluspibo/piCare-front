/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";

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
          <div
            className="flex-1 min-w-0 flex gap-2 px-4 py-4 overflow-x-auto no-scrollbar items-center"
            ref={scrollContainerRef}
          >
            {data?.map((item, i) =>
              !item.complete ? (
                <button
                  name={`content_${item.letter}`}
                  key={item.name}
                  ref={i === currentIndex ? selectedButtonRef : null}
                  className={`flex-1 min-w-[3.5rem] rounded-2xlh-14 text-lg font-bold ${
                    i === currentIndex
                      ? `bg-${color}-400 text-${color}-50`
                      : `bg-${color}-50 border border-${color}-400 text-${color}-400`
                  }`}
                  onClick={() => onSelect(i)}
                >
                  {item.letter}
                </button>
              ) : (
                <button
                  name={`content_${item.letter}`}
                  key={item.name}
                  className="flex-1 min-w-[3.5rem]  text-lg font-bold text-gray-400 border border-gray-400"
                >
                  {item.letter}
                </button>
              ),
            )}
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
