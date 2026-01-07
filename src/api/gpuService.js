import axios from "axios";
import { setInterceptors } from "./instance";

const GPU_BASE_URL = import.meta.env.VITE_GPU_BASE_URL;

const gpuApi = setInterceptors(axios.create({ baseURL: GPU_BASE_URL }));

// API
// NOTE: GPU 모델 변경 API
export const getPrepare = async (mode) => {
  try {
    const res = gpuApi.get("/prepare", {
      params: {
        mode,
      },
    });
    return res.data;
  } catch (error) {
    console.log(`[FAILED TO REQ getPrepare : ${error}]`);
  }
};
// NOTE: 대화형 AI
export const getTxt2Chat = async (message, currentSystem, currentLang) => {
  try {
    const res = await gpuApi.get("/v1/txt2chat", {
      params: {
        prompt: message,
        system: currentSystem,
        isPlay: "0",
        lang: currentLang,
      },
    });
    return res.data;
  } catch (error) {
    console.log(`[FAILED TO REQ getTxt2Chat : ${error}]`);
  }
};

// NOTE: 음성을 텍스트로 변환 API
export const postStt = async (formData, currentLang) => {
  try {
    const res = await gpuApi.post("/v1/stt", formData, {
      params: {
        lang: currentLang,
        isPlay: "0",
      },
    });
    return res.data;
  } catch (error) {
    console.log(`[FAILED TO REQ postStt : ${error}]`);
  }
};
// NOTE: 텍스트를 이미지로 생성 AI
export const postTxt2Img = async (prompt, model) => {
  try {
    const res = await gpuApi.post("/txt2img", null, {
      params: {
        prompt,
        model,
        seed: 0,
        lang: "ko",
      },
    });
    return res.data;
  } catch (error) {
    console.log(`[FAILED TO REQ postTxt2Img : ${error}]`);
  }
};
// NOTE: 이미지를 읽고 대화형 AI 응답
export const postImg2Chat = async (file, systemPrompt, lang = "ko") => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("prompt", "상황에 맞게 짧고 친절하게 인사해줘.");
  formData.append("system", systemPrompt);
  formData.append("lang", lang);
  formData.append("isPlay", "0");

  try {
    const res = await gpuApi("/v1/img2chat", formData);
    return res.data;
  } catch (error) {
    console.log(`[FAILED TO REQ postImg2Chat : ${error}]`);
  }
};
