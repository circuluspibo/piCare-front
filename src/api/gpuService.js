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
    console.log("[SUCCESS] REQ getPrepare");
    return data;
  } catch (error) {
    console.log("[FAILED] REQ getPrepare MSG: ", error);
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
    console.log("[SUCCESS] REQ getTxt2Chat");
    return data;
  } catch (error) {
    console.log("[FAILED] REQ getTxt2Chat MSG: ", error);
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
    console.log("[SUCCESS] REQ postStt");
    return data.data;
  } catch (error) {
    console.log("[FAILED] REQ postStt MSG: ", error);
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
    console.log("[SUCCESS] REQ postTxt2Img");
    return URL.createObjectURL(data);
  } catch (error) {
    console.log("[FAILED] REQ postTxt2Img MSG: ", error);
  }
};
// NOTE: 이미지를 읽고 대화형 AI 응답
export const postImg2Chat = async (file, systemPrompt, lang = "ko") => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "prompt",
    "사진에 보이는 내 표정과 주변 환경을 먼저 구체적으로 설명하고, 그 내용을 바탕으로 JSON 형식으로만 답해줘: { 'result' : '답변' }",
  );
  formData.append("system", systemPrompt);
  formData.append("lang", lang);
  formData.append("isPlay", "0");

  try {
    const { data, status } = await gpuApi.post("/v1/img2chat", formData);
    if (status !== 200) throw new Error(status);
    console.log("[SUCCESS] REQ postImg2Chat");
    return data;
  } catch (error) {
    console.log("[FAILED] REQ postImg2Chat MSG: ", error);
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
    console.log("[SUCCESS] REQ postFace2Img");
    return URL.createObjectURL(data);
  } catch (error) {
    console.log("[FAILED] REQ postFace2Img MSG: ", error);
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
    console.log("[SUCCESS] REQ postVoice2Wav");
    return URL.createObjectURL(data);
  } catch (error) {
    console.log("[FAILED] REQ voice2wav] MSG: ", error);
  }
};
