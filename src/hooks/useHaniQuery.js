import {
  get,
  getActiveSession,
  patchProgress,
  postAttempt,
  startSession,
} from "@/api/haniService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const useCurriculumQuery = (characterId) => {
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ["character", "curriculum", characterId],
    queryFn: async () => {
      const result = await get(`character/${characterId}/curriculum`);
      return result;
    },
    select: (response) => {
      if (response && response.data) {
        return response.data;
      }
      return [];
    },
    enabled: !!characterId,
    refetchOnMount: true, // 컴포넌트가 마운트될 때마다 refetch
    staleTime: 0, // 데이터를 항상 stale로 간주하여 refetch 허용
  });

  return {
    curriculumData: data,
    isCurriculumLoading: isPending,
    isCurriculumError: error,
    refetchCurriculum: refetch,
  };
};

const useContentQuery = (characterId, chapterId, method) => {
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ["learning", "content", characterId, chapterId, method],
    queryFn: async () => {
      const result = await get(`content`, { characterId, chapterId, method });
      return result;
    },
    select: (response) => {
      if (
        response &&
        "result" in response &&
        response.result &&
        response.data
      ) {
        return response.data;
      } else {
        return [];
      }
    },
    enabled: !!(characterId && chapterId && method), // target이 있을 때만 쿼리를 실행합니다.
    refetchOnMount: true, // 컴포넌트가 마운트될 때마다 refetch
    staleTime: 0, // 데이터를 항상 stale로 간주하여 refetch 허용
  });
  return {
    data,
    isPending,
    isError: error,
    refetch,
  };
};

const useSessionQuery = (param) => {
  const { character, chapter, method, target } = param;

  return useQuery({
    queryKey: ["activeSession", character, chapter, method, target],
    queryFn: () =>
      getActiveSession({
        characterId: character,
        chapterId: chapter,
        method,
        target,
      }),
    enabled: !!(character && chapter && method && target),
    staleTime: 0,
    retry: 1, // 실패 시 1번만 재시도
  });
};
export const usePostStartSessionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => startSession(payload),
    onSuccess: (data, variables) => {
      // 세션 생성 성공 시, 해당 조건의 activeSession 쿼리를 무효화하여 최신화합니다.
      queryClient.invalidateQueries({
        queryKey: [
          "activeSession",
          variables.characterId,
          variables.chapterId,
          variables.method,
          variables.target,
        ],
      });
    },
    onError: (error) => {
      console.error("세션 시작 실패:", error);
    },
  });
};

const useUpdateProgressMutation = () => {
  const queryClient = useQueryClient();

  // useQuery와 똑같이 내부에서 상태를 받아옵니다.
  const { mutate, isPending, error } = useMutation({
    mutationFn: async ({ sessionId, ...payload }) => {
      // 실제 API 호출 부분
      return await patchProgress({ sessionId, ...payload });
    },
    // ✅ 데이터 변경 성공 시, 'activeSession' 키를 가진 쿼리를 무효화(새로고침)
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeSession"] });
    },
  });

  // 사용자가 정의한 변수명 스타일로 반환
  return {
    updateProgress: mutate, // 실행 함수 (LearnProvider에서 호출)
    isUpdatePending: isPending, // 로딩 상태 (버튼 비활성화 등에 사용)
    isUpdateError: error, // 에러 상태 (에러 메시지 등에 사용)
  };
};

const usePostAttemptMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => postAttempt(payload),
    onSuccess: () => {
      // ✅ 세션 데이터 무효화 -> Provider의 데이터가 자동으로 최신화됨
      queryClient.invalidateQueries({ queryKey: ["activeSession"] });
    },
  });
};

export {
  useCurriculumQuery,
  useContentQuery,
  useSessionQuery,
  useUpdateProgressMutation,
  usePostAttemptMutation,
};
