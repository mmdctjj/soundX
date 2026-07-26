import { Input, Text, View } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import {
  getFileSources,
  saveFileSources,
  syncFileSources,
  getImportTask,
  type FileSources,
  type FileSourcesView,
} from '../../services/file-sources';
import './index.scss';

const FIELDS = [
  { key: 'musicDirs', labelKey: 'settings.fileSourcesMusic' },
  { key: 'audiobookDirs', labelKey: 'settings.fileSourcesAudiobook' },
  { key: 'mvDirs', labelKey: 'settings.fileSourcesMv' },
  { key: 'txtDirs', labelKey: 'settings.fileSourcesTxt' },
] as const;
type FieldKey = (typeof FIELDS)[number]['key'];

type SourceRow = {
  value: string;
  exists: boolean | null;
};
type SourceRows = Record<FieldKey, SourceRow[]>;

const normalize = (arr?: string[]) => (arr && arr.length > 0 ? arr : ['']);

const normalizeRows = (values?: string[], exists?: boolean[]): SourceRow[] =>
  normalize(values).map((value, idx) => ({
    value,
    exists: values && values.length > 0 ? exists?.[idx] ?? null : null,
  }));

const rowsFromView = (view: FileSourcesView): SourceRows => ({
  musicDirs: normalizeRows(view.sources.musicDirs, view.exists.musicDirs),
  audiobookDirs: normalizeRows(
    view.sources.audiobookDirs,
    view.exists.audiobookDirs,
  ),
  mvDirs: normalizeRows(view.sources.mvDirs, view.exists.mvDirs),
  txtDirs: normalizeRows(view.sources.txtDirs, view.exists.txtDirs),
});

const emptyRows = (): SourceRows => ({
  musicDirs: [{ value: '', exists: null }],
  audiobookDirs: [{ value: '', exists: null }],
  mvDirs: [{ value: '', exists: null }],
  txtDirs: [{ value: '', exists: null }],
});

const truncatePath = (p: string) =>
  p.length <= 18 ? p : p.slice(0, 7) + '…' + p.slice(-10);

