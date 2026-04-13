import {
  createCompactTask,
  createImportTask,
  createPlaylist,
  getAlbumHistory,
  getFavoriteAlbums,
  getFavoriteTracks,
  getImportTask,
  getPlaylists,
  getRunningImportTask,
  getTrackHistory,
  ImportTask,
  TaskStatus,
} from '@soundx/services';
import { Image, Input, ScrollView, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useEffect, useRef, useState } from 'react';
import MiniPlayer from '../../components/MiniPlayer';
import StackedCover from '../../components/StackedCover';
import { useAuth } from '../../context/AuthContext';
import { usePlayer } from '../../context/PlayerContext';
import { usePlayMode } from '../../utils/playMode';
import { getBaseURL } from '../../utils/request';
import './index.scss';

type TabType = 'playlists' | 'favorites' | 'history' | 'downloads';
type SubTabType = 'track' | 'album';

export default function Personal() {
  const { user, logout } = useAuth();
  const { mode } = usePlayMode();
  const { playTrackList } = usePlayer();

  const [activeTab, setActiveTab] = useState<TabType>('playlists');
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('track');
  const [loading, setLoading] = useState(false);
  const [sourceType, setSourceType] = useState('AudioDock');

  const [playlists, setPlaylists] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [downloads] = useState<any[]>([]);

  const [showMenu, setShowMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creating, setCreating] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importTask, setImportTask] = useState<ImportTask | null>(null);
  const pollTimerRef = useRef<any>(null);

  const refreshSourceType = () => {
    setSourceType(Taro.getStorageSync('currentSourceType') || 'AudioDock');
  };

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (activeTab === 'playlists') {
        const res = await getPlaylists(mode as any, user.id);
        if (res.code === 200) setPlaylists(res.data);
      } else if (activeTab === 'favorites') {
        if (mode === 'MUSIC' && activeSubTab === 'track') {
          const res = await getFavoriteTracks(user.id, 0, 1000, mode as any);
          if (res.code === 200) setFavorites(res.data.list.map((item: any) => item.track));
        } else {
          const res = await getFavoriteAlbums(user.id, 0, 1000, mode as any);
          if (res.code === 200) setFavorites(res.data.list.map((item: any) => item.album));
        }
      } else if (activeTab === 'history') {
        if (mode === 'MUSIC' && activeSubTab === 'track') {
          const res = await getTrackHistory(user.id, 0, 1000, mode as any);
          if (res.code === 200) setHistory(res.data.list.map((item: any) => item.track));
        } else {
          const res = await getAlbumHistory(user.id, 0, 1000, mode as any);
          if (res.code === 200) setHistory(res.data.list.map((item: any) => item.album));
        }
      }
    } catch (error) {
      console.error('Failed to load personal data:', error);
    } finally {
      setLoading(false);
    }
  };

  useDidShow(() => {
    refreshSourceType();
    if (user) {
      loadData();
    }
  });

  useEffect(() => {
    refreshSourceType();
  }, []);

  useEffect(() => {
    if (sourceType === 'Emby' && activeTab === 'history') {
      setActiveTab('playlists');
    }
  }, [sourceType, activeTab]);

  useEffect(() => {
    if (user && activeTab !== 'downloads') {
      loadData();
    }
  }, [activeTab, activeSubTab, mode, user]);

  const pollTaskStatus = async (taskId: string) => {
    try {
      const res = await getImportTask(taskId);
      if (res.code === 200 && res.data) {
        setImportTask(res.data);
        if (res.data.status === TaskStatus.SUCCESS) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setTimeout(() => setShowImportModal(false), 2000);
          loadData();
        } else if (res.data.status === TaskStatus.FAILED) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        }
      }
    } catch (error) {
      console.error('Poll error:', error);
    }
  };

  useEffect(() => {
    if (user) {
      getRunningImportTask().then((res) => {
        if (res.code === 200 && res.data) {
          const taskId = res.data.id;
          setImportTask(res.data);
          setShowImportModal(true);
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          pollTimerRef.current = setInterval(() => pollTaskStatus(taskId), 1500);
        }
      });
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [user]);

  const handleCreatePlaylist = async () => {
    if (!user || !newPlaylistName.trim()) return;
    setCreating(true);
    try {
      const res = await createPlaylist(newPlaylistName.trim(), mode as any, user.id);
      if (res.code === 200) {
        setShowCreateModal(false);
        setNewPlaylistName('');
        await loadData();
        Taro.navigateTo({ url: `/pages/playlist/index?id=${res.data.id}` });
      } else {
        Taro.showToast({ title: res.message || '创建失败', icon: 'none' });
      }
    } catch (error) {
      Taro.showToast({ title: '创建失败', icon: 'none' });
    } finally {
      setCreating(false);
    }
  };

  const startImportTask = async (taskFactory: () => Promise<any>, initialMode: 'incremental' | 'full' | 'compact') => {
    try {
      const taskRes = await taskFactory();
      if (taskRes.code === 200 && taskRes.data) {
        const taskId = taskRes.data.id;
        setShowImportModal(true);
        setImportTask({
          id: taskId,
          status: TaskStatus.INITIALIZING,
          mode: initialMode,
          message: initialMode === 'compact' ? '正在启动精简任务...' : '正在初始化...',
        } as ImportTask);
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        pollTimerRef.current = setInterval(() => pollTaskStatus(taskId), 1500);
      } else {
        Taro.showToast({ title: taskRes.message || '任务创建失败', icon: 'none' });
      }
    } catch (error) {
      Taro.showToast({ title: '任务创建失败', icon: 'none' });
    }
  };

  const handleOpenTtsTasks = async () => {
    setShowMenu(false);

    const isVipStr = Taro.getStorageSync('plus_vip_status');
    const isVip = isVipStr === 'true';

    if (isVip) {
      Taro.navigateTo({ url: '/pages/tts/tasks/index' });
      return;
    }

    const modalRes = await Taro.showModal({
      title: '会员功能',
      content: '开通会员才能使用 TTS 有声书转换功能',
      confirmText: '去开通',
      cancelText: '取消',
    });

    if (modalRes.confirm) {
      Taro.navigateTo({ url: '/pages/member/benefits/index' });
    }
  };

  const handleUpdateLibrary = async (updateMode: 'incremental' | 'full' | 'compact') => {
    setShowMenu(false);
    const contentMap = {
      incremental: '增量更新只增加新数据，不删除旧数据',
      full: '全量更新会完整扫描音频文件，用于修正库数据',
      compact: '精简数据会清理失效记录并校验文件状态',
    };
    const titleMap = {
      incremental: '确认增量更新？',
      full: '确认全量更新？',
      compact: '确认精简数据？',
    };

    const modalRes = await Taro.showModal({
      title: titleMap[updateMode],
      content: contentMap[updateMode],
    });

    if (!modalRes.confirm) return;

    await startImportTask(
      () => (updateMode === 'compact' ? createCompactTask() : createImportTask({ mode: updateMode })),
      updateMode,
    );
  };

  const getImageUrl = (url: string | null) => {
    if (!url) return 'https://picsum.photos/100/100';
    if (url.startsWith('http')) return url;
    return `${getBaseURL()}${url}`;
  };

  const getListData = () => {
    if (activeTab === 'playlists') return playlists;
    if (activeTab === 'favorites') return favorites;
    if (activeTab === 'history') return history;
    return downloads;
  };

  const getEmptyText = () => {
    if (activeTab === 'downloads') {
      return '小程序暂不支持离线下载管理';
    }
    return loading ? '加载中...' : '暂无数据';
  };

  const renderList = () => {
    const data = getListData();

    if (data.length === 0) {
      return <View className='center-msg'><Text>{getEmptyText()}</Text></View>;
    }

    return data.map((item) => {
      const isPlaylist = activeTab === 'playlists';
      const isAlbum = activeTab !== 'playlists' && activeTab !== 'downloads' && (mode === 'AUDIOBOOK' || activeSubTab === 'album');

      return (
        <View
          key={`${item.id}-${activeTab}`}
          className='item-row'
          onClick={() => {
            if (activeTab === 'downloads') return;

            if (isPlaylist) {
              Taro.navigateTo({ url: `/pages/playlist/index?id=${item.id}` });
            } else if (isAlbum) {
              Taro.navigateTo({ url: `/pages/album/index?id=${item.id}` });
            } else {
              const list = activeTab === 'favorites' ? favorites : history;
              const index = list.findIndex((track) => track.id === item.id);
              playTrackList(list, index);
            }
          }}
        >
          {isPlaylist ? (
            <StackedCover tracks={item.tracks || []} />
          ) : (
            <View className='cover-wrapper'>
              <Image src={getImageUrl(item.cover)} className='item-cover' mode='aspectFill' />
              {isAlbum && activeTab === 'history' && mode === 'AUDIOBOOK' && item.progress > 0 && (
                <View className='progress-bar-mini'>
                  <View className='progress-fill' style={{ width: `${item.progress}%` }} />
                </View>
              )}
            </View>
          )}
          <View className='item-info'>
            <Text className='item-name' numberOfLines={1}>{item.name}</Text>
            <Text className='item-sub' numberOfLines={1}>
              {isPlaylist
                ? `${item._count?.tracks || item.tracks?.length || 0} 首`
                : isAlbum
                  ? (item.artist || '')
                  : item.artist}
            </Text>
          </View>
        </View>
      );
    });
  };

  const importStatusText = () => {
    if (importTask?.message && importTask.status !== TaskStatus.SUCCESS && importTask.status !== TaskStatus.FAILED) {
      return importTask.message;
    }
    if (importTask?.status === TaskStatus.INITIALIZING) {
      return importTask?.mode === 'compact' ? '正在初始化精简任务...' : '正在初始化...';
    }
    if (importTask?.status === TaskStatus.PREPARING) return '正在准备环境...';
    if (importTask?.status === TaskStatus.PARSING) return '正在解析媒体文件...';
    if (importTask?.status === TaskStatus.SUCCESS) {
      return importTask?.mode === 'compact' ? '精简完成' : '入库完成';
    }
    if (importTask?.status === TaskStatus.FAILED) {
      return importTask?.mode === 'compact' ? '精简失败' : '入库失败';
    }
    return '准备中';
  };

  return (
    <View className='personal-container'>
      <View className='header-actions'>
        <View className='left-actions'>
          <View className='action-btn' onClick={() => setShowMenu(!showMenu)}>
            <Text className='icon icon-add' />
          </View>
          <View className='action-btn' onClick={() => Taro.navigateTo({ url: '/pages/scan/index' })}>
            <Text className='header-icon icon icon-scan' />
          </View>
        </View>
        {showMenu && (
          <View className='menu-dropdown'>
            <View className='menu-item' onClick={() => { setShowMenu(false); setShowCreateModal(true); }}>
              <Text>新建播放列表</Text>
            </View>
            <View className='menu-item' onClick={() => handleUpdateLibrary('incremental')}>
              <Text>增量更新音频文件</Text>
            </View>
            <View className='menu-item' onClick={() => handleUpdateLibrary('full')}>
              <Text>全量更新音频文件</Text>
            </View>
            {sourceType !== 'Emby' && mode !== 'MUSIC' && (
              <View className='menu-item' onClick={handleOpenTtsTasks}>
                <Text>TTS 有声书转换</Text>
              </View>
            )}
            <View className='menu-item' onClick={() => handleUpdateLibrary('compact')}>
              <Text>精简数据</Text>
            </View>
          </View>
        )}
        <View className='right-actions'>
          <View className='action-btn' onClick={() => Taro.navigateTo({ url: '/pages/source-manage/index' })}>
            <Text className='header-icon icon icon-server' />
          </View>
          <View className='action-btn' onClick={() => Taro.navigateTo({ url: '/pages/settings/index' })}>
            <Text className='icon icon-settings' />
          </View>
        </View>
      </View>

      <View className='user-profile'>
        <Image src={getImageUrl((user as any)?.avatar || null)} className='avatar' mode='aspectFill' />
        <Text className='username'>{user?.username || '未登录'}</Text>
        <Text className='source-tag'>{sourceType}</Text>
        {!user && <View className='login-btn' onClick={() => Taro.navigateTo({ url: '/pages/login/index' })}>去登录</View>}
      </View>

      <View className='tabs-row'>
        {[
          { key: 'playlists', label: '播放列表' },
          { key: 'favorites', label: '收藏' },
          { key: 'history', label: '听过', hidden: sourceType === 'Emby' },
          { key: 'downloads', label: '下载' },
        ]
          .filter((tab) => !tab.hidden)
          .map((tab) => (
            <View key={tab.key} className={`tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key as TabType)}>
              <Text>{tab.label}</Text>
            </View>
          ))}
      </View>

      {mode === 'MUSIC' && (activeTab === 'favorites' || activeTab === 'history') && (
        <View className='sub-tabs-row'>
          <View className={`sub-tab ${activeSubTab === 'album' ? 'active' : ''}`} onClick={() => setActiveSubTab('album')}>
            <Text>专辑</Text>
          </View>
          <View className={`sub-tab ${activeSubTab === 'track' ? 'active' : ''}`} onClick={() => setActiveSubTab('track')}>
            <Text>单曲</Text>
          </View>
        </View>
      )}

      <ScrollView scrollY className='list-scroll'>
        <View className='list-content'>
          {renderList()}
          <View className='page-bottom-spacer' />
        </View>
      </ScrollView>

      {showCreateModal && (
        <View className='modal-overlay' onClick={() => setShowCreateModal(false)}>
          <View className='modal-content' onClick={(e) => e.stopPropagation()}>
            <Text className='modal-title'>新建播放列表</Text>
            <Input
              className='modal-input'
              placeholder='请输入列表名称'
              value={newPlaylistName}
              onInput={(e) => setNewPlaylistName(e.detail.value)}
              focus
            />
            <View className='modal-btns'>
              <View className='modal-btn cancel' onClick={() => setShowCreateModal(false)}>取消</View>
              <View className='modal-btn confirm' onClick={handleCreatePlaylist}>
                {creating ? '创建中...' : '确定'}
              </View>
            </View>
          </View>
        </View>
      )}

      {showImportModal && (
        <View className='modal-overlay'>
          <View className='modal-content'>
            <Text className='modal-title'>{importTask?.mode === 'compact' ? '精简数据进度' : '库文件入库进度'}</Text>
            <View className='status-row'>
              <Text>状态：</Text>
              <Text className='status-val'>{importStatusText()}</Text>
            </View>
            <View className='progress-container'>
              <View
                className='progress-fill'
                style={{ width: `${importTask?.total ? Math.round((importTask.current || 0) / importTask.total * 100) : 0}%` }}
              />
            </View>
            <Text className='progress-text'>
              进度：{importTask?.current || 0} / {importTask?.total || 0}
            </Text>
            {importTask?.status === TaskStatus.FAILED && importTask?.message ? (
              <Text className='error-text'>{importTask.message}</Text>
            ) : null}
            <View className='modal-btns'>
              <View className='modal-btn single' onClick={() => setShowImportModal(false)}>后台运行</View>
            </View>
          </View>
        </View>
      )}

      <View className='logout-footer' onClick={logout}>
        <Text>退出登录</Text>
      </View>

      <MiniPlayer />
    </View>
  );
}
