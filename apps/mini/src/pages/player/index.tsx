import { getFavoriteTracks, toggleTrackLike, toggleTrackUnLike } from '@soundx/services';
import { Image, ScrollView, Slider, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';
import AddToPlaylistModal from '../../components/AddToPlaylistModal';
import PlaylistModal from '../../components/PlaylistModal';
import { useAuth } from '../../context/AuthContext';
import { usePlayer } from '../../context/PlayerContext';
import { usePlayMode } from '../../utils/playMode';
import { getBaseURL } from '../../utils/request';
import './index.scss';

// Match mobile lyric line interface
interface LyricLine {
  time: number;
  text: string;
}

// Match mobile parseLyrics logic
const parseLyrics = (lyrics: string): LyricLine[] => {
  if (!lyrics) return [];

  const lines = lyrics.split('\n');
  const parsed: LyricLine[] = [];

  for (const line of lines) {
    const match = line.match(/\[(\d+):(\d+)(?:\.(\d+))?\](.*)/);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const milliseconds = match[3] ? parseInt(match[3]) : 0;
      const time = minutes * 60 + seconds + milliseconds / 1000;
      const text = match[4].trim();

      if (text) {
        parsed.push({ time, text });
      }
    } else if (line.trim() && !line.startsWith('[')) {
      parsed.push({ time: 0, text: line.trim() });
    }
  }

  return parsed.sort((a, b) => a.time - b.time);
};

