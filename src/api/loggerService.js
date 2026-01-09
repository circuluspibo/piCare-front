import axios from "axios";

const logClient = axios.create({
  baseURL: "http://localhost:5000", // MongoDB server
});

export const postLogger = async (logData) => {
  try {
    await logClient.post("/v1/logs", logData);
  } catch (error) {
    console.error("[Faild to save log data] : ", error);
  }
};
