import { message } from "antd";
import axios, { AxiosError, type AxiosResponse } from "axios";

// Get base URL based on environment
export function getBaseURL(): string {
  // In development, use proxy
  if (import.meta.env.DEV) {
    return "/api";
  }

  // In production, use server address from localStorage or default
  try {
    const serverAddress = localStorage.getItem("serverAddress");
    if (serverAddress) {
      return serverAddress;
    }
  } catch (e) {
    console.error("Failed to get server address from localStorage:", e);
  }

  // Default fallback
  return "http://localhost:3000";
}

const instance = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
});

const messageContent: { [key in number]: string } = {
  0: "未知错误",
  201: "创建成功",
  401: "验证失败",
  403: "禁止访问",
  404: "接口不存在",
  500: "服务器错误",
};

instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }

    // Update baseURL dynamically in production
    if (!import.meta.env.DEV) {
      config.baseURL = getBaseURL();
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

instance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },
  (error: AxiosError) => {
    // 处理 HTTP 网络错误
    // HTTP 状态码
    const status = error.response?.status ?? 0;
    message.error(messageContent[status]);
  }
);

export default instance;
