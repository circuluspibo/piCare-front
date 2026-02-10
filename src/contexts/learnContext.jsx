import {
  useCurriculumQuery,
  useContentQuery,
  useSessionQuery,
  useUpdateProgressMutation,
  usePostAttemptMutation,
  usePostStartSessionMutation, // startSession API를 호출하는 훅 (추가 필요)
} from "@/hooks/useHaniQuery";
import { METHODS, TARGETS } from "@/utils/haniUtil";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams } from "react-router-dom";

export const CHARACTER = "691a6d43eb6b241816a865d1";
const LearnContext = createContext(null);

export const LearnProvider = ({ children }) => {
  const { character, chapter, method } = useParams();
  const [openContentList, setOpenContentList] = useState(false);
  const [sessionId, setSessionId] = useState(null); // 현재 활성화된 세션 ID 상태

  // 1️⃣ 데이터 쿼리
  const { curriculumData, isCurriculumLoading } = useCurriculumQuery(CHARACTER);

  const { data: contentData, isLoading: isDataLoading } = useContentQuery(
    character,
    chapter,
    method,
  );

  // 2️⃣ 세션 조회 쿼리
  const {
    data: sessionData,
    isLoading: isSessionLoading,
    refetch: refetchSession,
  } = useSessionQuery({
    character,
    chapter,
    method,
    target: contentData?.target,
  });

  // 3️⃣ Mutation 훅들
  const { mutateAsync: submitAttempt, isPending: isAttemptPending } =
    usePostAttemptMutation();
  const { mutateAsync: startSession } = usePostStartSessionMutation(); // 신규 세션 생성 훅
  const { updateProgress } = useUpdateProgressMutation();

  // 4️⃣ [핵심] 세션 초기화 로직 (조회 후 없으면 생성)
  useEffect(() => {
    // 컨텐츠 정보나 초기 세션 조회 로딩 중이면 대기
    if (isDataLoading || isSessionLoading || !contentData) return;

    const initializeSession = async () => {
      // (1) 서버에 활성화된 세션이 있는 경우 (복구)
      if (sessionData?.active) {
        setSessionId(sessionData.session._id);
        return;
      }

      // (2) 활성 세션이 없고, 현재 세션 ID가 아직 없을 때만 생성 (중복 생성 방지)
      if (sessionData && !sessionData.active && !sessionId) {
        try {
          // 기기 정보 수집
          const device = {
            userAgent: navigator.userAgent,
            locale: navigator.language,
            platform: navigator.platform,
            screen: {
              width: window.screen.width,
              height: window.screen.height,
            },
          };

          // IP 및 위치 정보 (간소화된 방식)
          let geoData = {};
          try {
            const res = await fetch("https://ipapi.co/json/");
            const location = await res.json();
            geoData = {
              ip: location.ip,
              geo: {
                city: location.city,
                region: location.region,
                country: location.country,
              },
            };
          } catch (e) {
            console.warn("위치 정보를 가져올 수 없습니다.");
          }

          const started = await startSession({
            characterId: character,
            chapterId: chapter,
            method,
            target: contentData.target,
            repeatSettings: {
              correct: contentData.repeat || 1,
              incorrect: Math.round((contentData.repeat || 1) * 1.5) || 2,
            },
            device: { ...device, ...geoData },
          });

          if (started?.sessionId) {
            setSessionId(started.sessionId);
            refetchSession(); // 쿼리 캐시 갱신
          }
        } catch (error) {
          console.error("세션 생성 중 오류:", error);
        }
      }
    };

    initializeSession();
  }, [sessionData, isSessionLoading, isDataLoading, contentData, sessionId]);

  // 5️⃣ 세션 기반 상태 계산
  const activeSession = sessionData?.active ? sessionData.session : null;
  const currentItemIdx = activeSession?.currentItemIndex ?? 0;
  const currentQuestion = activeSession?.currentQuestionNo ?? 1;
  const currentLearningCnt = activeSession?.currentLearningCount ?? 0;

  const contentFrom = contentData?.contents;
  const item = contentFrom?.[currentItemIdx];

  // 커리큘럼 기반 전체 학습 리스트 생성
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

  // 다음 단계 정보를 계산하는 함수
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

    while (nextListItem && nextListItem.session?.status === "ended") {
      nextIndex += 1;
      nextListItem = learningList[nextIndex];
    }

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

  // 6️⃣ 핸들러 함수들
  const handleContentListToggle = useCallback(
    () => setOpenContentList((prev) => !prev),
    [],
  );
  const handleContentListClose = useCallback(
    () => setOpenContentList(false),
    [],
  );

  const handleContentSelect = useCallback(
    (index) => {
      const targetItem = contentFrom?.[index];
      if (sessionId && targetItem) {
        updateProgress({ sessionId, item: targetItem, method });
      }
      handleContentListClose();
    },
    [contentFrom, sessionId, method, updateProgress, handleContentListClose],
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

  // 정답 전송 및 결과 처리
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
          const nextStepInfo = getNextStep();
          // TODO: 여기서 결과 모달을 띄우는 이벤트를 발행하거나 상태를 업데이트합니다.
          console.log("학습 종료:", nextStepInfo);
        }
      } catch (error) {
        console.error("답안 전송 에러:", error);
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
      character,
      chapter,
      method,
      target: contentData?.target,
      openContentList,
      handleContentListToggle,
      handleContentListClose,
      handleContentSelect,
      curriculumData,
      item,
      contentData,
      sessionId,
      currentQuestion,
      repeatSettings,
      currentItemIdx,
      currentLearningCnt,
      isCurriculumLoading,
      isDataLoading,
      isSessionLoading,
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
  if (!ctx)
    throw new Error("useLearnContext must be used within a LearnProvider");
  return ctx;
};
