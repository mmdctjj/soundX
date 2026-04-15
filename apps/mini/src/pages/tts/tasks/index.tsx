import { deleteTtsTask, getTtsTasks, pauseTtsTask, resumeTtsTask, TtsTask } from '@soundx/services';
import { Image, ScrollView, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MiniPlayer from '../../../components/MiniPlayer';
import './index.scss';
import BottomTabBar from '../../../components/BottomTabBar';

type FilterStatus = 'all' | 'pending' | 'processing' | 'completed' | 'paused' | 'failed';

const statusConfig = {
  completed: { color: '#52c41a', textKey: 'ttsTasks.completed' },
  failed: { color: '#ff4d4f', textKey: 'ttsTasks.failed' },
  processing: { color: '#faad14', textKey: 'ttsTasks.processing' },
  paused: { color: '#8c8c8c', textKey: 'ttsTasks.paused' },
  pending: { color: '#13c2c2', textKey: 'ttsTasks.pending' },
};

export default function TtsTasks() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<TtsTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const fetchTasks = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await getTtsTasks();
      setTasks(res.tasks || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks(true);
    const timer = setInterval(() => fetchTasks(false), 5000);
    return () => clearInterval(timer);
  }, [fetchTasks]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTasks(false);
  }, [fetchTasks]);

  const handleAction = async (action: string, id: string) => {
    try {
      if (action === 'delete') {
        const confirm = await Taro.showModal({
          title: t('ttsTasks.deleteTask'),
          content: t('ttsTasks.confirmDeleteTask'),
        });
        if (confirm.confirm) {
          await deleteTtsTask(id);
          fetchTasks(false);
        }
      } else if (action === 'pause') {
        await pauseTtsTask(id);
        fetchTasks(false);
      } else if (action === 'resume') {
        await resumeTtsTask(id);
        fetchTasks(false);
      }
    } catch (error) {
      console.error(`Failed to ${action} task:`, error);
      Taro.showToast({ title: t('ttsTasks.actionFailed'), icon: 'none' });
    }
  };

  const filteredTasks =
    filterStatus === 'all'
      ? tasks
      : tasks.filter((t) => t.status === filterStatus);

  const getStatusInfo = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    return config || { color: '#000000', textKey: '' };
  };

  const filterItems = [
    { labelKey: 'ttsTasks.all', value: 'all' as FilterStatus },
    { labelKey: 'ttsTasks.pending', value: 'pending' as FilterStatus },
    { labelKey: 'ttsTasks.processing', value: 'processing' as FilterStatus },
    { labelKey: 'ttsTasks.completed', value: 'completed' as FilterStatus },
    { labelKey: 'ttsTasks.paused', value: 'paused' as FilterStatus },
    { labelKey: 'ttsTasks.failed', value: 'failed' as FilterStatus },
  ];

  return (
    <View className='tts-tasks-container'>
      <View className='header'>
        <View className='back-btn' onClick={() => Taro.navigateBack()}>
          <Text className='back-icon'>←</Text>
        </View>
        <Text className='header-title'>{t('ttsTasks.title')}</Text>
        <View className='create-btn' onClick={() => Taro.navigateTo({ url: '/pages/tts/create/index' })}>
          <Text className='create-icon'>+</Text>
        </View>
      </View>

      <View className='filter-container'>
        <ScrollView scrollX enableFlex className='filter-scroll'>
          <View className='filter-list'>
            {filterItems.map((item) => (
              <View
                key={item.value}
                className={`filter-item ${filterStatus === item.value ? 'active' : ''}`}
                onClick={() => setFilterStatus(item.value)}
              >
                <Text className={`filter-text ${filterStatus === item.value ? 'active' : ''}`}>
                  {t(item.labelKey)}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView
        scrollY
        className='content-scroll'
        refresherEnabled
        onRefresherRefresh={onRefresh}
        refresherTriggered={refreshing}
      >
        {loading ? (
          <View className='loading-container'>
            <Text className='loading-text'>{t('common.loading')}</Text>
          </View>
        ) : filteredTasks.length === 0 ? (
          <View className='empty-container'>
            <Text className='empty-icon'>📄</Text>
            <Text className='empty-text'>{t('ttsTasks.noTasksYet')}</Text>
            <View
              className='empty-btn'
              onClick={() => Taro.navigateTo({ url: '/pages/tts/create/index' })}
            >
              <Text className='empty-btn-text'>{t('ttsTasks.createNow')}</Text>
            </View>
          </View>
        ) : (
          filteredTasks.map((item) => {
            const percent =
              Math.round((item.completed_chapters / item.total_chapters) * 100) || 0;
            const statusInfo = getStatusInfo(item.status);
            const createdDate = new Date(item.created_at);
            const dateStr = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}-${String(createdDate.getDate()).padStart(2, '0')}`;
            const timeStr = `${String(createdDate.getHours()).padStart(2, '0')}:${String(createdDate.getMinutes()).padStart(2, '0')}`;

            return (
              <View key={item.id} className='task-card'>
                <View className='task-header'>
                  <View className='task-info'>
                    <Text className='book-name' numberOfLines={1}>{item.book_name}</Text>
                    <Text className='author'>{item.author}</Text>
                  </View>
                  <View className='status-tag' style={{ backgroundColor: statusInfo.color + '20' }}>
                    <Text className='status-text' style={{ color: statusInfo.color }}>
                      {t(statusInfo.textKey)}
                    </Text>
                  </View>
                </View>

                <View className='progress-container'>
                  <View className='progress-bar-bg'>
                    <View
                      className='progress-bar-fill'
                      style={{ width: `${percent}%`, backgroundColor: statusInfo.color }}
                    />
                  </View>
                  <View className='progress-text-row'>
                    <Text className='progress-count'>{item.completed_chapters} / {item.total_chapters} {t('ttsTasks.chapters')}</Text>
                    <Text className='progress-percent'>{percent}%</Text>
                  </View>
                </View>

                <View className='divider' />

                <View className='action-row'>
                  <Text className='time'>{dateStr} {timeStr}</Text>
                  <View className='button-group'>
                    {(item.status === 'processing') && (
                      <View className='action-btn' onClick={() => handleAction('pause', item.id)}>
                        <Text className='action-icon'>⏸</Text>
                      </View>
                    )}
                    {(item.status === 'paused' || item.status === 'failed' || item.status === 'pending') && (
                      <View className='action-btn' onClick={() => handleAction('resume', item.id)}>
                        <Text className='action-icon'>{item.status === 'failed' ? '🔄' : '▶'}</Text>
                      </View>
                    )}
                    <View className='action-btn' onClick={() => handleAction('delete', item.id)}>
                      <Text className='action-icon delete'>🗑</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <BottomTabBar />
      <MiniPlayer />
    </View>
  );
}
