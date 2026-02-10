import { postAttempt } from "@/api/haniService";
import {
  useCurriculumQuery,
  useContentQuery,
  useSessionQuery,
  useUpdateProgressMutation,
  usePostAttemptMutation,
} from "@/hooks/useHaniQuery";
import { METHODS, TARGETS } from "@/utils/haniUtil";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useSearchParams } from "react-router-dom";

export const CHARACTER = "691a6d43eb6b241816a865d1";
const LearnContext = createContext(null);

// NOTE: Provider
export const LearnProvider = ({ children }) => {
  const { character, chapter, method } = useParams();
  const [openContentList, setOpenContentList] = useState(false);

  // 데이터 쿼리
  const { curriculumData, isCurriculumLoading, isCurriculumError } =
    useCurriculumQuery(CHARACTER);
  const {
    data: contentData,
    isLoading: isDataLoading,
    isError,
    refetch: refetchData,
  } = useContentQuery(character, chapter, method);
  const { data: sessionData, isLoading: isSessionLoading } = useSessionQuery({
    character,
    chapter,
    method,
    target: contentData?.target,
  });

  // Mutation
  const { mutateAsync: submitAttempt, isPending: isAttemptPending } =
    usePostAttemptMutation();
  const { updateProgress, isUpdatePending } = useUpdateProgressMutation();

  // Const
  const activeSession = sessionData?.active ? sessionData.session : null;
  const sessionId = activeSession?._id;
  const currentItemIdx = activeSession?.currentItemIndex ?? 0;
  const currentQuestion = activeSession?.currentQuestionNo ?? 1;
  const currentLearningCnt = activeSession?.currentLearningCount ?? 0;

  const contentFrom = contentData?.contents;
  const item = contentFrom?.[currentItemIdx];

  const learningList = useMemo(() => {
    if (!curriculumData) return [];
    // 모든 챕터의 메서드들을 하나의 리스트로 합칩니다.
    return curriculumData.flatMap((ch) =>
      ch.methods.map((m) => ({
        ...m,
        chapterId: ch.chapterId,
        characterId: CHARACTER, // 현재 캐릭터
      })),
    );
  }, [curriculumData]);

  const getNextStep = useCallback(() => {
    if (!learningList.length || !contentData?.target) return null;

    // 1. 현재 진행 중인 단계의 인덱스 찾기
    let currentIndex = learningList.findIndex(
      (step) =>
        step.chapterId === chapter &&
        step.target === contentData.target &&
        step.method === method,
    );

    // 2. 다음 단계 찾기 (이미 완료된 세션은 건너뜀)
    let nextIndex = currentIndex + 1;
    let nextListItem = learningList[nextIndex];

    while (nextListItem && nextListItem.session?.status === "ended") {
      nextIndex += 1;
      nextListItem = learningList[nextIndex];
    }

    // 3. 반환 데이터 구성
    let next = `/learn/${character}`;
    let title = `축하합니다!`;
    let description = [
      `${TARGETS[contentData.target]} ${METHODS[method]} 학습을 완료했습니다!`,
    ];

    if (nextListItem) {
      next = `/learn/${nextListItem.characterId}/${nextListItem.chapterId}/${nextListItem.method}?target=${nextListItem.target}`;
      description.push(
        `다음으로 ${TARGETS[nextListItem.target]} ${METHODS[nextListItem.method]} 학습을 시작합니다.`,
      );
    } else {
      title = "축하합니다🎉🎉🎉";
      description.push(`모든 학습을 완료했습니다!`);
    }

    return { title, description, next };
  }, [learningList, chapter, method, contentData, character]);

  const repeatSettings = useMemo(
    () => ({
      correct: contentData?.repeat || 1,
      incorrect: Math.round((contentData?.repeat || 1) * 1.5) || 2,
    }),
    [contentData],
  );
  const curriculumIdx = contentData?.index || 0;

  // functions
  // 콘텐츠 리스트 핸들러
  const handleContentListToggle = useCallback(() => {
    setOpenContentList((prev) => !prev);
  }, []);

  const handleContentListClose = useCallback(() => {
    setOpenContentList(false);
  }, []);
  const handleContentSelect = useCallback(
    (index) => {
      const targetItem = contentFrom[index];
      if (sessionId && targetItem) {
        updateProgress({
          sessionId,
          item: targetItem,
          method,
        });
      }
      handleContentListClose();
    },
    [contentFrom, sessionId, method, updateProgress, handleContentListClose],
  );
  const getMethodData = useCallback(
    (targetChapter) => {
      if (!curriculumData) return null;

      const chapterData = curriculumData.find(
        (item) => item.chapterId === targetChapter,
      );
      return chapterData?.methods || null;
    },
    [curriculumData],
  );

  const sendAnswer = useCallback(
    async (answer) => {
      if (!sessionId || isAttemptPending) return;

      const payload = {
        characterId: character,
        chapterId: chapter,
        sessionId,
        method,
        target: contentData?.target,
        isCorrect: answer?.isCorrect,
        solvingTimeSec: answer?.responseTime || 0,
        submittedAnswer: answer?.user,
        correctAnswer: answer?.correct,
        currentLetter: answer?.correct,
        currentItemIndex: currentItemIdx,
        currentQuestionNo: currentQuestion,
        currentLearningCount: currentLearningCnt,
        totalItemsCount: contentFrom?.length,
        concentration: answer?.concentration,
      };
      try {
        const response = await submitAttempt(payload);
        if (response.session?.status === "ended") {
          // 학습 종료 시 다음 단계 정보 가져오기
          const nextStepInfo = getNextStep();
          console.log("Next Step Info:", nextStepInfo);
          // 여기서 결과 팝업(Modal)을 띄우는 로직을 연결하면 됩니다.
        } else {
          console.log("세션 유지중");
        }
      } catch (error) {
        console.error(error);
      }
    },
    [
      isAttemptPending,
      character,
      chapter,
      method,
      contentData,
      contentFrom,
      sessionId,
      currentItemIdx,
      currentQuestion,
      currentLearningCnt,
      getNextStep,
      submitAttempt,
    ],
  );
  const value = useMemo(
    () => ({
      // params
      character,
      chapter,
      method,
      target: contentData?.target,

      // Top 리스트 관련
      openContentList,
      handleContentListToggle,
      handleContentListClose,
      handleContentSelect,

      // Data
      curriculumData,
      item,
      contentData,
      sessionId,
      currentQuestion,
      repeatSettings,
      currentItemIdx,
      currentLearningCnt,
      // Loading
      isCurriculumLoading,
      isDataLoading, // 추가: 컨텐츠 로딩 상태
      isSessionLoading, // 추가: 세션 로딩 상태

      getMethodData,
      getNextStep,
      sendAnswer,
    }),
    [
      character,
      chapter,
      method,
      openContentList,
      curriculumData,
      currentItemIdx,
      repeatSettings,
      currentLearningCnt,
      isCurriculumLoading,
      contentData,
      currentQuestion,
      isDataLoading,
      isSessionLoading,
      item,
      sessionId,
      handleContentListToggle,
      handleContentListClose,
      handleContentSelect,
      getMethodData,
      getNextStep,
      sendAnswer,
    ],
  );
  return (
    <LearnContext.Provider value={value}>{children}</LearnContext.Provider>
  );
};

export const useLearnContext = () => {
  const ctx = useContext(LearnContext);
  if (!ctx) {
    throw new Error("useLearnContext must be used within a LearnProvider");
  }
  return ctx;
};
