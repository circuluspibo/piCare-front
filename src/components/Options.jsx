import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import colors from "tailwindcss/colors";

const Options = ({
  id,
  correctAnswer,
  options,
  onSelect,
  color,
  enabled,
  currentItemIndex,
}) => {
  const WRONG_STATE = "border-4 border-red-400 bg-red-50";
  const CORRECT_STATE = `bg-${color}-500 text-white`;
  const location = useLocation();

  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const isSenior = location.pathname.includes("/senior") || false;
  const handleClick = (choice) => {
    setSubmitted(true);
    setSelected(choice);
    onSelect(choice);
  };

  useEffect(() => {
    setSubmitted(false);
    setSelected(null);
  }, [options, currentItemIndex]);

  return (
    <div className="grid col-span-3 grid-rows-3 gap-4 h-full">
      {id &&
        options.length > 0 &&
        options.map((choice, idx) => (
          <button
            key={`${id}-${idx}`}
            onClick={() => handleClick(choice)}
            className={cn(
              `bg-${color}-50 border-neutral-300 flex justify-center items-center p-2 w-full font-extrabold leading-none text-center rounded-lg border shadow-sm cursor-pointer`,
              selected === choice
                ? choice === correctAnswer
                  ? CORRECT_STATE
                  : WRONG_STATE
                : "disabled:saturate-0",
              "text-5xl min-w-40",
            )}
            disabled={
              submitted || enabled === undefined ? selected !== null : !enabled
            }
          >
            {choice}
          </button>
        ))}
    </div>
  );
};

export default Options;
