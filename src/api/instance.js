// import { saveApiLog } from "./logService"; // 로그 저장용 유틸
import axios from "axios";
// const logServer = "http://localhost:5000/v1/logs";
export const setInterceptors = (instance) => {
  // NOTE: Request Interceptor
  instance.interceptors.request.use((config) => {
    if (config.stackLog) {
      // const logData = {
      //   type: "request",
      //   method: config.method,
      //   url: config.url,
      //   timeStamp: new Date(),
      // };
      console.log("config = ", config);
      // axios.post(logServer, logData).catch(() => {});
    }

    return config;
  });
  // NOTE: Response Interceptor
  instance.interceptors.response.use(
    (response) => {
      if (response.config.stackLog) {
        // const logData = {
        //   type: "response",
        //   status: response.status,
        //   url: response.config.url,
        //   timeStamp: new Date(),
        // };
        // axios.post(logServer, logData).catch(() => {});
        console.log("response.config = ", response.config);
      }
      return response;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
  return instance;
};
