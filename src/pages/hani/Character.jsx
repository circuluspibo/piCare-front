import { HANI_CHARACTERS } from "@/assets/data/haniCharacters";
import Dialog from "@/components/Dialog";
import { BlurFade } from "@/components/magicui/blurFade";
import { CHARACTER } from "@/contexts/learnContext";
import { Card } from "@radix-ui/themes";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function Character() {
  const navigate = useNavigate();
  const [selectedCard, setSelectedCard] = useState(null);
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    setOpen(false);
    navigate(`/learn/${CHARACTER}`);
  };
  const handleCancel = () => {
    setSelectedCard(null);
    setOpen(false);
  };
  const onCardClick = (item) => {
    setSelectedCard(item);
    setOpen(true);
  };
  return (
    <>
      <div className="flex flex-wrap items-center justify-center flex-auto gap-2 p-2 h-fit lg:gap-4 tl6:gap-4 tl6:p-4">
        {HANI_CHARACTERS.map((item, i) => (
          <BlurFade
            delay={0.25 * i}
            key={i}
            inView
            className="w-1/6 tp:w-1/4 border rounded-2xl"
          >
            <Card
              className={`flex flex-col flex-grow gap-2 justify-center items-center p-4 cursor-pointer md:p-6 tl6:p-8 bg-gradient-to-t from-sky-100 to-white shadow-2xl`}
              onClick={() => onCardClick(item)}
            >
              <div className="text-7xl">{item.icon}</div>
              <div className="text-3xl font-extrabold text-center md:text-4xl tl6:text-5xl">
                {item.name}
              </div>
            </Card>
          </BlurFade>
        ))}
      </div>
      <Dialog isOpen={open} onClose={() => {}} title="">
        <div className="flex flex-col items-center gap-8">
          <span className="text-3xl">
            {selectedCard?.icon} {selectedCard?.name}로 학습을 시작해볼까요?
          </span>
          <div className="w-full gap-6 flex justify-end">
            <button
              onClick={handleCancel}
              className="max-w-[180px] py-4 px-2 text-4xl rounded-2xl border"
            >
              X 취소
            </button>
            <button
              onClick={handleConfirm}
              className="max-w-[180px] py-4 px-2 bg-blue-800 text-white text-4xl rounded-2xl"
            >
              <span>O 확인</span>
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
