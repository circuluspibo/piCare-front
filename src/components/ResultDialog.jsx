import React, { useEffect, useRef } from "react";
import Dialog from "@/components/Dialog";
import { cn } from "@/lib/utils";

export default function ResultDialog({
  isOpen,
  onClose,
  title = "활동 결과",
  feedbackMsg = "",
  successCount = 0,
  time = 0,
  confirmText = "확인",
  onConfirm,
  // 버튼이 2개인 특수 케이스를 위한 props
  secondaryBtnText,
  onSecondaryClick,
}) {
  const audioRef = useRef(null);

  useEffect(() => {
    const audioPath = "/sound/complete.mp3";
    if (audioPath) {
      audioRef.current = new Audio(audioPath);
      audioRef.current.play().catch((err) => {
        console.log("[FAILED] playing complete mp3", err);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, [isOpen]);
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title}>
      <div className="text-center flex flex-col items-center gap-6">
        {/* 피드백 메시지 */}
        <h2 className="text-5xl font-black text-slate-900 leading-tight break-keep">
          {feedbackMsg}
        </h2>

        {/* 결과 데이터 영역 */}
        <div className="flex w-full justify-center items-center gap-6">
          <div
            className={cn(
              "flex-1 p-6 rounded-3xl text-center",
              "bg-emerald-50 border-2 border-emerald-100",
            )}
          >
            <p className={cn("text-2xl font-bold mb-1", "text-emerald-600")}>
              성공횟수
            </p>
            <p
              className={cn(
                "text-6xl md:text-7xl font-black",
                "text-emerald-700",
              )}
            >
              {successCount}
              <span className="text-3xl ml-1">회</span>
            </p>
          </div>
          <div
            className={cn(
              "flex-1 p-6 rounded-3xl text-center",
              "bg-blue-50 border-2 border-blue-100",
            )}
          >
            <p className={cn("text-2xl font-bold mb-1", "text-blue-600")}>
              소요 시간
            </p>
            <p className={cn("text-6xl md:text-7xl font-black text-blue-600")}>
              {time}
              <span className={cn("text-3xl", "ml-1")}>초</span>
            </p>
          </div>
        </div>

        {/* 버튼 영역: 2개일 때와 1개일 때 분기 */}
        <div
          className={cn(
            "w-full grid gap-4",
            secondaryBtnText ? "grid-cols-2" : "grid-cols-1",
          )}
        >
          {secondaryBtnText && (
            <button
              onClick={onSecondaryClick}
              className="py-6 bg-slate-100 text-3xl font-black rounded-3xl hover:bg-slate-200 transition-all"
            >
              {secondaryBtnText}
            </button>
          )}
          <button
            onClick={onConfirm || onClose}
            className={cn(
              "py-6 text-white text-3xl font-black rounded-3xl shadow-xl transition-all active:scale-95",
              "bg-slate-900 hover:bg-black",
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
