import { View, Text, Video } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getMvById, getMvByTrackId } from '@soundx/services'
import { usePlayer } from '../../context/PlayerContext'
import { getBaseURL } from '../../utils/request'
import './index.scss'

export default function MvPlayer() {
  const { t } = useTranslation()
  const { pause } = usePlayer()
  const [mv, setMv] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const getImageUrl = (url: string | null) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    return `${getBaseURL()}${url}`
  }

  useLoad((options) => {
    pause() // pause audio player when entering MV
    const id = options.id
    const trackId = options.trackId
    
    if (trackId) {
      loadMv(trackId, true)
    } else if (id) {
      loadMv(id, false)
    }
  })

  const loadMv = async (id: string, isTrackId: boolean) => {
    try {
      setLoading(true)
      const res = isTrackId ? await getMvByTrackId(Number(id)) : await getMvById(Number(id))
      if (res && res.path) {
        setMv(res)
        Taro.setNavigationBarTitle({ title: res.name || 'MV' })
      } else {
        Taro.showToast({ title: 'MV not found', icon: 'none' })
        setTimeout(() => Taro.navigateBack(), 1500)
      }
    } catch (error) {
      console.error('Failed to load MV:', error)
      Taro.showToast({ title: 'Failed to load', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View className='mv-container'>
        <Text className='loading-text'>{t('common.loading')}</Text>
      </View>
    )
  }

  if (!mv) {
    return (
      <View className='mv-container empty'>
        <Text className='empty-text'>MV Not Found</Text>
      </View>
    )
  }

  const videoUrl = getImageUrl(mv.path)

  return (
    <View className='mv-container'>
      <Video
        className='mv-video'
        src={videoUrl}
        poster={mv.cover ? getImageUrl(mv.cover) : ''}
        autoplay
        controls
        objectFit='contain'
      />
      <View className='mv-info'>
        <Text className='mv-title'>{mv.name}</Text>
        {mv.artist && <Text className='mv-artist'>{mv.artist}</Text>}
      </View>
    </View>
  )
}
