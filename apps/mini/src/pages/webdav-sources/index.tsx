import { Switch, Text, Textarea, View } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import {
  getWebDavSources,
  saveWebDavSources,
  testWebDavConnection,
  triggerWebDavSync,
  type WebDavPathKind,
  type WebDavSource,
} from '../../services/webdav-config';
import './index.scss';

const PATH_FIELDS: { kind: WebDavPathKind; tagKey: string }[] = [
  { kind: 'MUSIC', tagKey: 'settings.webdavSourceTypeMusic' },
  { kind: 'AUDIOBOOK', tagKey: 'settings.webdavSourceTypeAudiobook' },
  { kind: 'MV', tagKey: 'settings.webdavSourceTypeMv' },
];

const generateId = () =>
  `wd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const normalizePathList = (value?: string | string[]): string[] => {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.length > 0 ? values : [];
};

const compactPaths = (paths?: WebDavSource['paths']) => {
  const result: Record<WebDavPathKind, string[]> = { MUSIC: [], AUDIOBOOK: [], MV: [] };
  if (!paths) return result;
  for (const field of PATH_FIELDS) {
    result[field.kind] = normalizePathList(paths[field.kind]);
  }
  return result;
};

interface EditableSource extends WebDavSource {
  _expanded?: boolean;
}

export default function WebDavConfig() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [sources, setSources] = useState<EditableSource[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<EditableSource | null>(null);
  const [draftPaths, setDraftPaths] = useState<Record<WebDavPathKind, string>>({
    MUSIC: '',
    AUDIOBOOK: '',
    MV: '',
  });

  useLoad(() => {
    Taro.setNavigationBarTitle({ title: t('settings.webdavSources') });
    Taro.setNavigationBarColor({
      frontColor: colors.text === '#11181C' ? '#000000' : '#ffffff',
      backgroundColor: colors.background,
    });
    fetchData();
  });

  const fetchData = async () => {
    try {
      const res = await getWebDavSources();
      if (res.code === 200) {
        setSources(res.data ?? []);
      }
    } catch (error) {
      console.warn('Failed to load WebDAV sources', error);
    } finally {
      setLoaded(true);
    }
  };

  const persist = async (next: EditableSource[]) => {
    setSaving(true);
    try {
      const res = await saveWebDavSources(next as any);
      if (res.code === 200) {
        setSources(res.data ?? []);
      } else {
        Taro.showToast({ title: res.message || t('settings.webdavSaveFailed'), icon: 'none' });
        await fetchData();
      }
    } catch (error: any) {
      Taro.showToast({
        title: error?.message || t('settings.webdavSaveFailed'),
        icon: 'none',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    const blank: EditableSource = {
      id: generateId(),
      name: '',
      url: '',
      username: '',
      password: '',
      enabled: true,
      paths: { MUSIC: [''], AUDIOBOOK: [''], MV: [''] },
    };
    setDraftPaths({ MUSIC: '', AUDIOBOOK: '', MV: '' });
    setEditing(blank);
  };

  const startEdit = (source: EditableSource) => {
    const paths = compactPaths(source.paths);
    setDraftPaths({
      MUSIC: paths.MUSIC.join('\n'),
      AUDIOBOOK: paths.AUDIOBOOK.join('\n'),
      MV: paths.MV.join('\n'),
    });
    setEditing({ ...source });
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name?.trim() || !editing.url?.trim()) {
      Taro.showToast({ title: t('settings.webdavSourceRequired'), icon: 'none' });
      return;
    }
    const paths: WebDavSource['paths'] = {};
    for (const field of PATH_FIELDS) {
      const raw = draftPaths[field.kind] || '';
      const lines = raw
        .split(/[\n;,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (lines.length > 0) paths[field.kind] = lines;
    }
    const next: EditableSource = { ...editing, paths };
    const nextList = sources.find((s) => s.id === next.id)
      ? sources.map((s) => (s.id === next.id ? next : s))
      : [...sources, next];
    await persist(nextList);
    setEditing(null);
  };

  const handleCancel = () => setEditing(null);

  const handleDelete = (source: EditableSource) => {
    Taro.showModal({
      title: t('common.confirm'),
      content: t('settings.webdavSourceRemove'),
      success: async (res) => {
        if (!res.confirm) return;
        await persist(sources.filter((s) => s.id !== source.id));
      },
    });
  };

  const handleToggleEnabled = async (source: EditableSource, enabled: boolean) => {
    const updated = { ...source, enabled };
    await persist(
      sources.map((s) => (s.id === source.id ? updated : s)),
    );
  };

  const handleTest = async (source: EditableSource) => {
    Taro.showLoading({ title: t('settings.webdavTestingConnection') });
    try {
      const res = await testWebDavConnection(source);
      Taro.hideLoading();
      if (res.code === 200 && res.data?.success) {
        Taro.showToast({ title: t('settings.webdavTestSuccess'), icon: 'success' });
      } else {
        Taro.showToast({
          title: res.data?.message || res.message || t('settings.webdavTestFailed'),
          icon: 'none',
        });
      }
    } catch (error: any) {
      Taro.hideLoading();
      Taro.showToast({
        title: error?.message || t('settings.webdavTestFailed'),
        icon: 'none',
      });
    }
  };

  const handleSyncNow = async () => {
    Taro.showLoading({ title: t('settings.webdavSyncing') });
    try {
      const res = await triggerWebDavSync();
      Taro.hideLoading();
      if (res.code === 200) {
        Taro.showToast({ title: t('settings.webdavSync'), icon: 'success' });
      } else {
        Taro.showToast({ title: res.message, icon: 'none' });
      }
    } catch (error: any) {
      Taro.hideLoading();
      Taro.showToast({ title: error?.message, icon: 'none' });
    }
  };

  const renderTag = (kind: WebDavPathKind, value: string) => (
    <Text key={kind} className='source-meta' style={{ color: colors.secondary }}>
      {t(`settings.webdavSourceType${kind.charAt(0) + kind.slice(1).toLowerCase()}`)}: {value}
    </Text>
  );

  const summaryPaths = useMemo(() => {
    const result: Record<string, string> = {};
    for (const s of sources) {
      const summary: string[] = [];
      for (const field of PATH_FIELDS) {
        const list = normalizePathList(s.paths?.[field.kind]);
        if (list.length > 0) {
          summary.push(`${t(field.tagKey)} ${list.length}`);
        }
      }
      result[s.id] = summary.join(' · ');
    }
    return result;
  }, [sources]);

  return (
    <View className='webdav' style={{ backgroundColor: colors.background }}>
      <View className='header'>
        <View className='back-btn' onClick={() => Taro.navigateBack()}>
          <Text className='back-icon icon icon-back' style={{ color: colors.text }} />
        </View>
        <Text className='header-title' style={{ color: colors.text }}>
          {t('settings.webdavSources')}
        </Text>
        <View style={{ width: '80rpx' }} />
      </View>

      <Text className='description' style={{ color: colors.secondary }}>
        {t('settings.webdavSourcesDescription')}
      </Text>
      <Text className='description' style={{ color: colors.secondary, fontSize: '24rpx', paddingTop: 0 }}>
        {t('settings.webdavPathHint')}
      </Text>

      <View className='list'>
        {!loaded ? null : sources.length === 0 ? (
          <Text className='empty' style={{ color: colors.secondary }}>
            {t('settings.webdavEmpty')}
          </Text>
        ) : (
          sources.map((source) => (
            <View
              key={source.id}
              className='source-card'
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <View className='source-row'>
                <View>
                  <Text className='source-name' style={{ color: colors.text }}>
                    {source.name || t('settings.webdavSourceName')}
                  </Text>
                  <Text className='source-url' style={{ color: colors.secondary }}>
                    {source.url || '—'}
                  </Text>
                </View>
                <Switch
                  checked={source.enabled}
                  onChange={(e) => handleToggleEnabled(source, e.detail.value)}
                  color={colors.primary}
                />
              </View>
              {summaryPaths[source.id] && (
                <Text className='source-meta' style={{ color: colors.secondary }}>
                  {summaryPaths[source.id]}
                </Text>
              )}
              <View className='source-actions'>
                <View
                  className='btn btn-primary'
                  style={{ backgroundColor: colors.primary }}
                  onClick={() => startEdit(source)}
                >
                  <Text style={{ color: '#fff' }}>{t('common.save')}</Text>
                </View>
                <View className='btn btn-secondary' onClick={() => handleTest(source)}>
                  <Text style={{ color: colors.text }}>{t('settings.webdavTestConnection')}</Text>
                </View>
                <View className='btn btn-danger' onClick={() => handleDelete(source)}>
                  <Text style={{ color: '#cf1322' }}>{t('settings.webdavSourceRemove')}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <View className='bottom-actions'>
        <View
          className='btn btn-primary'
          style={{ backgroundColor: colors.primary }}
          onClick={handleAdd}
        >
          <Text style={{ color: '#fff' }}>{t('settings.webdavAddSource')}</Text>
        </View>
        <View
          className='btn btn-secondary'
          style={{ backgroundColor: colors.card, color: colors.text }}
          onClick={saving ? undefined : handleSyncNow}
        >
          <Text style={{ color: colors.text }}>{t('settings.webdavSync')}</Text>
        </View>
      </View>

      {editing && (
        <>
          <View className='editor-mask' onClick={handleCancel} />
          <View
            className='editor-card'
            style={{ backgroundColor: colors.background, borderColor: colors.border }}
          >
            <Text className='editor-title' style={{ color: colors.text }}>
              {t('settings.webdavAddSource')}
            </Text>
            <View className='editor-body'>
              <View className='editor-field'>
                <Text className='editor-label' style={{ color: colors.text }}>
                  {t('settings.webdavSourceName')}
                </Text>
                <Textarea
                  className='editor-input'
                  style={{ color: colors.text, backgroundColor: colors.card, borderColor: colors.border }}
                  value={editing.name}
                  onInput={(e) => setEditing((prev) => prev ? { ...prev, name: e.detail.value } : prev)}
                  placeholder={t('settings.webdavSourceNamePlaceholder')}
                  placeholderStyle={{ color: colors.secondary }}
                  autoHeight
                />
              </View>

              <View className='editor-field'>
                <Text className='editor-label' style={{ color: colors.text }}>
                  {t('settings.webdavSourceUrl')}
                </Text>
                <Textarea
                  className='editor-input'
                  style={{ color: colors.text, backgroundColor: colors.card, borderColor: colors.border }}
                  value={editing.url}
                  onInput={(e) => setEditing((prev) => prev ? { ...prev, url: e.detail.value } : prev)}
                  placeholder={t('settings.webdavSourceUrlPlaceholder')}
                  placeholderStyle={{ color: colors.secondary }}
                  autoHeight
                />
              </View>

              <View className='editor-field'>
                <Text className='editor-label' style={{ color: colors.text }}>
                  {t('settings.webdavSourceUsername')}
                </Text>
                <Textarea
                  className='editor-input'
                  style={{ color: colors.text, backgroundColor: colors.card, borderColor: colors.border }}
                  value={editing.username || ''}
                  onInput={(e) => setEditing((prev) => prev ? { ...prev, username: e.detail.value } : prev)}
                  autoHeight
                />
              </View>

              <View className='editor-field'>
                <Text className='editor-label' style={{ color: colors.text }}>
                  {t('settings.webdavSourcePassword')}
                </Text>
                <Textarea
                  className='editor-input'
                  style={{ color: colors.text, backgroundColor: colors.card, borderColor: colors.border }}
                  value={editing.password || ''}
                  onInput={(e) => setEditing((prev) => prev ? { ...prev, password: e.detail.value } : prev)}
                  password
                  autoHeight
                />
              </View>

              {PATH_FIELDS.map((field) => (
                <View className='editor-field' key={field.kind}>
                  <Text className='editor-label' style={{ color: colors.text }}>
                    {t(`settings.webdavPath${field.kind.charAt(0) + field.kind.slice(1).toLowerCase()}`)}
                  </Text>
                  <Textarea
                    className='editor-input'
                    style={{ minHeight: '120rpx', color: colors.text, backgroundColor: colors.card, borderColor: colors.border }}
                    value={draftPaths[field.kind]}
                    onInput={(e) =>
                      setDraftPaths((prev) => ({ ...prev, [field.kind]: e.detail.value }))
                    }
                    placeholder={t(`settings.webdavPath${field.kind.charAt(0) + field.kind.slice(1).toLowerCase()}Placeholder`)}
                    placeholderStyle={{ color: colors.secondary }}
                    autoHeight
                  />
                </View>
              ))}
            </View>
            <View className='editor-footer'>
              <View
                className='btn btn-secondary'
                style={{ backgroundColor: colors.card, color: colors.text, borderColor: colors.border }}
                onClick={handleCancel}
              >
                <Text style={{ color: colors.text }}>{t('common.cancel')}</Text>
              </View>
              <View
                className='btn btn-primary'
                style={{ backgroundColor: colors.primary }}
                onClick={saving ? undefined : handleSave}
              >
                <Text style={{ color: '#fff' }}>{t('common.save')}</Text>
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );
}
