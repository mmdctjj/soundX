// 工具函数库入口文件

// 网络请求工具
export const request = async (url: string, options?: RequestInit) => {
  const response = await fetch(url, options)
  return response.json()
}

// 常用工具函数
export const formatTime = (date: Date): string => {
  return date.toLocaleString()
}

// 类型定义
export type RequestOptions = RequestInit