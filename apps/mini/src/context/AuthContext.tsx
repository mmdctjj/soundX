import { login as loginApi, register as registerApi, setPlusToken, setServiceConfig, SOURCEMAP, useEmbyAdapter, useNativeAdapter, useSubsonicAdapter } from '@soundx/services'
import Taro from '@tarojs/taro'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '../models'
import { setBaseURL } from '../utils/request'

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (user: Partial<User>) => Promise<void>
  register: (user: Partial<User>) => Promise<void>
  logout: () => Promise<void>
  device: any | null
  switchServer: (address: string, sourceType: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  device: null,
  switchServer: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [device, setDevice] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAuthData()
  }, [])

  const loadAuthData = async () => {
    try {
      const serverAddress = Taro.getStorageSync('serverAddress')
      const sourceType = Taro.getStorageSync('currentSourceType') || 'AudioDock'
      if (serverAddress) {
        setBaseURL(serverAddress)
      }

      // 加载凭证并切换适配器
      const mappedType = SOURCEMAP[sourceType as keyof typeof SOURCEMAP] || 'audiodock'
      const credsKey = `creds_${sourceType}_${serverAddress || ''}`
      let username: string | undefined
      let password: string | undefined
      try {
        const savedCreds = Taro.getStorageSync(credsKey)
        if (savedCreds) {
          const parsed = JSON.parse(savedCreds)
          username = parsed.username
          password = parsed.password
        }
      } catch (e) {
        // ignore
      }
      setServiceConfig({ username, password, baseUrl: serverAddress || undefined, clientName: 'SoundX Mini' })
      if (mappedType === 'subsonic') {
        useSubsonicAdapter()
      } else if (mappedType === 'emby') {
        useEmbyAdapter()
      } else {
        useNativeAdapter()
      }

      const savedToken = Taro.getStorageSync('token')
      const savedUser = Taro.getStorageSync('user')
      const savedDevice = Taro.getStorageSync('device')
      const savedPlusToken = Taro.getStorageSync('plus_token')

      if (savedToken) {
        setToken(savedToken)
      }
      if (savedUser) {
        setUser(JSON.parse(savedUser))
      }
      if (savedDevice) {
        setDevice(JSON.parse(savedDevice))
      }
      if (savedPlusToken) {
        setPlusToken(savedPlusToken)
      }
    } catch (error) {
      console.error('Failed to load auth data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (credentials: Partial<User>) => {
    try {
      const res = await loginApi({ ...credentials })
      if (res.code === 200 && res.data) {
        console.log(res, 'res')
        const { token: newToken, device: newDevice } = res.data
        const userData = res.data
        setToken(newToken)
        setUser(userData)
        Taro.setStorageSync('token', newToken);
        Taro.setStorageSync('user', JSON.stringify(userData))
        if (newDevice) {
          setDevice(newDevice)
          Taro.setStorageSync('device', JSON.stringify(newDevice))
        }
      } else {
        throw new Error(res.message || 'Login failed')
      }
    } catch (error) {
      throw error
    }
  }

  const register = async (credentials: Partial<User>) => {
    try {
      const res = await registerApi({ ...credentials })
      if (res.code === 200 && res.data) {
        const { token: newToken, device: newDevice } = res.data
        const userData = res.data
        setToken(newToken)
        setUser(userData)
        Taro.setStorageSync('token', newToken)
        Taro.setStorageSync('user', JSON.stringify(userData))
        if (newDevice) {
          setDevice(newDevice)
          Taro.setStorageSync('device', JSON.stringify(newDevice))
        }
      } else {
        throw new Error(res.message || 'Registration failed')
      }
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      setToken(null)
      setUser(null)
      setDevice(null)
      Taro.removeStorageSync('token')
      Taro.removeStorageSync('user')
      Taro.removeStorageSync('device')
    } catch (error) {
      console.error('Failed to logout:', error)
    }
  }

  const switchServer = async (address: string, sourceType: string) => {
    try {
      // 保存服务器地址
      Taro.setStorageSync('serverAddress', address)
      Taro.setStorageSync('currentSourceType', sourceType)

      // 更新请求基础URL
      setBaseURL(address)

      // 加载保存的凭证
      const credsKey = `creds_${sourceType}_${address}`
      let username: string | undefined
      let password: string | undefined
      try {
        const savedCreds = Taro.getStorageSync(credsKey)
        if (savedCreds) {
          const parsed = JSON.parse(savedCreds)
          username = parsed.username
          password = parsed.password
        }
      } catch (e) {
        // ignore
      }

      // 配置服务（凭证 + 适配器）
      const mappedType = SOURCEMAP[sourceType as keyof typeof SOURCEMAP] || 'audiodock'
      setServiceConfig({ username, password, baseUrl: address, clientName: 'SoundX Mini' })
      if (mappedType === 'subsonic') {
        useSubsonicAdapter()
      } else if (mappedType === 'emby') {
        useEmbyAdapter()
      } else {
        useNativeAdapter()
      }

      // 清除当前用户信息（需要重新登录）
      setToken(null)
      setUser(null)
      Taro.removeStorageSync('token')
      Taro.removeStorageSync('user')

      Taro.showToast({
        title: '服务器切换成功，请重新登录',
        icon: 'success',
        duration: 2000
      })

      // 跳转到登录页面
      setTimeout(() => {
        Taro.reLaunch({ url: '/pages/login/index' })
      }, 2000)
    } catch (error) {
      console.error('Failed to switch server:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, register, logout, device, switchServer }}
    >
      {children}
    </AuthContext.Provider>
  )
}
