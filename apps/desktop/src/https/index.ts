import { message } from "antd";
import axios, { AxiosError, type AxiosResponse } from "axios";

const instance = axios.create({
  baseURL: "/api/production",
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
      config.headers.set("Authorization", `${token}`);
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
