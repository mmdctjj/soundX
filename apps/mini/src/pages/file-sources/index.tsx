import { Text, Textarea, View } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import {
  getFileSources,
  saveFileSources,
  syncFileSources,
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

const split = (raw: string) =>
  raw.split(/[\n;,]/).map((s) => s.trim()).filter(Boolean);

export default function FileSources() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [draft, setDraft] = useState<Record<FieldKey, string>>({
    musicDirs: '',
    audiobookDirs: '',
    mvDirs: '',
    txtDirs: '',
  });
  const [exists, setExists] = useState<Record<FieldKey, boolean[]>>({
    musicDirs: [],
    audiobookDirs: [],
    mvDirs: [],
    txtDirs: [],
  });
  const [saving, setSaving] = useState(false);

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
        setDraft({
          musicDirs: (view.sources.musicDirs || []).join('\n'),
          audiobookDirs: (view.sources.audiobookDirs || []).join('\n'),
          mvDirs: (view.sources.mvDirs || []).join('\n'),
          txtDirs: (view.sources.txtDirs || []).join('\n'),
        });
        setExists(view.exists);
      }
    } catch (e) {
      console.warn('Failed to load file sources', e);
    }
  };

  const handleDraftChange = (key: FieldKey, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setExists((prev) => ({ ...prev, [key]: [] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: FileSources = {
        musicDirs: split(draft.musicDirs),
        audiobookDirs: split(draft.audiobookDirs),
        mvDirs: split(draft.mvDirs),
        txtDirs: split(draft.txtDirs),
      };
      const res = await saveFileSources(payload);
      if (res.code === 200) {
        const view = res.data as FileSourcesView;
        setDraft({
          musicDirs: (view.sources.musicDirs || []).join('\n'),
          audiobookDirs: (view.sources.audiobookDirs || []).join('\n'),
          mvDirs: (view.sources.mvDirs || []).join('\n'),
          txtDirs: (view.sources.txtDirs || []).join('\n'),
        });
        setExists(view.exists);
        Taro.showToast({
          title: t('settings.fileSourcesSaveSuccess'),
          icon: 'success',
        });
      } else {
        Taro.showToast({
          title: res.message || t('settings.fileSourcesSaveFailed'),
          icon: 'none',
        });
      }
    } catch (e: any) {
      Taro.showToast({
        title: e?.message || t('settings.fileSourcesSaveFailed'),
        icon: 'none',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    Taro.showLoading({ title: t('settings.fileSourcesSync') });
    try {
      const res = await syncFileSources();
      Taro.hideLoading();
      if (res.code === 200) {
        Taro.showToast({
          title: t('settings.fileSourcesSyncStarted'),
          icon: 'success',
        });
      } else {
        Taro.showToast({
          title: res.message || t('settings.fileSourcesSyncFailed'),
          icon: 'none',
        });
      }
    } catch (e: any) {
      Taro.hideLoading();
      Taro.showToast({
        title: e?.message || t('settings.fileSourcesSyncFailed'),
        icon: 'none',
      });
    }
  };

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
            <Textarea
              className='field-input'
              style={{
                color: colors.text,
                backgroundColor: colors.card,
                borderColor: colors.border,
                minHeight: '180rpx',
              }}
              value={draft[key]}
              onInput={(e) => handleDraftChange(key, e.detail.value)}
              placeholder={t('settings.filePathPlaceholder')}
              placeholderStyle={{ color: colors.secondary }}
              autoHeight
            />
            <View className='tag-row'>
              {(exists[key] || []).map((flag, i) => (
                <Text
                  key={i}
                  className='tag'
                  style={{
                    color: flag ? '#389e0d' : '#d46b08',
                    backgroundColor: flag ? '#52c41a22' : '#faad1422',
                  }}
                >
                  {flag
                    ? t('settings.filePathExists')
                    : t('settings.filePathMissing')}
                </Text>
              ))}
            </View>
          </View>
        ))}
      </View>
      <View className='bottom-actions'>
        <View
          className='btn btn-secondary'
          style={{
            backgroundColor: colors.card,
            color: colors.text,
            borderColor: colors.border,
          }}
          onClick={saving ? undefined : handleSave}
        >
          <Text style={{ color: colors.text }}>{t('common.save')}</Text>
        </View>
        <View
          className='btn btn-primary'
          style={{ backgroundColor: colors.primary }}
          onClick={handleSync}
        >
          <Text style={{ color: '#fff' }}>{t('settings.fileSourcesSync')}</Text>
        </View>
      </View>
    </View>
  );
}