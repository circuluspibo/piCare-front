import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL;

// 공통 인스턴스 설정
const client = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

export const get = async (url, params = {}, config = {}) => {
  try {
    const res = await client.get(url, { params, ...config });
    return res.data;
  } catch (error) {
    return { result: false, error: error.response?.data || error.message };
  }
};

// 활성 세션 조회
export async function getActiveSession(params) {
  try {
    const res = await client.get("/sessions/active", { params });
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "getActiveSession failed");
  }
}

// 학습 진도 업데이트
export async function patchProgress({ sessionId, ...payload }) {
  try {
    const res = await client.patch(`/sessions/${sessionId}/progress`, payload);
    return res.data; // { session }
  } catch (error) {
    throw new Error(error.response?.data?.message || "patchProgress failed");
  }
}

// 문제 풀이 기록 전송
export async function postAttempt(payload) {
  try {
    const res = await client.post("/attempts", payload);
    return res.data; // { attemptId, session }
  } catch (error) {
    throw new Error(error.response?.data?.message || "postAttempt failed");
  }
}
// 세션 시작
export async function startSession(payload) {
  try {
    const res = await client.post("/sessions/start", payload);
    return res.data; // { sessionId }
  } catch (error) {
    // 200이나 409 이외의 에러 처리
    if (error.response?.status !== 409) {
      throw new Error(error.response?.data?.message || "startSession failed");
    }
    return error.response.data;
  }
}

// 챕터 설정 초기화
export async function resetConfigSession(payload) {
  const { characterId, allConfigs } = payload;
  console.log("characterId", characterId);
  console.log("allConfig = ", JSON.parse(JSON.stringify(allConfigs)));
  try {
    // 요청하신 구조에 맞춰 chapterId를 키로 하는 객체 전달
    const res = await client.put(
      `/character/${characterId}/curriculum/configs`,
      allConfigs,
    );
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "resetConfig failed");
  }
}

// 에셋 URL 생성
export function getAsset({ type, content }) {
  const params = type ? { type, content } : { content };
  const qs = new URLSearchParams(params).toString();
  return `${API_URL}/asset?${qs}`;
}
