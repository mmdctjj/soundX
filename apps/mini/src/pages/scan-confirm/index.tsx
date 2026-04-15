import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { confirmScanLoginSession, getScanLoginSession, reportScanLoginResultViaSocket } from '@soundx/services'
import './index.scss'

interface SourceConfig {
  id: string
  internal: string
  external: string
  name?: string
}

interface SourceBundle {
  type: string
  configs: SourceConfig[]
}

interface ScanStatus {
  status: string
  sessionId: string
  deviceName?: string
  sourceBundles: SourceBundle[]
  hasNativeAuth: boolean
  hasPlusAuth: boolean
}

export default function ScanConfirmPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null)
  const [selectedConfigIds, setSelectedConfigIds] = useState<Record<string, string[]>>({})
  const [waitResult, setWaitResult] = useState(false)

  const pollTimerRef = useRef<number | null>(null)
  const sessionIdRef = useRef<string>('')
  const secretRef = useRef<string>('')

  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params
    const sessionId = params?.sessionId
    const secret = params?.secret

    if (!sessionId || !secret) {
      Taro.showToast({ title: t('scanConfirm.missingSession'), icon: 'none' })
      Taro.navigateBack()
      return
    }

    sessionIdRef.current = sessionId as string
    secretRef.current = secret as string

    fetchSession(sessionId as string, secret as string)

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
      }
    }
  }, [])

  const fetchSession = async (sessionId: string, secret: string) => {
    try {
      const res = await getScanLoginSession(sessionId, secret)
      setScanStatus(res.data)

      // Auto-select all available bundles by default
      const initialSelected: Record<string, string[]> = {}
      res.data.sourceBundles.forEach((bundle: SourceBundle) => {
        initialSelected[bundle.type] = bundle.configs.map((c) => c.id)
      })
      setSelectedConfigIds(initialSelected)
    } catch (error: any) {
      Taro.showToast({ title: error.message || t('scanConfirm.getInfoFailed'), icon: 'none' })
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } finally {
      setLoading(false)
    }
  }

  const pollSessionStatus = async () => {
    try {
      const res = await getScanLoginSession(sessionIdRef.current, secretRef.current)
      const status = res.data.status

      if (status === 'success') {
        stopPolling()
        setConfirming(false)
        Taro.showToast({ title: t('scanConfirm.loginSuccess'), icon: 'success' })
        // Report success via socket so desktop knows
        reportScanLoginResultViaSocket(sessionIdRef.current, secretRef.current, true)
        setTimeout(() => {
          Taro.reLaunch({ url: '/pages/index/index' })
        }, 1500)
      } else if (status === 'failed') {
        stopPolling()
        setConfirming(false)
        Taro.showToast({ title: t('scanConfirm.loginFailed'), icon: 'none' })
        reportScanLoginResultViaSocket(sessionIdRef.current, secretRef.current, false, 'User rejected')
        setTimeout(() => {
          Taro.reLaunch({ url: '/pages/index/index' })
        }, 1500)
      }
    } catch (error: any) {
      console.error('Poll error:', error)
    }
  }

  const startPolling = () => {
    if (pollTimerRef.current) return
    pollTimerRef.current = setInterval(pollSessionStatus, 2000) as unknown as number
  }

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }

  const toggleConfigSelection = (type: string, configId: string) => {
    if (waitResult) return
    setSelectedConfigIds((prev) => {
      const current = new Set(prev[type] || [])
      if (current.has(configId)) current.delete(configId)
      else current.add(configId)
      return {
        ...prev,
        [type]: Array.from(current),
      }
    })
  }

  const handleConfirmScan = async () => {
    if (!sessionIdRef.current || !secretRef.current) return

    try {
      setConfirming(true)
      setWaitResult(true)
      const selections = Object.entries(selectedConfigIds).map(([type, configIds]) => ({
        type,
        configIds,
      }))
      await confirmScanLoginSession(sessionIdRef.current, {
        secret: secretRef.current,
        selections,
      })

      // Start polling to check result
      startPolling()

      // Show waiting message
      Taro.showToast({ title: t('scanConfirm.waitingConfirm'), icon: 'none', duration: 3000 })
    } catch (error: any) {
      Taro.showToast({ title: error.message || t('scanConfirm.confirmSendFailed'), icon: 'none' })
      setConfirming(false)
      setWaitResult(false)
    }
  }

  if (loading || !scanStatus) {
    return (
      <View className='scan-confirm-page'>
        <View className='loading'>{t('scanConfirm.loading')}</View>
      </View>
    )
  }

  return (
    <View className='scan-confirm-page'>
      <View className='header'>
        <Text className='title'>{t('scanConfirm.confirmSyncContent')}</Text>
      </View>

      <View className='content'>
        <Text className='desc'>
          {t('scanConfirm.selectDataSourceToShare')}
        </Text>

        <View className='list'>
          {scanStatus.sourceBundles.map((bundle) => (
            <View key={bundle.type} className='bundle-card'>
              <Text className='bundle-title'>{bundle.type}</Text>
              {bundle.configs.map((config) => {
                const checked = (selectedConfigIds[bundle.type] || []).includes(config.id)
                return (
                  <View
                    key={config.id}
                    className={`bundle-item ${waitResult ? 'disabled' : ''}`}
                    onClick={() => toggleConfigSelection(bundle.type, config.id)}
                  >
                    <View className={`checkbox ${checked ? 'checked' : ''}`}>
                      {checked && <Text className='checkmark'>✓</Text>}
                    </View>
                    <View className='bundle-item-info'>
                      <Text className='bundle-item-title'>{config.name || t('scanConfirm.unnamedDataSource')}</Text>
                      <Text className='bundle-item-meta'>
                        {config.internal || t('scanConfirm.internalLabel')} / {config.external || t('scanConfirm.externalLabel')}
                      </Text>
                    </View>
                  </View>
                )
              })}
            </View>
          ))}
          {scanStatus.sourceBundles.length === 0 && (
            <Text className='desc-empty'>
              {t('scanConfirm.noDataSource')}
            </Text>
          )}
        </View>

        <View className='btn-wrap'>
          <View
            className={`confirm-btn ${confirming ? 'disabled' : ''} ${waitResult ? 'waiting' : ''}`}
            onClick={handleConfirmScan}
          >
            <Text className='confirm-btn-text'>
              {waitResult ? t('scanConfirm.waitingTarget') : (confirming ? t('scanConfirm.confirming') : t('scanConfirm.confirmLogin'))}
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}