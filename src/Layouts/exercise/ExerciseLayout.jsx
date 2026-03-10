import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import Dialog from "@/components/Dialog";
import { fireInfoConfetti } from "@/components/magicui/connfetti";
import { useExerciseEngine } from "@/hooks/useExerciseEngine";
import ScoreBoard from "@/components/ui/ScoreBoard";
import ResultDialog from "@/components/ResultDialog";
import { useTracker } from "@/hooks/useTracker";

export default function ExerciseLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const { recordTouch, recordScore, save, resetIdleTimer } = useTracker();
  // 1. 현재 경로에서 마지막 단어 추출
  const pathParts = pathname.split("/").filter(Boolean);
  const currentPath = pathParts[pathParts.length - 1];

  // 2. 메뉴 여부 판단 (경로가 정확히 /exercise 일 때)
  const isMenu = pathname === "/exercise";
  const modeKey = isMenu ? null : currentPath.toUpperCase();

  // 3. 엔진 인스턴스 (메뉴일 때는 엔진 모드를 null로 보내서 카메라 중단)
  const { state, videoRef, canvasRef, actions } = useExerciseEngine(modeKey);

  useEffect(() => {
    if (state.isFinish) {
      fireInfoConfetti();
      const successCount = state.totalScores.filter((s) => s.isPass).length;
      recordScore(
        state.totalScores.length,
        successCount,
        Number(state.finalTime),
      );
    }
  }, [state.isFinish]);

  const handleGlobalTouch = () => {
    if (!isMenu) recordTouch();
  };

  useEffect(() => {
    // 1. 사람이 카메라에 포착되어 있거나
    // 2. 점수가 올라갔을 때 (움직임 성공)
    if (state.isPoseVisible || state.totalScores.length > 0) {
      resetIdleTimer();
    }
  }, [state.isPoseVisible, state.totalScores.length, resetIdleTimer]);

  // [변경] 카운트다운 중에도 활동으로 간주하여 리셋
  useEffect(() => {
    if (state.countdown !== null) {
      resetIdleTimer();
    }
  }, [state.countdown, resetIdleTimer]);
  return (
    <div
      onClick={handleGlobalTouch}
      className="flex flex-col h-full p-2 bg-white overflow-hidden relative font-extrabold text-slate-900"
    >
      {/* 카운트다운 Overlay */}
      {state.countdown !== null && (
        <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center">
          <span className="text-[25rem] font-black text-white animate-in zoom-in duration-300">
            {state.countdown}
          </span>
        </div>
      )}
      {/* 메인 영역 */}
      <main className="flex flex-grow overflow-hidden relative gap-4 p-2">
        <Outlet context={{ state, actions }} />

        {/* 오른쪽: 엔진 상태 모니터링 (메뉴가 아닐 때만 노출) */}
        {!isMenu && (
          <aside className="flex w-2/5 flex-col gap-2 animate-in slide-in-from-right duration-500">
            {/* 점수판 */}
            <ScoreBoard total={20} scores={state.totalScores} />
            {/* 실시간 AI 카메라 */}
            <div
              className={`flex-1 relative rounded-2xl overflow-hidden group border-4 ${state.isPoseVisible ? "border-green-500" : "border-red-500"}`}
            >
              <video ref={videoRef} autoPlay playsInline className="hidden" />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          </aside>
        )}
      </main>

      {/* 에러 및 결과 다이얼로그 (생략 없이 유지) */}
      <Dialog
        isOpen={state.cameraError}
        onClose={() => {}}
        title="카메라 인식 실패"
      >
        <div className="flex flex-col items-center gap-8 p-10 text-center">
          <AlertCircle className="size-32 text-red-500 bg-red-50 rounded-full p-4" />
          <p className="text-4xl font-black text-gray-800">
            카메라를 찾을 수 없어요!
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full py-6 bg-[#2D3A5A] text-white text-4xl rounded-3xl shadow-xl"
          >
            처음으로
          </button>
        </div>
      </Dialog>
      {state.isFinish && (
        <ResultDialog
          isOpen={state.isFinish}
          onClose={() => actions.setIsFinish(false)}
          feedbackMsg={
            state.totalScores.filter((s) => s.isPass).length >= 15
              ? "완벽해요!"
              : "참 잘하셨어요!"
          }
          successCount={state.totalScores.filter((s) => s.isPass).length}
          time={state.finalTime}
          secondaryBtnText="다시하기"
          onSecondaryClick={() => actions.runCountdown()}
          confirmText="활동 선택"
          onConfirm={async () => {
            await save();
            actions.setIsFinish(false);
            navigate("/exercise");
          }}
        />
      )}
    </div>
  );
}
