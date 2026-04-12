import { Image, Slider, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import React, { useState } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { getBaseURL } from '../../utils/request';
import PlaylistModal from '../PlaylistModal';
import './index.scss';

const MiniPlayer: React.FC = () => {
  const { currentTrack, isPlaying, pause, resume, playNext, playPrevious, setShowPlaylist, currentTime, duration, seek } = usePlayer();
  const router = useRouter();
  
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  
  const tabPages = ['/pages/index/index', '/pages/library/index', '/pages/personal/index'];
  const isTabPage = tabPages.indexOf(router.path) > -1;

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

  const formatTime = (seconds: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSliderChange = (e) => {
    const val = e.detail.value;
    seek(val);
  };

  const handleClosePlayer = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowFullPlayer(false);
      setIsClosing(false);
    }, 300);
  };

  return (
    <>
      <View className={`mini-player-container ${isTabPage ? 'is-tab-page' : ''}`} onClick={() => setShowFullPlayer(true)}>
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
            <View className='mini-btn play-btn' onClick={handlePlayPause}>
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

      {showFullPlayer && (
        <View className={`full-player-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClosePlayer}>
          <View className={`full-player-container ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
            <View className='header'>
              <View className='header-btn' onClick={handleClosePlayer}>
                <Text className='icon-btn icon icon-down' />
              </View>
              <View className='header-btn'>
                <Text className='icon-btn icon icon-more-v' />
              </View>
            </View>

            <View className='content'>
              <View className='artwork-lyric-area' onClick={() => setShowLyrics(!showLyrics)}>
                <View className='artwork-container'>
                  <Image 
                    src={getImageUrl(currentTrack.cover)} 
                    className='artwork' 
                    mode='aspectFill'
                  />
                </View>
              </View>

              <View className='bottom-controls'>
                <View className='info-row'>
                  <View className='track-info'>
                    <Text className='track-title' numberOfLines={1}>{currentTrack.name}</Text>
                    <Text className='track-artist' numberOfLines={1}>{currentTrack.artist}</Text>
                  </View>
                </View>

                <View className='progress-area'>
                  <View className='time-container'>
                    <Text className='time-text'>{formatTime(currentTime)}</Text>
                    <Slider 
                      className='slider'
                      value={currentTime}
                      min={0}
                      max={duration || 100}
                      onChange={handleSliderChange}
                    />
                    <Text className='time-text'>{formatTime(duration)}</Text>
                  </View>
                </View>

                <View className='player-controls'>
                  <View className='main-ctrls'>
                    <View className='ctrl-btn' onClick={playPrevious}>
                      <Text className='ctrl-icon icon icon-prev' />
                    </View>
                    <View className='play-pause-btn' onClick={handlePlayPause}>
                      <Text className={`ctrl-icon-large icon ${isPlaying ? 'icon-pause' : 'icon-play'}`} />
                    </View>
                    <View className='ctrl-btn' onClick={playNext}>
                      <Text className='ctrl-icon icon icon-next' />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}
    </>
  );
};

export default MiniPlayer;