export default function FileSources() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [rows, setRows] = useState<SourceRows>(emptyRows);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<{
    current?: number;
    total?: number;
    message?: string;
  } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useLoad(() => {
    Taro.setNavigationBarTitle({ title: t('settings.fileSources') });
    Taro.setNavigationBarColor({
      frontColor: colors.text === '#11181C' ? '#000000' : '#ffffff',
      backgroundColor: colors.background,
    });
    fetchData();
  });

  const fetchData = async () => {
    try {
      const res = await getFileSources();
      if (res.code === 200) {
        const view = res.data as FileSourcesView;
        setRows(rowsFromView(view));
      }
    } catch (e) {
      console.warn('Failed to load file sources', e);
    }
  };

  const setFieldLine = (key: FieldKey, idx: number, value: string) => {
    setRows((prev) => {
      const next = [...prev[key]];
      next[idx] = { value, exists: null };
      return { ...prev, [key]: next };
    });
  };
  const addFieldLine = (key: FieldKey) =>
    setRows((prev) => ({
      ...prev,
      [key]: [...prev[key], { value: '', exists: null }],
    }));
  const removeFieldLine = (key: FieldKey, idx: number) =>
    setRows((prev) => {
      const next = prev[key].filter((_, i) => i !== idx);
      return {
        ...prev,
        [key]: next.length > 0 ? next : [{ value: '', exists: null }],
      };
    });

  const compact = (sourceRows: SourceRow[]) =>
    sourceRows.map(({ value }) => value.trim()).filter(Boolean);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current as unknown as number);
      pollRef.current = null;
    }
  };

  const handleSave = async (): Promise<boolean> => {
    setSaving(true);
    try {
      const payload: FileSources = {
        musicDirs: compact(rows.musicDirs),
        audiobookDirs: compact(rows.audiobookDirs),
        mvDirs: compact(rows.mvDirs),
        txtDirs: compact(rows.txtDirs),
      };
      const res = await saveFileSources(payload);
      if (res.code === 200) {
        const view = res.data as FileSourcesView;
        setRows(rowsFromView(view));
        Taro.showToast({
          title: t('settings.fileSourcesSaveSuccess'),
          icon: 'success',
        });
        return true;
      }
      Taro.showToast({
        title: res.message || t('settings.fileSourcesSaveFailed'),
        icon: 'none',
      });
      return false;
    } catch (e: any) {
      Taro.showToast({
        title: e?.message || t('settings.fileSourcesSaveFailed'),
        icon: 'none',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const pollTask = (id: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await getImportTask(id);
        if (res.code !== 200) {
          stopPolling();
          setSyncing(false);
          Taro.showToast({
            title: res.message || t('settings.fileSourcesSyncFailed'),
            icon: 'none',
          });
          return;
        }
        const task = res.data;
        if (!task || task.id !== id) return;
        setProgress({
          current: task.current,
          total: task.total,
          message: task.message,
        });
        if (task.status === 'SUCCESS' || task.status === 'FAILED') {
          stopPolling();
          setSyncing(false);
          if (task.status === 'SUCCESS') {
            Taro.showToast({
              title: task.message || t('settings.fileSourcesSyncComplete'),
              icon: 'success',
            });
          } else {
            Taro.showToast({
              title: task.message || t('settings.fileSourcesSyncFailed'),
              icon: 'none',
            });
          }
        }
      } catch {
        /* keep polling */
      }
    }, 1500);
  };

  const handleSaveAndSync = async () => {
    const ok = await handleSave();
    if (ok) {
      await handleSync();
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setProgress({ current: 0, total: 0 });
    try {
      const res = await syncFileSources();
      if (res.code === 200 && res.data?.taskId) {
        pollTask(res.data.taskId);
      } else {
        Taro.showToast({
          title: res.message || t('settings.fileSourcesSyncFailed'),
          icon: 'none',
        });
        setSyncing(false);
      }
    } catch (e: any) {
      Taro.showToast({
        title: e?.message || t('settings.fileSourcesSyncFailed'),
        icon: 'none',
      });
      setSyncing(false);
    }
  };

  const pct =
    progress && progress.total && progress.total > 0
      ? Math.min(100, Math.round(((progress.current || 0) / progress.total) * 100))
      : 0;

  return (
    <View className='file-sources' style={{ backgroundColor: colors.background }}>
      <View className='header'>
        <View className='back-btn' onClick={() => Taro.navigateBack()}>
          <Text className='back-icon icon icon-back' style={{ color: colors.text }} />
        </View>
        <Text className='header-title' style={{ color: colors.text }}>
          {t('settings.fileSources')}
        </Text>
        <View style={{ width: '80rpx' }} />
      </View>
      <Text className='description' style={{ color: colors.secondary }}>
        {t('settings.fileSourcesDescription')}
      </Text>
      <View className='form-list'>
        {FIELDS.map(({ key, labelKey }) => (
          <View key={key} className='form-field'>
            <Text className='field-label' style={{ color: colors.text }}>
              {t(labelKey)}
            </Text>
            {(rows[key] ?? [{ value: '', exists: null }]).map(
              ({ value, exists }, idx) => {
                const list = rows[key] ?? [];
                const isLast = idx === list.length - 1;
                const borderColor =
                  exists === true
                    ? '#52c41a'
                    : exists === false
                      ? '#ff4d4f'
                      : colors.border;
                return (
                  <View key={idx} className='path-row'>
                    <View className='input-wrapper'>
                      <Input
                        className='field-input'
                        style={{
                          color: colors.text,
                          backgroundColor: colors.card,
                          borderColor,
                        }}
                        value={value}
                        onInput={(e) => {
                          const v = (e.detail as { value: string }).value;
                          setFieldLine(key, idx, v);
                        }}
                        placeholder={t('settings.filePathPlaceholder')}
                        placeholderStyle={`color:${colors.secondary}`}
                      />
                      {exists !== null && (
                        <Text
                          className={`status-icon icon ${
                            exists ? 'icon-check-circle' : 'icon-close-circle'
                          }`}
                          style={{
                            color: exists ? '#52c41a' : '#ff4d4f',
                          }}
                        />
                      )}
                      {exists !== null && (
                        <Text
                          className='status-text'
                          style={{
                            color: exists ? '#52c41a' : '#ff4d4f',
                          }}
                        >
                          {exists
                            ? t('settings.filePathExists')
                            : t('settings.filePathMissing')}
                        </Text>
                      )}
                    </View>
                    <View
                      className='icon-button'
                      style={{
                        borderColor: list.length <= 1 ? colors.secondary : '#cf1322',
                        opacity: list.length <= 1 ? 0.4 : 1,
                      }}
                      onClick={() => {
                        if (list.length <= 1) return;
                        Taro.showModal({
                          title: t('common.confirm'),
                          content: t('settings.filePathRemoveConfirm', {
                            path: truncatePath(value),
                          }),
                          confirmText: t('common.confirm'),
                          cancelText: t('common.cancel'),
                          confirmColor: '#cf1322',
                          success: ({ confirm }) => {
                            if (confirm) removeFieldLine(key, idx);
                          },
                        });
                      }}
                    >
                      <Text className='icon icon-trash' style={{ color: '#cf1322' }} />
                    </View>
                    {isLast && (
                      <View
                        className='icon-button'
                        style={{ borderColor: colors.primary }}
                        onClick={() => addFieldLine(key)}
                      >
                        <Text
                          className='icon icon-add'
                          style={{ color: colors.primary }}
                        />
                      </View>
                    )}
                  </View>
                );
              },
            )}
          </View>
        ))}
      </View>
      <View className='bottom-actions'>
        <View
          className='btn btn-primary'
          style={{
            backgroundColor: colors.primary,
            opacity: saving || syncing ? 0.5 : 1,
          }}
          onClick={saving || syncing ? undefined : handleSaveAndSync}
        >
          <Text style={{ color: '#fff' }}>
            {t('settings.fileSourcesSaveAndSync')}
          </Text>
        </View>
        <View
          className='btn btn-secondary'
          style={{
            backgroundColor: colors.card,
            color: colors.text,
            borderColor: colors.border,
            opacity: saving || syncing ? 0.5 : 1,
          }}
          onClick={saving || syncing ? undefined : handleSave}
        >
          <Text style={{ color: colors.text }}>{t('common.save')}</Text>
        </View>
      </View>
      {progress && (
        <View className='progress-panel'>
          <View className='progress-track'>
            <View
              className='progress-fill'
              style={{
                width: `${pct}%`,
                backgroundColor: colors.primary,
              }}
            />
          </View>
          <Text className='progress-text' style={{ color: colors.secondary }}>
            {progress.message || ''} ({pct}%)
          </Text>
        </View>
      )}
    </View>
  );
}