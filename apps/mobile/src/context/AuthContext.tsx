import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from 'expo-device';
import React, { createContext, useContext, useEffect, useState } from "react";
import { initBaseURL } from "../https";
import { User } from "../models";
import { login as loginApi, register as registerApi } from "../services/auth";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (user: Partial<User>) => Promise<void>;
  register: (user: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  device: any | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  device: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [device, setDevice] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAuthData();
  }, []);

  const loadAuthData = async () => {
    try {
      await initBaseURL(); // Initialize base URL first
      const savedToken = await AsyncStorage.getItem("token");
      const savedUser = await AsyncStorage.getItem("user");

      if (savedToken) {
        setToken(savedToken);
      }
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
      const savedDevice = await AsyncStorage.getItem("device");
      if (savedDevice) {
        setDevice(JSON.parse(savedDevice));
      }
    } catch (error) {
      console.error("Failed to load auth data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: Partial<User>) => {
    try {
      const deviceName = Device.modelName || 'Mobile Device';
      const res = await loginApi({ ...credentials, deviceName });
      if (res.code === 200 && res.data) {
        const { token: newToken, device, ...userData } = res.data;
        setToken(newToken);
        setUser(userData);
        await AsyncStorage.setItem("token", newToken);
        await AsyncStorage.setItem("user", JSON.stringify(userData));
        if (device) {
          setDevice(device);
          await AsyncStorage.setItem("device", JSON.stringify(device));
        }
      } else {
        throw new Error(res.message || "Login failed");
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (credentials: Partial<User>) => {
    try {
      const deviceName = Device.modelName || 'Mobile Device';
      const res = await registerApi({ ...credentials, deviceName });
      if (res.code === 200 && res.data) {
        const { token: newToken, device, ...userData } = res.data;
        setToken(newToken);
        setUser(userData);
        await AsyncStorage.setItem("token", newToken);
        await AsyncStorage.setItem("user", JSON.stringify(userData));
        if (device) {
          setDevice(device);
          await AsyncStorage.setItem("device", JSON.stringify(device));
        }
      } else {
        throw new Error(res.message || "Registration failed");
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      setToken(null);
      setUser(null);
      setDevice(null);
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      await AsyncStorage.removeItem("device");
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, register, logout, device }}
    >
      {children}
    </AuthContext.Provider>
  );
};
