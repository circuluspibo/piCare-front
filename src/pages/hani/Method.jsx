import Dialog from "@/components/Dialog";
import MenuCard from "@/components/MenuCard";
import { useLearnContext } from "@/contexts/learnContext";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function Method() {
  const { getMethodData } = useLearnContext();
  const navigate = useNavigate();
  const { character, chapter } = useParams();
  const [open, setOpen] = useState(false);
  const methodData = useMemo(
    () => getMethodData(chapter),
    [chapter, getMethodData],
  );
  const [selected, setSelected] = useState(null);
  const onCardClick = (item) => {
    setSelected(item);
    setOpen(true);
  };

  // Dialog handler
  const handleConfirm = () => {
    setOpen(false);
    navigate(`/learn/${character}/${chapter}/${selected.name}`);
  };
  const handleCancel = () => {
    setOpen(false);
    setSelected(null);
  };
  return (
    <>
      <div className="w-full h-full grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-3">
        {methodData &&
          methodData.map((item, i) => (
            <MenuCard
              key={`method-${i}`}
              total={methodData.length}
              index={i}
              item={item}
              className={`bg-${item.name}-50 rounded-2xl border-4 border-${item.name}-200`}
              textcolor={`text-${item.name}-700`}
              onCardClick={() => onCardClick(item)}
              selected={selected}
              disabled={item?.session?.status === "ended" || false}
            />
          ))}
      </div>
      {open && (
        <Dialog isOpen={open} onClose={() => {}} title="">
          <div className="flex flex-col items-center gap-8">
            <span className="text-3xl">
              {selected?.title}로 학습을 시작해볼까요?
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
      )}
    </>
  );
}
