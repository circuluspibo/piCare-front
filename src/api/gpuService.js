import axios from "axios";

const GPU_BASE_URL = import.meta.env.VITE_GPU_BASE_URL;

const gpuApi = axios.create({ baseURL: GPU_BASE_URL });

// API
// NOTE: GPU 모델 변경 API
export const getPrepare = async (mode) => {
  try {
    const { data, status } = gpuApi.get("/prepare", {
      params: {
        mode,
      },
    });
    if (status !== 200) throw new Error(status);

    return data;
  } catch (error) {
    console.log(`[FAILED TO REQ getPrepare : ${error}]`);
  }
};
// NOTE: 대화형 AI
export const getTxt2Chat = async (message, currentSystem, currentLang) => {
  try {
    const { data, status } = await gpuApi.get("/v1/txt2chat", {
      params: {
        prompt: message,
        system: currentSystem,
        isPlay: "0",
        lang: currentLang,
      },
      responseType: "stream",
      adapter: "fetch",
    });
    if (status !== 200) throw new Error(status);

    return data;
  } catch (error) {
    console.log(`[FAILED TO REQ getTxt2Chat : ${error}]`);
  }
};

// NOTE: 음성을 텍스트로 변환 API
export const postStt = async (formData, currentLang) => {
  try {
    const { data, status } = await gpuApi.post("/v1/stt", formData, {
      stackLog: true,
      params: {
        lang: currentLang,
        isPlay: "0",
      },
    });
    if (status !== 200) throw new Error(status);

    return data.data;
  } catch (error) {
    console.log(`[FAILED TO REQ postStt : ${error}]`);
  }
};
// NOTE: 텍스트를 이미지로 생성 AI
export const postTxt2Img = async (prompt, model) => {
  try {
    const { data, status } = await gpuApi.post("/txt2img", null, {
      params: {
        prompt,
        model,
        seed: 0,
        lang: "ko",
      },
      responseType: "blob",
    });
    if (status !== 200) throw new Error(status);

    return URL.createObjectURL(data);
  } catch (error) {
    console.log(`[FAILED TO REQ postTxt2Img : ${error}]`);
  }
};
// NOTE: 이미지를 읽고 대화형 AI 응답
export const postImg2Chat = async (file, systemPrompt, lang = "ko") => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "prompt",
    "recognize this image as OCR, response only json like this, { 'result' : 'value'}",
  );
  formData.append("system", systemPrompt);
  formData.append("lang", lang);
  formData.append("isPlay", "0");

  try {
    const { data, status } = await gpuApi.post("/v1/img2chat", formData);
    if (status !== 200) throw new Error(status);

    return data;
  } catch (error) {
    console.log(`[FAILED TO REQ postImg2Chat : ${error}]`);
  }
};

export const postFace2Img = async (file, prompt) => {
  const formData = new FormData();
  formData.append("file", file);
  const params = {
    prompt,
    model: "real",
    seed: 0,
    lang: "ko",
  };

  try {
    const { data, status } = await gpuApi.post("face2img", formData, {
      responseType: "blob",
      params: params,
    });
    if (status !== 200) throw new Error(status);
    return URL.createObjectURL(data);
  } catch (error) {
    console.log(`[FAILED TO REQ postFace2Img] : ${error}`);
  }
};

export const postVoice2Wav = async (source, target) => {
  const formData = new FormData();
  formData.append("src", source);
  formData.append("tgt", target);

  try {
    const { data, status } = await gpuApi.post("voice2wav", formData, {
      responseType: "blob",
    });
    if (status !== 200) throw new Error(status);
    return URL.createObjectURL(data);
  } catch (error) {
    console.log(`[FAILED TO REQ voice2wav] message: ${error}`);
  }
};
