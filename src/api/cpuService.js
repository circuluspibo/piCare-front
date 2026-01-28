import axios from "axios";

const CPU_BASE_URL = import.meta.env.VITE_CPU_BASE_URL;

// 인스턴스 및 인터셉터 적용
const cpuApi = axios.create({ baseURL: CPU_BASE_URL });

// API
// NOTE: 입력한 텍스트를 음성으로 생성 API
export const getTts = async (text, targetVoice, currentLang) => {
  try {
    const { data, status } = await cpuApi.get("/v1/tts", {
      params: {
        text: text.trim(),
        voice: targetVoice,
        lang: currentLang,
        static: "0",
        isPlay: "0",
      },
      responseType: "blob",
    });
    if (status !== 200) throw new Error(status);

    return URL.createObjectURL(data);
  } catch (error) {
    console.error(`[FAILED TO REQEUEST TTS : ${error}]`);
  }
};

export const getTtsBlob = async (text, taregetVoice, currentLang = "ko") => {
  try {
    const { data, status } = await cpuApi.get("/v1/tts", {
      params: {
        text: text.trim(),
        voice: taregetVoice,
        lang: currentLang,
        static: "0",
        isPlay: "0",
      },
      responseType: "blob",
    });
    if (status !== 200) throw new Error(status);
    return data;
  } catch (error) {
    console.error(`[FAILED TO REQ TTSBlob] message: ${error}`);
  }
};
