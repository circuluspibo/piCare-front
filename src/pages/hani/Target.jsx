import Dialog from "@/components/Dialog";
import MenuCard from "@/components/MenuCard";
import { useLearnContext } from "@/contexts/learnContext";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function Target() {
  const navigate = useNavigate();
  const { character } = useParams();
  const [selected, setSelectedCard] = useState(null);
  const [open, setOpen] = useState(false);
  const { curriculumData, isCurriculumLoading, isCurriculumError } =
    useLearnContext();

  const targetData =
    curriculumData?.map((item) => ({
      ...item.target,
      status: item.status,
      chapterId: item.chapterId,
    })) || [];

  const onCardClick = (item) => {
    setSelectedCard(item);
    setOpen(true);
  };
  const handleConfirm = () => {
    setOpen(false);
    navigate(
      `/learn/${character}/${selected.chapterId}?target=${selected.name}`,
    );
    // TODO: learn으로 넘어가기
  };
  const handleCancel = () => {
    setOpen(false);
    setSelectedCard(null);
  };
  return (
    <>
      {!isCurriculumLoading && !isCurriculumError && (
        <div className="w-full h-full grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-3">
          {targetData &&
            targetData.map((item, i) => (
              <MenuCard
                key={`target-${i}`}
                total={targetData.length}
                index={i}
                item={item}
                className={`bg-${item.name}-50 rounded-2xl border-4 border-${item.name}-200`}
                textcolor={`text-${item.name}-700`}
                onCardClick={() => onCardClick(item)}
                selected={selected}
                disabled={item.status}
              />
            ))}
        </div>
      )}
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
