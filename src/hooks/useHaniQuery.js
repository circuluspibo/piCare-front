import {
  get,
  getActiveSession,
  patchProgress,
  postAttempt,
  resetConfigSession,
  startSession,
} from "@/api/haniService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useCurriculumQuery = (characterId) => {
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
    refetchOnMount: true,
    staleTime: 0,
  });

  return {
    curriculumData: data,
    isCurriculumLoading: isPending,
    isCurriculumError: error,
    refetchCurriculum: refetch,
  };
};

export const useContentQuery = (characterId, chapterId, method) => {
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
    enabled: !!(characterId && chapterId && method),
    refetchOnMount: true,
    staleTime: 0,
  });
  return {
    data,
    isPending,
    isError: error,
    refetch,
  };
};

export const useSessionQuery = (param) => {
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
    retry: 1,
  });
};

export const usePostStartSessionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => startSession(payload),
    onSuccess: (data, variables) => {
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

export const useUpdateProgressMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, ...payload }) => {
      return await patchProgress({ sessionId, ...payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeSession"] });
    },
  });
};

export const usePostAttemptMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => postAttempt(payload),
    onSuccess: (data, variables) => {
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
  });
};

export const useResetConfigMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => await resetConfigSession(payload),
    onSuccess: async (_, variables) => {
      // 1. 캐시 무효화
      await queryClient.invalidateQueries({
        queryKey: ["character", "curriculum", variables.characterId],
      });
      // 2. 강제로 다시 가져오기 (Refetch 완료될 때까지 await)
      await queryClient.refetchQueries({
        queryKey: ["character", "curriculum", variables.characterId],
      });
      // 3. 세션 정보도 함께 리프레시
      queryClient.invalidateQueries({ queryKey: ["activeSession"] });
    },
    onError: (error) => {
      console.error("초기화 실패:", error);
    },
  });
};
