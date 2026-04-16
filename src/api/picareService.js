import axios from "axios";

const BASE_URL = import.meta.env.VITE_PICARE_BACK_BASE_URL;

// 인스턴스 생성
const picareApi = axios.create({ baseURL: BASE_URL });

// API
// NOTE: 사용 훈련 데이터
export const postFeature = async (payload) => {
  console.log("[PAYLOAD] postFeature:", JSON.stringify(payload));
  try {
    const { status } = await picareApi.post("/v1/feature_log", payload);
    if (status !== 200) throw new Error(status);
    console.log("[SUCCESS] REQ postFeature");
    return;
  } catch (error) {
    console.log("[FAILED] REQ postFeature MSG: ", error);
  }
};

// NOTE: 상호작용 데이터
export const postInteraction = async (payload) => {
  console.log("[PAYLOAD] postInteraction:", JSON.stringify(payload));
  try {
    const { status } = await picareApi.post("/v1/interaction_log", payload);
    if (status !== 200) throw new Error(status);
    console.log("[SUCCESS] REQ postInteraction");
    return;
  } catch (error) {
    console.log("[FAILED] REQ postInteraction MSG: ", error);
  }
};

export const postSystemVolumn = async (payload) => {
  try {
    const { status } = await picareApi.post("/v1/system_volume", {
      level: payload,
    });
    if (status !== 200) throw new Error(status);
    console.log("[SUCCESS] REQ postSystemVolumn");
    return true;
  } catch (error) {
    console.log("[FAILED] REQ postSystemVolumn MSG: ", error);
    return false;
  }
};
