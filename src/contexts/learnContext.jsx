/* eslint-disable react-hooks/exhaustive-deps */
import ResultDialog from "@/components/ResultDialog";
import { Toast } from "@/components/ui/Toast";
import {
  useCurriculumQuery,
  useContentQuery,
  useSessionQuery,
  useUpdateProgressMutation,
  usePostAttemptMutation,
  usePostStartSessionMutation,
} from "@/hooks/useHaniQuery";
import { METHODS, TARGETS } from "@/utils/haniUtil";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const CHARACTER = "691a6d43eb6b241816a865d1";
const LearnContext = createContext(null);

export const LearnProvider = ({ children }) => {
  const { character, chapter, method } = useParams();
  const navigate = useNavigate();

  const [openContentList, setOpenContentList] = useState(false);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 결과창 데이터를 담을 상태
  const [resultData, setResultData] = useState({
    successCount: 0,
    time: 0,
    feedbackMsg: "",
  });

  const processingRef = useRef(false);

  // 1. 데이터 조회
  const {
    curriculumData: rawCurriculumData,
    isCurriculumLoading,
    refetchCurriculum,
  } = useCurriculumQuery(CHARACTER);

  // status 업데이트
  const curriculumData = useMemo(() => {
    if (!rawCurriculumData) return null;
    return rawCurriculumData.map((ch) => ({
      ...ch,
      methods: ch.methods.map((m) => ({
        ...m,
        session: m.session?.status === "ended" ? null : m.session,
      })),
    }));
  }, [rawCurriculumData]);

  const { data: contentData } = useContentQuery(character, chapter, method);
  const { data: sessionData, refetch: refetchSession } = useSessionQuery({
    character,
    chapter,
    method,
    target: contentData?.target,
  });

  // 2. 뮤테이션
  const { mutateAsync: submitAttempt, isPending: isAttemptPending } =
    usePostAttemptMutation();
  const { mutateAsync: startSession } = usePostStartSessionMutation();
  const { mutate: updateProgress } = useUpdateProgressMutation();

  const activeSession = sessionData?.active ? sessionData.session : null;
  const sessionId = activeSession?._id;
  const currentItemIdx = activeSession?.currentItemIndex ?? 0;
  const contentFrom = contentData?.contents;
  const item = contentFrom?.[currentItemIdx];
  const repeatSettings = useMemo(
    () => ({
      correct: contentData?.repeat || 1,
      incorrect: Math.round((contentData?.repeat || 1) * 1.5) || 2,
    }),
    [contentData],
  );
  // 3. 라이프사이클: 세션 생성 로직 수정
  useEffect(() => {
    // 로딩 중이거나 이미 제출 중이면 절대 실행 금지
    if (
      isCurriculumLoading ||
      !curriculumData ||
      isSubmitting ||
      processingRef.current
    )
      return;

    const handleLifecycle = async () => {
      const currentChapterData = curriculumData.find(
        (c) => c.chapterId === chapter,
      );
      if (!currentChapterData) return;

      const currentMethodData = currentChapterData.methods?.find(
        (m) => m.name === method,
      );

      // sessionId가 이미 메모리에 존재한다면 서버 데이터가 잠시 비어도 무시합니다.
      const hasNoSessionOnServer = !currentMethodData?.session;
      const hasNoActiveData = sessionData && !sessionData.active; // 데이터가 명확히 '없음'을 응답했을 때만
      const alreadyHasSessionId = !!sessionId;

      // 이미 세션 ID가 있거나, 서버에서 데이터를 가져오는 중이면(sessionData가 없으면) 중단
      if (alreadyHasSessionId || !sessionData) return;

      if ((hasNoSessionOnServer || hasNoActiveData) && contentData) {
        processingRef.current = true;
        setIsSubmitting(true);
        try {
          await startSession({
            characterId: CHARACTER,
            chapterId: chapter,
            method,
            target: contentData.target || currentChapterData.target.name,
            repeatSettings,
            device: {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
            },
          });

          // 생성 직후 데이터 정합성을 위해 refetch
          await Promise.all([refetchSession(), refetchCurriculum()]);
        } catch (e) {
          console.error("강제 시작 실패:", e);
        } finally {
          setIsSubmitting(false);
          processingRef.current = false;
        }
      }
    };

    handleLifecycle();
  }, [curriculumData, sessionData, contentData, chapter, method, sessionId]);
  // sessionId를 의존성에 넣어 ID가 생기면 이펙트가 다시 체크하고 종료되게 함

  const learningList = useMemo(() => {
    if (!curriculumData) return [];
    return curriculumData.flatMap((ch) =>
      ch.methods.map((m) => ({
        ...m,
        chapterId: ch.chapterId,
        characterId: CHARACTER,
      })),
    );
  }, [curriculumData]);

  const getNextStep = useCallback(() => {
    if (!learningList.length || !contentData?.target) return null;
    let currentIndex = learningList.findIndex(
      (step) =>
        step.chapterId === chapter &&
        step.target === contentData.target &&
        step.method === method,
    );
    let nextIndex = currentIndex + 1;
    let nextListItem = learningList[nextIndex];
    if (!nextListItem) return null;
    return {
      title: "축하합니다!",
      description: [
        `${TARGETS[nextListItem.target]} ${METHODS[nextListItem.method]} 학습을 시작합니다.`,
      ],
      next: `/learn/${CHARACTER}/${nextListItem.chapterId}/${nextListItem.method}?target=${nextListItem.target}`,
    };
  }, [learningList, chapter, method, contentData]);

  const handleContentListToggle = useCallback(
    () => setOpenContentList((prev) => !prev),
    [],
  );
  const handleContentListClose = useCallback(
    () => setOpenContentList(false),
    [],
  );
  const handleContentSelect = useCallback(
    async (index) => {
      const targetItem = contentFrom?.[index];
      if (sessionId && targetItem) {
        updateProgress({ sessionId, item: targetItem, method });
        await refetchSession();
      }
      handleContentListClose();
    },
    [
      contentFrom,
      sessionId,
      method,
      updateProgress,
      refetchSession,
      handleContentListClose,
    ],
  );

  const getMethodData = useCallback(
    (targetChapter) => {
      if (!curriculumData) return null;
      return (
        curriculumData.find((item) => item.chapterId === targetChapter)
          ?.methods || null
      );
    },
    [curriculumData],
  );

  const handleSessionEnd = useCallback(
    async (response) => {
      const isEnded =
        response.session?.status === "ended" || response.status === "ended";

      if (isEnded) {
        setResultData({
          successCount: currentItemIdx + 1,
          time: Math.round(response.session?.totalTime) || 0,
          feedbackMsg: "모든 학습을 완료했습니다! 🎉",
        });
        setIsResultOpen(true);
      } else {
        await refetchSession();
      }
      setIsSubmitting(false);
    },
    [currentItemIdx, refetchSession],
  );

  const sendAnswer = useCallback(
    async (answer) => {
      if (!sessionId || isAttemptPending) return;
      setIsSubmitting(true);
      try {
        //concentration 데이터 구조
        const concentrationData = {
          level: answer?.concentration?.level ?? "low",
          focusRate: answer?.concentration?.focusRate ?? 0,
          faceDetected: answer?.concentration?.faceDetected ?? false,
          attentionScore: answer?.concentration?.attentionScore ?? 0,
        };

        const response = await submitAttempt({
          characterId: CHARACTER,
          chapterId: chapter,
          sessionId: sessionId,
          method: method,
          target: contentData?.target,
          isCorrect: answer?.isCorrect,
          solvingTimeSec: answer?.responseTime || 0,
          submittedAnswer: answer?.user,
          correctAnswer: answer?.correct,

          // 추가된 핵심 필드들
          currentLetter: answer?.correct, // correctAnswer와 동일하게 매핑
          currentItemIndex: currentItemIdx,
          currentQuestionNo: currentItemIdx + 1,
          currentLearningCount: (answer?.count || 0) + 1,
          totalItemsCount: contentFrom?.length,

          concentration: concentrationData,
        });

        const isCorrect = answer?.isCorrect;
        toast.custom(
          () => (
            <Toast
              title={isCorrect ? "정답입니다" : "틀렸어요."}
              description={isCorrect ? "잘했어요!" : "다시 시도해 보세요!"}
              type={isCorrect ? "success" : "error"}
            />
          ),
          {
            position: "top-center",
            duration: 1500,
            onAutoClose: () => handleSessionEnd(response),
          },
        );
      } catch (error) {
        console.error("❌ postAttempt Error:", error);
        setIsSubmitting(false);
      }
    },
    [
      sessionId,
      isAttemptPending,
      chapter,
      method,
      contentData,
      currentItemIdx,
      contentFrom,
      submitAttempt,
      handleSessionEnd,
    ],
  );

  const value = useMemo(
    () => ({
      character: CHARACTER,
      chapter,
      method,
      target: contentData?.target,
      openContentList,
      handleContentListToggle,
      handleContentListClose,
      handleContentSelect,
      curriculumData,
      repeatSettings,
      item,
      contentData,
      sessionId,
      currentItemIdx,
      isCurriculumLoading,
      isSessionLoading: false,
      isSubmitting,
      getMethodData,
      getNextStep,
      sendAnswer,
    }),
    [
      chapter,
      method,
      openContentList,
      curriculumData,
      item,
      contentData,
      sessionId,
      currentItemIdx,
      isCurriculumLoading,
      isSubmitting,
      repeatSettings,
      getMethodData,
      getNextStep,
      sendAnswer,
    ],
  );

  return (
    <LearnContext.Provider value={value}>
      {children}
      {isResultOpen && (
        <ResultDialog
          isOpen={isResultOpen}
          onClose={() => setIsResultOpen(false)}
          feedbackMsg={resultData.feedbackMsg}
          successCount={resultData.successCount}
          time={resultData.time}
          confirmText="메인화면으로 돌아가기"
          onConfirm={() => {
            setIsResultOpen(false);
            navigate(`/learn/${CHARACTER}`);
          }}
        />
      )}
    </LearnContext.Provider>
  );
};

export const useLearnContext = () => {
  const ctx = useContext(LearnContext);
  if (!ctx)
    throw new Error("useLearnContext must be used within a LearnProvider");
  return ctx;
};
