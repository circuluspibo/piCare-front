import { useMemo } from "react";

const Letters = ({ letter, n, className, noBorder }) => {
  const textSize = useMemo(() => {
    switch (n) {
      case 3: {
        return "text-9xl";
      }
      case 4: {
        return "text-8xl";
      }
      case 5: {
        return "text-7xl";
      }
      case 6: {
        return "text-5xl";
      }
      default: {
        return "text-len1";
      }
    }
  }, [n]);

  return (
    <div
      className={`font-extrabold text-center rounded-lg nanum-gothic-extrabold ${
        !noBorder && "border-2 border-letter"
      } ${className} ${textSize}`}
    >
      {letter}
    </div>
  );
};

export default Letters;
