import axios from "axios";
import { setInterceptors } from "./instance";

const NPU_BASE_URL = import.meta.env.VITE_NPU_BASE_URL;

// 인스턴스 생성 및 인터셉터 적용
const npuApi = setInterceptors(axios.create({ baseURL: NPU_BASE_URL }));

// API
// NOTE: NPU 엔진 웜업 API
export const getStartCollection = async () => {
  try {
    const {data, status} = await npuApi.get("/start_collection");
    if(status !== 200) throw new Error(status)
    
    return data;
  } catch (error) {
    console.log(`[FAILED TO REQ getStartCollection : ${error}]`);
  }
};
// NOTE: 비디오 감지 AI
// export const getVideoFeed = async () => {
//   try {
//     const res = await npuApi.get("/video_feed");
//     return res.data;
//   } catch (error) {
//     console.log(`[FAILED TO REQ getVideoFeed : ${error}]`);
//   }
// };
// NOTE: 상태 측정 AI
export const getHeartbeat = async () => {
  try {
    const { data, status } = await npuApi.get("/heartbeat");
    if(status !== 200) throw new Error(status)
    
    return data
  } catch (error) {
    console.log(`[FAILED TO REQ getHeartbeat : ${error}]`);
  }
};
