import axios from "axios";

const NPU_BASE_URL = import.meta.env.VITE_NPU_BASE_URL;

// 인스턴스 생성 및 인터셉터 적용
const npuApi = axios.create({ baseURL: NPU_BASE_URL });

// API
// NOTE: NPU 엔진 웜업 API
export const getStartCollection = async () => {
  try {
    const { data, status } = await npuApi.get("/start_collection");
    if (status !== 200) throw new Error(status);
    console.log("[SUCCESS] REQ getStartCollection");
    return data;
  } catch (error) {
    console.log("[FAILED] REQ getStartCollection MSG: ", error);
  }
};
// NOTE: 비디오 감지 AI
export const getStopCollection = async () => {
  try {
    const { data, status } = await npuApi.get("/stop_collection");
    if (status !== 200) throw new Error(status);
    console.log("[SUCCESS] REQ getStopCollection");
    return data;
  } catch (error) {
    console.log("[FAILED] REQ getStopCollection MSG: ", error);
  }
};
// NOTE: 상태 측정 AI
export const getHeartbeat = async () => {
  try {
    const { data, status } = await npuApi.get("/heartbeat");
    if (status !== 200) throw new Error(status);
    console.log("[SUCCESS] REQ getHeartbeat");
    return data;
  } catch (error) {
    console.log("[FAILED] REQ getHeartbeat MSG: ", error);
  }
};
