// /src/api/index.js

const apiBaseURL = import.meta.env.VITE_API_BASE_URL;
const ttsBaseURL = import.meta.env.VITE_TTS_BASE_URL;

/**
 * TTS 문장을 재생하는 API를 호출하고 재생이 완료될 때까지 기다립니다.
 * @param {string} text - 재생할 텍스트
 * @param {string} lang - 언어 코드 (ko, en 등)
 * @param {number} voice - 음성 ID (e.g., 33)
 * @returns {Promise<void>}
 */
export const playTtsSentence = (text, lang, voice) => {
  const ttsUrl =
    `${ttsBaseURL}/tts?` +
    new URLSearchParams({
      text,
      voice: `${voice - 1}`,
      lang: lang,
      static: "0",
      isPlay: "0",
    });

  return new Promise((resolve) => {
    const audio = new Audio(ttsUrl);
    audio.onended = resolve;
    audio.onerror = resolve; // 재생 오류 시에도 큐를 진행
    audio.play().catch(resolve); // play() 오류 시에도 큐를 진행
  });
};

/**
 * Pibo 모션 시작 API를 호출합니다.
 * @returns {Promise<Response>}
 */
export const startMotion = () => {
  // 시간 기반으로 모션 이름 결정 로직을 API 모듈로 옮김
  const time = Date.now();
  const motionName =
    time % 4 === 1
      ? "test1"
      : time % 4 === 2
      ? "test2"
      : time % 4 === 3
      ? "test3"
      : "";

  const motionApiUrl = `http://127.0.0.1:8000/motion${
    motionName ? `?name=${motionName}` : ""
  }`;

  return fetch(motionApiUrl);
};

/**
 * Pibo 모션 중지 API를 호출합니다.
 * @returns {Promise<Response>}
 */
export const stopMotion = () => {
  return fetch(`http://127.0.0.1:8000/stop`);
};

/**
 * STT (음성 인식) API를 호출합니다.
 * @param {Blob} audioBlob - 녹음된 오디오 데이터
 * @param {string} lang - 언어 코드
 * @returns {Promise<string>} 인식된 텍스트
 */
export const fetchStt = async (audioBlob, lang) => {
  const formData = new FormData();
  formData.append("file", audioBlob, "voice.ogg");

  const res = await fetch(`${apiBaseURL}/stt?lang=${lang}&isPlay=0`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`STT ERROR: ${res.status}`);
  }

  const result = await res.json();
  let recognizedText = "";
  if (result.text && result.text.trim()) {
    recognizedText = result.text.trim();
  } else if (result.data && result.data.trim()) {
    recognizedText = result.data.trim();
  }

  return recognizedText;
};

/**
 * LLM (Chat) 스트리밍 API를 호출하여 응답을 실시간으로 처리합니다.
 * @param {string} message - 사용자 질문
 * @param {string} system - 시스템 프롬프트
 * @param {string} lang - 언어 코드
 * @param {Function} onChunk - 청크 데이터가 도착할 때마다 호출되는 콜백 (청크 텍스트를 인수로 받음)
 * @returns {Promise<void>}
 */
export const fetchChatStream = async (message, system, lang, onChunk) => {
  const res = await fetch(
    `${apiBaseURL}/txt2chat?` +
      new URLSearchParams({
        prompt: message,
        system: system,
        isPlay: "0",
        lang: lang,
      })
  );

  if (!res.ok) {
    throw new Error(`NETWORK ERROR - fetchChatStream() : ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    const chunk = decoder.decode(value, { stream: true });
    onChunk(chunk);
  }
};
