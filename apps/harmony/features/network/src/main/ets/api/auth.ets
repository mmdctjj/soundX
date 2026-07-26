import { httpClient } from '../HarmonyHttpClient';

export interface LoginDto { username: string; password: string }
export interface RegisterDto {
  username: string; password: string; nickname?: string; deviceName?: string;
}
export interface AuthMe { id: string; username: string; nickname?: string }
export interface LoginResponse { token: string; user: AuthMe; deviceId: string }
export interface CheckResponse { needRegister: boolean }

export const authApi = {
  async login(dto: LoginDto): Promise<LoginResponse> {
    return httpClient.post<LoginResponse>('/auth/login', dto);
  },
  async register(dto: RegisterDto): Promise<LoginResponse> {
    return httpClient.post<LoginResponse>('/auth/register', dto);
  },
  async me(): Promise<AuthMe> {
    return httpClient.get<AuthMe>('/auth/me');
  },
  async check(username: string): Promise<CheckResponse> {
    return httpClient.get<CheckResponse>('/auth/check', { username });
  },
  async resetPassword(dto: { username: string; newPassword: string; deviceName: string }): Promise<void> {
    return httpClient.post<void>('/auth/reset-password', dto);
  },
  async verifyDevice(dto: { username: string; deviceName: string }): Promise<{ verified: boolean }> {
    return httpClient.post<{ verified: boolean }>('/auth/verify-device', dto);
  },
};