import { Album, AlbumTrackSortBy, Track, getAlbumById, getAlbumTracks, Mv, getMvsByAlbum } from '@soundx/services';
import { Image, ScrollView, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MiniPlayer from '../../components/MiniPlayer';
import QuickLocate from '../../components/QuickLocate';
import { useAuth } from '../../context/AuthContext';
import { usePlayer } from '../../context/PlayerContext';
import { getBaseURL } from '../../utils/request';
import './index.scss';
import BottomTabBar from '../../components/BottomTabBar';

export default function AlbumDetail() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = router.params;
  const { playTrackList, currentTrack, isPlaying } = usePlayer();
  const { user } = useAuth();

  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [mvs, setMvs] = useState<Mv[]>([]);
  const [activeTab, setActiveTab] = useState<'tracks' | 'mvs'>('tracks');
  const [loading, setLoading] = useState(true);
  const [scrollIntoView, setScrollIntoView] = useState('');
  const [sortBy, setSortBy] = useState<AlbumTrackSortBy>('episodeNumber');

  useEffect(() => {
    if (id) {
      loadData(Number(id), sortBy);
    }
  }, [id, sortBy]);

  const loadData = async (albumId: number, currentSortBy: AlbumTrackSortBy) => {
    setLoading(true);
    try {
      const [albumRes, tracksRes] = await Promise.all([
          getAlbumById(albumId),
          getAlbumTracks(albumId, 200, 0, 'asc', undefined, user?.id, currentSortBy)
      ]);

      if (albumRes.code === 200) {
        setAlbum(albumRes.data);
        if (albumRes.data?.name) {
          getMvsByAlbum(albumRes.data.name, albumRes.data.artist).then((res: any) => {
            if (res?.length) setMvs(res);
          }).catch((e: any) => console.error(e));
        }
      }
      if (tracksRes.code === 200) setTracks(tracksRes.data.list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (url: string | null) => {
    if (!url) return `https://picsum.photos/300/300`;
    if (url.startsWith('http')) return url;
    return `${getBaseURL()}${url}`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString()}`;
  };

  const handlePlayAll = () => {
      if (tracks.length > 0) {
          playTrackList(tracks as any, 0);
      }
  };

  const cycleSortBy = () => {
    const sequence: AlbumTrackSortBy[] = ['episodeNumber', 'index', 'fileName', 'fileCreatedAt', 'fileModifiedAt', 'scanOrder', 'id'];
    const next = sequence[(sequence.indexOf(sortBy) + 1) % sequence.length];
    setSortBy(next);
  };

  const getSortLabel = () => {
    if (sortBy === 'id') return t('albumPage.sortAdded');
    if (sortBy === 'index') return t('albumPage.sortAlbum');
    if (sortBy === 'fileName') return t('albumPage.sortFileName');
    if (sortBy === 'fileCreatedAt') return t('albumPage.sortFileCreatedAt');
    if (sortBy === 'fileModifiedAt') return t('albumPage.sortFileModifiedAt');
    if (sortBy === 'scanOrder') return t('albumPage.sortScanOrder');
    return t('albumPage.sortOptimized');
  };

  const scrollToAnchor = (anchorId: string) => {
    setScrollIntoView('');
    setTimeout(() => setScrollIntoView(anchorId), 0);
  };

  const handleLocateCurrent = () => {
    if (!currentTrack || tracks.length === 0) return;
    const index = tracks.findIndex((item) => item.id === currentTrack.id);
    if (index > -1) {
      scrollToAnchor(`track-${index}`);
    }
  };

  if (loading) return <View className='loading'><Text>{t('common.loading')}</Text></View>;
  if (!album) return <View className='error'><Text>{t('common.noData')}</Text></View>;

  return (
    <View className='album-container'>
         <View className='nav-bar'>
             <View className='back-btn' onClick={() => Taro.navigateBack()}>
                 <Text className='back-icon icon icon-back' />
             </View>
         </View>
         <ScrollView scrollY className='content-scroll' scrollWithAnimation scrollIntoView={scrollIntoView}>
             <View id='top-anchor' />
             <View className='header'>
                 <Image src={getImageUrl(album.cover)} className='cover' mode='aspectFill' />
                 <Text className='title'>{album.name}</Text>
                 <Text className='artist'>{album.artist}</Text>
                 
                 <View className='actions'>
                     {activeTab === 'tracks' && (
                       <View className='album-play-all-btn' onClick={handlePlayAll}>
                           <Text className='album-play-icon icon icon-play' />
                           <Text className='album-play-text'>{t('album.playAll')}</Text>
                       </View>
                     )}
                     <View className='like-btn'>
                         <Text className='like-icon icon icon-heart' />
                     </View>
                 </View>
             </View>

             {mvs.length > 0 && (
               <View className='tabs'>
                 <View 
                   className={`tab-item ${activeTab === 'tracks' ? 'active' : ''}`}
                   onClick={() => setActiveTab('tracks')}
                 >
                   <Text className='tab-text'>{t('nav.tracks')} ({tracks.length})</Text>
                 </View>
                 <View 
                   className={`tab-item ${activeTab === 'mvs' ? 'active' : ''}`}
                   onClick={() => setActiveTab('mvs')}
                 >
                   <Text className='tab-text'>MV ({mvs.length})</Text>
                 </View>
               </View>
             )}

             {activeTab === 'tracks' && (
               <View className='sort-bar'>
                 <Text className='sort-label'>{getSortLabel()}</Text>
                 <View className='sort-button' onClick={cycleSortBy}>
                   <Text className='sort-button-text'>{t('common.switch')}</Text>
                 </View>
               </View>
             )}

             <View className='track-list'>
                 {activeTab === 'mvs' ? (
                   mvs.map((mv, index) => (
                     <View 
                        key={mv.id} 
                        className='track-item'
                        onClick={() => Taro.navigateTo({ url: `/pages/mv/index?id=${mv.id}` })}
                     >
                        <View className='track-idx-container'>
                            <Text className='track-index'>{index + 1}</Text>
                        </View>
                        <Image src={getImageUrl(mv.cover)} className='track-cover mv-cover' mode='aspectFill' style={{ width: '80rpx', height: '60rpx', borderRadius: '8rpx' }} />
                        <View className='track-info' style={{ marginLeft: '20rpx' }}>
                            <Text className='track-name' numberOfLines={1}>{mv.name}</Text>
                        </View>
                        <Text className='track-duration'>{formatDuration(mv.duration || 0)}</Text>
                     </View>
                   ))
                 ) : (
                   tracks.map((track, index) => (
                       <View 
                          key={track.id} 
                          id={`track-${index}`}
                          className='track-item'
                          onClick={() => playTrackList(tracks as any, index)}
                       >
                          <View className='track-idx-container'>
                              {currentTrack?.id === track.id && isPlaying ? (
                                  <Text className='active-icon icon icon-music' />
                              ) : (
                                  <Text className={`track-index ${currentTrack?.id === track.id ? 'active' : ''}`}>{index + 1}</Text>
                              )}
                          </View>
                           <Image src={getImageUrl(track.cover)} className='track-cover' mode='aspectFill' />
                           <View className='track-info'>
                               <Text className={`track-name ${currentTrack?.id === track.id ? 'active' : ''}`} numberOfLines={1}>{track.name}</Text>
                           </View>
                           <Text className='track-duration'>{formatDuration(track.duration || 0)}</Text>
                       </View>
                   ))
                 )}
             </View>

             <View id='bottom-anchor' />
             <View style={{ height: '260rpx' }}></View>
         </ScrollView>
         <QuickLocate
            onTop={() => scrollToAnchor('top-anchor')}
            onBottom={() => scrollToAnchor('bottom-anchor')}
            onLocate={handleLocateCurrent}
            locateDisabled={!currentTrack || !tracks.some((item) => item.id === currentTrack.id)}
         />
      <BottomTabBar />
      <MiniPlayer />
    </View>
  );
}
