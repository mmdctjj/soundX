import { Image, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import React from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { getBaseURL } from '../../utils/request';
import PlaylistModal from '../PlaylistModal';
import './index.scss';

const MiniPlayer: React.FC = () => {
  const { currentTrack, isPlaying, pause, resume, playNext, playPrevious, setShowPlaylist } = usePlayer();
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

  const getImageUrl = (url: string | null) => {
    if (!url) return `https://picsum.photos/100`;
    if (url.startsWith('http')) return url;
    return `${getBaseURL()}${url}`;
  };

  return (
    <>
      <View
        className={`mini-player-container ${isTabPage ? 'is-native-tab-page' : ''} ${hasCustomBottomTab ? 'has-custom-bottom-tab' : ''}`}
        onClick={() => Taro.navigateTo({ url: '/pages/player/index' })}
      >
        <View className='mini-content'>
          <View className='mini-info-container'>
            <Image
              src={getImageUrl(currentTrack.cover)}
              className='mini-cover'
              mode='aspectFill'
            />
            <View className='mini-info'>
              <Text className='mini-title' numberOfLines={1}>{currentTrack.name}</Text>
              <Text className='mini-artist' numberOfLines={1}>{currentTrack.artist}</Text>
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
