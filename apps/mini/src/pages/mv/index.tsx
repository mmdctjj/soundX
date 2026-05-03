import { View, Text, Video, Image, ScrollView } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { getMvById, getMvByTrackId, type Mv } from '@soundx/services'
import { usePlayer } from '../../context/PlayerContext'
import { useTheme } from '../../context/ThemeContext'
import { getBaseURL } from '../../utils/request'
import { mvPlaylistStore } from '../../store/mvPlaylist'
import './index.scss'

const MV_VIDEO_ID = 'mv-video-player'

export default function MvPlayer() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const { pause } = usePlayer()
  const [mv, setMv] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(true)
  const videoContextRef = useRef<ReturnType<typeof Taro.createVideoContext> | null>(null)

  const playlistState = useSyncExternalStore(
    mvPlaylistStore.subscribe,
    mvPlaylistStore.getState,
  )
  const inPlaylist = playlistState.list.length > 1
  const displayPlaylist = playlistState.list.length > 0
    ? playlistState.list
    : mv
      ? [mv]
      : []
  const displayCurrentIndex = playlistState.list.length > 0 ? playlistState.currentIndex : 0

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
      // Check if we have a matching item in the playlist
      const playlistItem = playlistState.list[playlistState.currentIndex]
      if (playlistItem && String(playlistItem.id) === id) {
        setMv(playlistItem)
        Taro.setNavigationBarTitle({ title: playlistItem.name || 'MV' })
      } else {
        const res = isTrackId ? await getMvByTrackId(Number(id)) : await getMvById(Number(id))
        if (res && res.path) {
          setMv(res)
          Taro.setNavigationBarTitle({ title: res.name || 'MV' })
        } else {
          Taro.showToast({ title: 'MV not found', icon: 'none' })
          setTimeout(() => Taro.navigateBack(), 1500)
        }
      }
    } catch (error) {
      console.error('Failed to load MV:', error)
      Taro.showToast({ title: 'Failed to load', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handlePlayMv = (targetMv: Mv) => {
    const targetIndex = playlistState.list.findIndex(item => item.id === targetMv.id)
    if (targetIndex >= 0 && targetIndex !== playlistState.currentIndex) {
      mvPlaylistStore.setPlaylist(playlistState.list, targetIndex)
    }
    Taro.redirectTo({ url: `/pages/mv/index?id=${targetMv.id}` })
  }

  const handlePrev = () => {
    const prevMv = mvPlaylistStore.prev()
    if (prevMv) handlePlayMv(prevMv)
  }

  const handleNext = () => {
    const nextMv = mvPlaylistStore.next()
    if (nextMv) handlePlayMv(nextMv)
  }

  const togglePlay = () => {
    const videoContext = videoContextRef.current
    if (!videoContext) return
    if (isPlaying) {
      videoContext.pause()
    } else {
      videoContext.play()
    }
  }

  const handleEnded = () => {
    if (inPlaylist) {
      const nextMv = mvPlaylistStore.next()
      if (nextMv) handlePlayMv(nextMv)
    }
  }

  useEffect(() => {
    if (!mv?.id) return
    videoContextRef.current = Taro.createVideoContext(MV_VIDEO_ID)
    setIsPlaying(true)
  }, [mv?.id])

  useEffect(() => {
    Taro.setNavigationBarColor({
      frontColor: colors.text === '#000000' ? '#000000' : '#ffffff',
      backgroundColor: colors.background,
    })
  }, [colors.background, colors.text])

  if (loading) {
    return (
      <View className='mv-container' style={{ backgroundColor: colors.background }}>
        <Text className='loading-text' style={{ color: colors.text }}>{t('common.loading')}</Text>
      </View>
    )
  }

  if (!mv) {
    return (
      <View className='mv-container empty' style={{ backgroundColor: colors.background }}>
        <Text className='empty-text' style={{ color: colors.text }}>MV Not Found</Text>
      </View>
    )
  }

  const videoUrl = getImageUrl(mv.path)

  return (
    <View className='mv-container' style={{ backgroundColor: colors.background }}>

      <View className='mv-content'>
        <Video
          id={MV_VIDEO_ID}
          className='mv-video'
          src={videoUrl}
          poster={mv.cover ? getImageUrl(mv.cover) : ''}
          autoplay
          controls
          objectFit='contain'
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={handleEnded}
        />
        {displayPlaylist.length > 0 && (
          <View className='mv-playlist-section'>
            <View className='mv-playlist-header'>
              <Text className='mv-playlist-count' style={{ color: colors.secondary }}>
                <Text className='mv-playlist-title' style={{ color: colors.text }}>待播放 MV</Text>
                ({displayCurrentIndex + 1} / {displayPlaylist.length})
              </Text>
              <View className='mv-controls'>
                <View
                  className={`mv-control-btn ${mvPlaylistStore.hasPrev() ? '' : 'disabled'}`}
                  onClick={mvPlaylistStore.hasPrev() ? handlePrev : undefined}
                >
                  <Text className='mv-control-icon'>⏮</Text>
                </View>
                <View className='mv-control-btn' onClick={togglePlay}>
                  <Text className='mv-control-icon'>{isPlaying ? '⏸' : '▶'}</Text>
                </View>
                <View
                  className={`mv-control-btn ${mvPlaylistStore.hasNext() ? '' : 'disabled'}`}
                  onClick={mvPlaylistStore.hasNext() ? handleNext : undefined}
                >
                  <Text className='mv-control-icon'>⏭</Text>
                </View>
              </View>
            </View>
            <ScrollView scrollY className='mv-playlist-list'>
              {displayPlaylist.map((item, index) => (
                <View
                  key={item.id}
                  className={`mv-playlist-item ${item.id === mv?.id ? 'active' : ''}`}
                  style={{
                    borderBottomColor: colors.border,
                    backgroundColor: item.id === mv?.id ? `${colors.primary}18` : 'transparent',
                  }}
                  onClick={() => {
                    if (item.id !== mv?.id) handlePlayMv(item)
                  }}
                >
                  <Text
                    className={`mv-playlist-item-index ${item.id === mv?.id ? 'active' : ''}`}
                    style={{ color: item.id === mv?.id ? colors.primary : colors.secondary }}
                  >
                    {index + 1}
                  </Text>
                  <Image src={getImageUrl(item.cover)} className='mv-playlist-item-cover' mode='aspectFill' />
                  <View className='mv-playlist-item-info'>
                    <Text
                      className={`mv-playlist-item-name ${item.id === mv?.id ? 'active' : ''}`}
                      style={{ color: item.id === mv?.id ? colors.primary : colors.text }}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {item.artist && (
                      <Text className='mv-playlist-item-artist' style={{ color: colors.secondary }} numberOfLines={1}>
                        {item.artist}
                      </Text>
                    )}
                  </View>
                  {item.id === mv?.id && <Text className='mv-playlist-active' style={{ color: colors.primary }}>▶</Text>}
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  )
}
