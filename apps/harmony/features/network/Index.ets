export { HarmonyHttpClient, httpClient } from './src/main/ets/HarmonyHttpClient';
export { HttpError } from './src/main/ets/HttpError';
export { authApi, userApi } from './src/main/ets/api';
export type {
  RequestConfig, HttpResponse,
  BackendEnvelope, RequestInterceptor, ResponseInterceptor, ErrorInterceptor,
} from './src/main/ets/types';
export type { LoginDto, RegisterDto, AuthMe, LoginResponse, CheckResponse, UserItem }
  from './src/main/ets/api';
export type { AuthApi, UserApi } from './src/main/ets/api';