export default function Player() {
  const { currentTrack, isPlaying, pause, resume, playNext, playPrevious, duration, currentTime, seek, setShowPlaylist } = usePlayer();
  const { mode, setMode } = usePlayMode();
  const { user } = useAuth();
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const [liked, setLiked] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [controlsBottomOffset, setControlsBottomOffset] = useState(0);
  const [showControlsOffsetModal, setShowControlsOffsetModal] = useState(false);

  useEffect(() => {
    if (currentTrack && currentTrack.lyrics) {
        setLyrics(parseLyrics(currentTrack.lyrics));
    } else {
        setLyrics([]);
    }
  }, [currentTrack]);

  useEffect(() => {
    if (lyrics.length > 0) {
      const activeIndex = lyrics.findIndex((line, index) => {
        return (
          line.time <= currentTime &&
          (index === lyrics.length - 1 || lyrics[index + 1].time > currentTime)
        );
      });

      if (activeIndex !== -1 && activeIndex !== currentLyricIndex) {
        setCurrentLyricIndex(activeIndex);
      }
    }
  }, [currentTime, lyrics, currentLyricIndex]);

  // Load controlsBottomOffset from storage
  useEffect(() => {
    Taro.getStorage({ key: 'player_controls_bottom_offset' }).then((res) => {
      const val = parseFloat(res.data);
      if (!Number.isNaN(val)) {
        setControlsBottomOffset(val);
      }
    }).catch(() => {});
  }, []);

  // Save controlsBottomOffset to storage when changed
  useEffect(() => {
    Taro.setStorage({ key: 'player_controls_bottom_offset', data: String(controlsBottomOffset) }).catch(() => {});
  }, [controlsBottomOffset]);

  // Check if current track is liked
  useEffect(() => {
    const checkLikedStatus = async () => {
      if (!currentTrack || !user) {
        setLiked(false);
        return;
      }
      try {
        const res = await getFavoriteTracks(user.id, 0, 100, mode);
        if (res.code === 200) {
          const isLiked = res.data.list.some((item: any) => item.track?.id === currentTrack.id);
          setLiked(isLiked);
        }
      } catch (error) {
        console.error('Failed to check liked status:', error);
      }
    };
    checkLikedStatus();
  }, [currentTrack, user, mode]);

  const handleToggleLike = async () => {
    if (!currentTrack || !user) return;
    const previousLiked = liked;
    setLiked(!liked);

    try {
      if (previousLiked) {
        await toggleTrackUnLike(Number(currentTrack.id), user.id);
      } else {
        await toggleTrackLike(Number(currentTrack.id), user.id);
      }
    } catch (error) {
      console.error('Failed to toggle like', error);
      setLiked(previousLiked);
      Taro.showToast({ title: '操作失败', icon: 'none' });
    }
  };

  const handleNavigateToArtist = () => {
    if (!currentTrack?.artistId) return;
    setShowMoreMenu(false);
    Taro.navigateTo({ url: `/pages/artist/index?id=${currentTrack.artistId}` });
  };

  const handleNavigateToAlbum = () => {
    if (!currentTrack?.albumId) return;
    setShowMoreMenu(false);
    Taro.navigateTo({ url: `/pages/album/index?id=${currentTrack.albumId}` });
  };

  const handleShowTrackProperty = async () => {
    if (!currentTrack) return;
    setShowMoreMenu(false);
    await Taro.showModal({
      title: `曲目属性 · ${currentTrack.name}`,
      content: currentTrack.path?.trim() || '暂无文件路径',
      showCancel: false,
      confirmText: '关闭',
    });
  };

  const handleSkip = (seconds: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    seek(newTime);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    // TODO: Implement actual playback speed change via audio context
    Taro.showToast({ title: `倍速: ${speed}x`, icon: 'none' });
  };

  const getImageUrl = (url: string | null) => {
    if (!url) return `https://picsum.photos/400/400`;
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

  if (!currentTrack) return (
    <View className='player-page'>
      <View className='player-container empty'>
        <Text>No track playing</Text>
        <View onClick={() => Taro.navigateBack()} className='back-link'>Go Back</View>
      </View>
    </View>
  );

  return (
    <View className='player-page'>
      <View className='player-container'>
        <View className='player-header'>
            <View className='player-header-btn' onClick={() => Taro.navigateBack()}>
                <Text className='player-icon-btn icon icon-down' />
            </View>
            <View className='player-header-btn' onClick={() => {/* more modal */}}>
                <Text className='player-icon-btn icon icon-more-v' />
            </View>
        </View>

        <View className='player-content'>
            <View className='player-artwork-lyric-area' onClick={() => setShowLyrics(!showLyrics)}>
                {!showLyrics ? (
                    <View className='player-artwork-container'>
                        <Image 
                            src={getImageUrl(currentTrack.cover)} 
                            className='player-artwork' 
                            mode='aspectFill'
                        />
                    </View>
                ) : (
                    <View className='player-lyrics-container'>
                        {lyrics.length > 0 ? (
                            <ScrollView 
                                scrollY 
                                className='player-lyrics-scroll' 
                                scrollIntoView={`line-${currentLyricIndex > 3 ? currentLyricIndex - 3 : 0}`}
                                scrollWithAnimation
                            >
                                {lyrics.map((line, index) => (
                                    <View key={index} id={`line-${index}`} className={`player-lyric-line ${index === currentLyricIndex ? 'active' : ''}`}>
                                        <Text className='player-lyric-text'>{line.text}</Text>
                                    </View>
                                ))}
                            </ScrollView>
                        ) : (
                            <View className='player-no-lyrics'>
                                <Text>暂无歌词</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>

            <View className='player-bottom-controls' style={{ marginBottom: controlsBottomOffset }}>
                <View className='player-info-row'>
                    <View className='player-track-info'>
                        <Text className='player-track-title' numberOfLines={1}>{currentTrack.name}</Text>
                        <Text className='player-track-artist' numberOfLines={1}>{currentTrack.artist}</Text>
                    </View>
                    <View className='player-action-btns'>
                        <View className='player-action-btn' onClick={handleToggleLike}>
                            <Text className={`player-action-icon icon ${liked ? 'icon-heart-filled' : 'icon-heart'}`} />
                        </View>
                        <View className='player-action-btn' onClick={() => setShowMoreMenu(!showMoreMenu)}>
                            <Text className='player-action-icon icon icon-more-h' />
                        </View>
                    </View>
                </View>

                <View className='player-progress-area'>
                    <View className='player-time-container'>
                        <Text className='player-time-text'>{formatTime(currentTime)}</Text>
                        <Slider 
                            className='player-slider' 
                            min={0} 
                            max={duration} 
                            value={currentTime} 
                            onChange={handleSliderChange}
                            activeColor='#333'
                            backgroundColor='#eee'
                            blockSize={12}
                        />
                        <Text className='player-time-text'>{formatTime(duration)}</Text>
                    </View>
                </View>

                <View className='player-controls'>
                    {mode === 'AUDIOBOOK' ? (
                        <View className='player-audiobook-controls'>
                            <View className='player-ctrl-btn' onClick={() => handleSkip(-15)}>
                                <Text className='player-ctrl-icon-small'>-15s</Text>
                            </View>
                            <View className='player-main-ctrls'>
                                <View className='player-ctrl-btn' onClick={playPrevious}>
                                    <Text className='player-ctrl-icon icon icon-prev' />
                                </View>
                                <View className='player-play-pause-btn player-ctrl-btn' onClick={isPlaying ? pause : resume}>
                                    <Text className={`player-ctrl-icon-large icon ${isPlaying ? 'icon-pause' : 'icon-play'}`} />
                                </View>
                                <View className='player-ctrl-btn' onClick={playNext}>
                                    <Text className='player-ctrl-icon icon icon-next' />
                                </View>
                            </View>
                            <View className='player-ctrl-btn' onClick={() => handleSkip(15)}>
                                <Text className='player-ctrl-icon-small'>+15s</Text>
                            </View>
                        </View>
                    ) : (
                        <>
                            <View className='player-ctrl-btn' onClick={() => setMode(mode === 'MUSIC' ? 'AUDIOBOOK' : 'MUSIC')}>
                                <Text className={`player-ctrl-icon-small icon ${mode === 'MUSIC' ? 'icon-repeat' : 'icon-headset'}`} />
                            </View>
                            <View className='player-main-ctrls'>
                                <View className='player-ctrl-btn' onClick={playPrevious}>
                                    <Text className='player-ctrl-icon icon icon-prev' />
                                </View>
                                <View className='player-play-pause-btn player-ctrl-btn' onClick={isPlaying ? pause : resume}>
                                    <Text className={`player-ctrl-icon-large icon ${isPlaying ? 'icon-pause' : 'icon-play'}`} />
                                </View>
                                <View className='player-ctrl-btn' onClick={playNext}>
                                    <Text className='player-ctrl-icon icon icon-next' />
                                </View>
                            </View>
                            <View className='player-ctrl-btn' onClick={() => setShowPlaylist(true)}>
                                <Text className='player-ctrl-icon-small icon icon-list' />
                            </View>
                        </>
                    )}
                </View>
            </View>
        </View>

        {showMoreMenu && (
          <View className='player-more-menu-mask' onClick={() => setShowMoreMenu(false)}>
            <View className='player-more-menu-content' onClick={(e) => e.stopPropagation()}>
              <View className='player-menu-item' onClick={() => { setShowMoreMenu(false); setShowAddToPlaylist(true); }}>
                <Text className='player-menu-item-text'>添加到播放列表</Text>
              </View>
              <View className='player-menu-item' onClick={() => { setShowMoreMenu(false); setShowTimerMenu(true); }}>
                <Text className='player-menu-item-text'>定时播放</Text>
              </View>
              {currentTrack?.artistId && (
                <View className='player-menu-item' onClick={handleNavigateToArtist}>
                  <Text className='player-menu-item-text'>歌手详情</Text>
                </View>
              )}
              {currentTrack?.albumId && (
                <View className='player-menu-item' onClick={handleNavigateToAlbum}>
                  <Text className='player-menu-item-text'>专辑详情</Text>
                </View>
              )}
              <View className='player-menu-item' onClick={handleShowTrackProperty}>
                <Text className='player-menu-item-text'>属性</Text>
              </View>
              <View className='player-menu-item' onClick={() => { setShowMoreMenu(false); setShowControlsOffsetModal(true); }}>
                <Text className='player-menu-item-text'>控制组位置调整</Text>
              </View>
              {mode === 'AUDIOBOOK' && (
                <View className='player-menu-section'>
                  <View className='player-menu-section-title'>
                    <Text className='player-section-title-text'>播放速度</Text>
                  </View>
                  <View className='player-speed-options'>
                    {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((speed) => (
                      <View
                        key={speed}
                        className={`player-speed-btn ${playbackSpeed === speed ? 'active' : ''}`}
                        onClick={() => { handleSpeedChange(speed); setShowMoreMenu(false); }}
                      >
                        <Text className={`player-speed-text ${playbackSpeed === speed ? 'active' : ''}`}>{speed}x</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              <View className='player-menu-item' onClick={() => setShowMoreMenu(false)}>
                <Text className='player-menu-item-text cancel'>取消</Text>
              </View>
            </View>
          </View>
        )}

        <AddToPlaylistModal visible={showAddToPlaylist} onClose={() => setShowAddToPlaylist(false)} />
        <PlaylistModal />

        {showControlsOffsetModal && (
          <View className='player-more-menu-mask' onClick={() => setShowControlsOffsetModal(false)}>
            <View className='player-more-menu-content' onClick={(e) => e.stopPropagation()}>
              <View className='player-controls-offset-modal'>
                <View className='player-modal-title-row'>
                  <Text className='player-modal-title'>控制组位置调整</Text>
                </View>
                <View className='player-modal-description-row'>
                  <Text className='player-modal-description'>调整播放控制按钮距离屏幕底部的位置</Text>
                </View>
                <View className='player-slider-panel'>
                  <View className='player-slider-header'>
                    <Text className='player-slider-label'>底部偏移</Text>
                    <Text className='player-slider-number'>{Math.round(controlsBottomOffset)}</Text>
                  </View>
                  <Slider
                    className='player-offset-slider'
                    min={0}
                    max={120}
                    step={1}
                    value={controlsBottomOffset}
                    onChange={(e) => setControlsBottomOffset(e.detail.value)}
                    activeColor='#007aff'
                    backgroundColor='#eee'
                    blockSize={16}
                  />
                  <View className='player-slider-hint-row'>
                    <Text className='player-slider-hint'>贴近底部</Text>
                    <Text className='player-slider-hint'>上移</Text>
                  </View>
                </View>
                <View className='player-modal-actions'>
                  <View className='player-modal-btn player-modal-cancel-btn' onClick={() => { setControlsBottomOffset(0); setShowControlsOffsetModal(false); }}>
                    <Text className='player-modal-cancel-text'>重置</Text>
                  </View>
                  <View className='player-modal-btn player-modal-confirm-btn' onClick={() => setShowControlsOffsetModal(false)}>
                    <Text className='player-modal-confirm-text'>完成</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
