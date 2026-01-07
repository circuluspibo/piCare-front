// import { saveApiLog } from "./logService"; // 로그 저장용 유틸

export const setInterceptors = (instance) => {
  instance.interceptors.request.use((config) => {
    config.metadata = { startTime: new Date() };
    console.log("[REQ 인터셉터 동작 : 확인 완료]");
    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      const duration = new Date() - response.config.metadata.startTime;
      // 비동기 로그 저장 (응답에 지장을 주지 않음)
      //   saveApiLog({
      //     url: response.config.url,
      //     method: response.config.method,
      //     status: response.status,
      //     duration: `${duration}ms`,
      //     res: response.data,
      //   });
      console.log("[RES 인터셉터 동작 : 확인 완료]");
      return response;
    },
    (error) => {
      // saveApiLog({
      //   url: error.config?.url,
      //   error: error.message,
      //   isError: true,
      // });
      return Promise.reject(error);
    }
  );
  return instance;
};
