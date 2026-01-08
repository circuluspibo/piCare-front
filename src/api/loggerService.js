import axios from "axios";

const logClient = axios.create({
  baseURL: "", // MongoDB server
});

export const postLogger = async (logData) => {
  try {
    await logClient.post("/api/logs", logData);
  } catch (error) {
    console.error("[Faild to save log data] : ", error);
  }
};
