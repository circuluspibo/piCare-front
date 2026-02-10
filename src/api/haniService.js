import axios from "axios";

// API_URL()은 기존에 정의된 함수를 그대로 사용한다고 가정합니다.
const API_URL = import.meta.env.VITE_API_URL;
export const get = async (route, params, headers = {}, signal = null) => {
  try {
    const res = await axios.get(`${API_URL}/${route}`, {
      // 1. params를 넣으면 axios가 자동으로 encodeGetParams처럼 직렬화해줍니다.
      params: params,

      // 2. 공통 헤더 설정 (Accept 등은 axios 기본값이 잘 잡혀있어 생략 가능)
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },

      // 3. 중단 신호(AbortController.signal) 처리
      signal: signal || undefined,
    });

    // 4. axios는 결과가 이미 JSON으로 파싱되어 res.data에 담겨 나옵니다.
    return res.data;
  } catch (error) {
    // 5. 에러 처리 (axios 에러 객체에서 응답 데이터를 추출하거나 커스텀 응답 반환)
    return {
      result: false,
      error: error.response?.data || error.message,
    };
  }
};

export async function getActiveSession(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}/sessions/active?${qs}`);
  if (!res.ok) throw new Error("getActiveSession failed");
  return res.json();
}
export async function patchProgress({ sessionId, ...payload }) {
  const res = await fetch(`${API_URL}/sessions/${sessionId}/progress`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  // console.log(res);
  if (!res.ok) throw new Error("patchProgress failed");
  return res.json(); // { session }
}
export async function postAttempt(payload) {
  const res = await fetch(`${API_URL}/attempts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("postAttempt failed");
  return res.json(); // { attemptId, session }
}

const encodeGetParams = (p) =>
  Object.entries(p)
    .map((kv) => kv.map(encodeURIComponent).join("="))
    .join("&");

export const getAsset = ({ type, content }) => {
  return type && content
    ? `${API_URL}/asset?${encodeGetParams({ type, content })}`
    : `${API_URL}/asset?${encodeGetParams({ content })}`;
};
export async function startSession(payload) {
  const res = await fetch(`${API_URL}/sessions/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok || (res.status !== 200 && res.status !== 409))
    throw new Error("startSession failed");
  return res.json(); // { sessionId }
}
