import { Image, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import React from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { getImageUrl as buildImageUrl } from '../../utils/image';
import PlaylistModal from '../PlaylistModal';
import './index.scss';

const MiniPlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    pause,
    resume,
    playNext,
    playPrevious,
    setShowPlaylist,
    currentAudioQuality,
    availableAudioQualities,
  } = usePlayer();
  const router = useRouter();

  const isTabPage = router.path === '/pages/index/index' ||
                    router.path === '/pages/library/index' ||
                    router.path === '/pages/personal/index';

  const hasCustomBottomTab = [
    '/pages/album/index',
    '/pages/artist/index',
    '/pages/playlist/index',
    '/pages/folder/index',
    '/pages/collection/index',
    '/pages/tts/tasks/index',
    '/pages/tts/create/index'
  ].includes(router.path);

  if (!currentTrack) return null;

  const handlePlayPause = (e) => {
    e.stopPropagation();
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  // 占位图各文件不同，这里绑死；调用点传显示尺寸（rpx 值 ≈ 目标设备像素，见 utils/image.ts）
  const getImageUrl = (url: string | null, width = 300) =>
    buildImageUrl(url, "https://picsum.photos/100", width);
  return (
    <>
      <View
        className={`mini-player-container ${isTabPage ? 'is-native-tab-page' : ''} ${hasCustomBottomTab ? 'has-custom-bottom-tab' : ''}`}
        onClick={() => Taro.navigateTo({ url: '/pages/player/index' })}
      >
        <View className='mini-content'>
          <View className='mini-info-container'>
            <Image
              src={getImageUrl(currentTrack.cover, 128)}
              className='mini-cover'
              mode='aspectFill' webp
            />
            <View className='mini-info'>
              <Text className='mini-title' numberOfLines={1}>{currentTrack.name}</Text>
              <View className='mini-artist-row'>
                <Text className='mini-artist' numberOfLines={1}>{currentTrack.artist}</Text>
                {currentTrack.type !== 'AUDIOBOOK' && (
                  <View className='mini-quality-badge'>
                    <Text className='mini-quality-text' numberOfLines={1}>
                      {availableAudioQualities.find((item) => item.quality === currentAudioQuality)?.label || '无损'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          <View className='mini-controls'>
            <View className='mini-btn' onClick={(e) => { e.stopPropagation(); playPrevious(); }}>
              <Text className='mini-icon icon icon-prev' />
            </View>
            <View className='mini-btn mini-play-btn' onClick={handlePlayPause}>
              <Text className={`mini-icon icon ${isPlaying ? 'icon-pause' : 'icon-play'}`} />
            </View>
            <View className='mini-btn' onClick={(e) => { e.stopPropagation(); playNext(); }}>
              <Text className='mini-icon icon icon-next' />
            </View>
            <View className='mini-btn' onClick={(e) => { e.stopPropagation(); setShowPlaylist(true); }}>
              <Text className='mini-icon icon icon-list' />
            </View>
          </View>
        </View>
        <PlaylistModal />
      </View>
    </>
  );
};

export default MiniPlayer;
