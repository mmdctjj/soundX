import { Text, Textarea, View } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import {
  deleteTtsProviderConfig,
  getTtsProviderConfigs,
  getTtsSupportedProviders,
  saveTtsProviderConfig,
  testTtsProviderConfig,
  type TtsProviderOption,
} from '../../services/tts-config';
import './index.scss';

interface ProviderSchema {
  fields: string[];
  defaults: Record<string, string>;
}

const SCHEMAS: Record<string, ProviderSchema> = {
  mimo: {
    fields: ['apiKey', 'model'],
    defaults: { model: 'mimo-v2.5-tts' },
  },
  minimax: {
    fields: ['apiKey', 'groupId', 'model'],
    defaults: { model: 'speech-2.8-hd' },
  },
  volc: {
    fields: ['appId', 'apiKey'],
    defaults: {},
  },
};

const FIELD_TO_LABEL_KEY: Record<string, string> = {
  apiKey: 'settings.ttsConfigFieldApiKey',
  appId: 'settings.ttsConfigFieldAppId',
  groupId: 'settings.ttsConfigFieldGroupId',
  model: 'settings.ttsConfigFieldModel',
};

const FIELD_TO_CONFIG_KEY: Record<string, string> = {
  apiKey: 'api_key',
  appId: 'app_id',
  groupId: 'group_id',
  model: 'model',
};

export default function TtsConfig() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [providers, setProviders] = useState<TtsProviderOption[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const schema = useMemo<ProviderSchema | null>(() => {
    if (!selected) return null;
    return SCHEMAS[selected] ?? { fields: ['apiKey'], defaults: {} };
  }, [selected]);

  useLoad(() => {
    Taro.setNavigationBarTitle({ title: t('settings.ttsConfig') });
    Taro.setNavigationBarColor({
      frontColor: colors.text === '#11181C' ? '#000000' : '#ffffff',
      backgroundColor: colors.background,
    });

    (async () => {
      try {
        const [provRes, confRes] = await Promise.all([
          getTtsSupportedProviders(),
          getTtsProviderConfigs(),
        ]);
        const list = provRes.providers ?? [];
        setProviders(list);
        setConfigs(confRes.configs ?? {});
        const initial =
          list.find((p) => p.id === 'mimo') ??
          list.find((p) => p.id in SCHEMAS) ??
          list[0];
        if (initial) setSelected(initial.id);
      } catch (error) {
        console.warn('Failed to load TTS configs', error);
      } finally {
        setLoading(false);
      }
    })();
  });

  // 切换 provider 时回填默认值
  useMemo(() => {
    if (!selected) return;
    const stored = configs[selected] ?? {};
    const defaults = SCHEMAS[selected]?.defaults ?? {};
    const next: Record<string, string> = { apiKey: '', appId: '', groupId: '', model: '' };
    for (const field of Object.keys(FIELD_TO_LABEL_KEY)) {
      const cfgKey = FIELD_TO_CONFIG_KEY[field];
      const v = stored[cfgKey];
      next[field] = typeof v === 'string' ? v : (defaults[field] ?? '');
    }
    setDraft(next);
  }, [selected, configs]);

  const handlePickProvider = () => {
    if (providers.length === 0) return;
    Taro.showActionSheet({
      itemList: providers.map((p) => p.name),
      success: (res) => {
        const p = providers[res.tapIndex];
        if (p) setSelected(p.id);
      },
    });
  };

  const handleSave = async () => {
    if (!selected || !schema) return;
    setSaving(true);
    Taro.showLoading({ title: t('common.loading') });
    try {
      const payload: Record<string, string> = {};
      for (const field of schema.fields) {
        const v = (draft[field] ?? '').trim();
        if (v) payload[FIELD_TO_CONFIG_KEY[field]] = v;
      }
      const res = await saveTtsProviderConfig(selected, payload as any);
      Taro.hideLoading();
      if (res.code === 200) {
        setConfigs((prev) => ({ ...prev, [selected]: res.data?.config ?? {} }));
        Taro.showToast({ title: t('settings.ttsConfigSaveSuccess'), icon: 'success' });
      } else {
        Taro.showToast({ title: res.message || t('settings.ttsConfigSaveFailed'), icon: 'none' });
      }
    } catch (error: any) {
      Taro.hideLoading();
      Taro.showToast({
        title: error?.message || t('settings.ttsConfigSaveFailed'),
        icon: 'none',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!selected || !schema) return;
    Taro.showLoading({ title: t('common.loading') });
    try {
      const payload: Record<string, string> = {};
      for (const field of schema.fields) {
        const v = (draft[field] ?? '').trim();
        if (v) payload[FIELD_TO_CONFIG_KEY[field]] = v;
      }
      await testTtsProviderConfig(selected, payload as any);
      Taro.hideLoading();
      Taro.showToast({ title: t('settings.testConnectionSuccess'), icon: 'success' });
    } catch (error: any) {
      Taro.hideLoading();
      const detail =
        error?.data?.detail ||
        error?.data?.message ||
        error?.message ||
        t('settings.testConnectionFailed');
      Taro.showToast({ title: String(detail), icon: 'none' });
    }
  };

  const handleDelete = () => {
    if (!selected) return;
    Taro.showModal({
      title: t('common.confirm'),
      content: t('settings.ttsConfigDeleteSuccess'),
      success: async (res) => {
        if (!res.confirm || !selected) return;
        try {
          await deleteTtsProviderConfig(selected);
          setConfigs((prev) => {
            const next = { ...prev };
            delete next[selected];
            return next;
          });
          Taro.showToast({ title: t('settings.ttsConfigDeleteSuccess'), icon: 'success' });
        } catch (error: any) {
          Taro.showToast({
            title: error?.message || t('settings.ttsConfigSaveFailed'),
            icon: 'none',
          });
        }
      },
    });
  };

  const selectedLabel = providers.find((p) => p.id === selected)?.name ?? '-';
  const isConfigured = selected ? configs[selected] !== undefined : false;

  return (
    <View className='tts-config' style={{ backgroundColor: colors.background }}>
      <View className='header'>
        <View className='back-btn' onClick={() => Taro.navigateBack()}>
          <Text className='back-icon icon icon-back' style={{ color: colors.text }} />
        </View>
        <Text className='header-title' style={{ color: colors.text }}>
          {t('settings.ttsConfig')}
        </Text>
        <View style={{ width: '80rpx' }} />
      </View>

      <Text className='description' style={{ color: colors.secondary }}>
        {t('settings.ttsConfigDescription')}
      </Text>

      {!loading ? (
        providers.length === 0 ? (
          <Text className='empty' style={{ color: colors.secondary }}>
            {t('settings.ttsConfigEmpty')}
          </Text>
        ) : (
          <View className='form'>
            <View className='field'>
              <Text className='field-label' style={{ color: colors.text }}>
                {t('settings.ttsConfig')}
              </Text>
              <View
                className='field-pick'
                style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}
                onClick={handlePickProvider}
              >
                <Text style={{ color: colors.text }}>
                  {selectedLabel}{isConfigured ? ' ✓' : ''}
                </Text>
                <Text style={{ color: colors.secondary }}>&gt;</Text>
              </View>
            </View>

            {schema?.fields.map((field) => (
              <View className='field' key={field}>
                <Text className='field-label' style={{ color: colors.text }}>
                  {t(FIELD_TO_LABEL_KEY[field])}
                </Text>
                <Textarea
                  className='field-input'
                  style={{ backgroundColor: colors.card, color: colors.text, borderColor: colors.border }}
                  value={draft[field] ?? ''}
                  onInput={(e) =>
                    setDraft((prev) => ({ ...prev, [field]: e.detail.value }))
                  }
                  placeholder={
                    field === 'apiKey' ? t('settings.llmConfigKeyHint') : undefined
                  }
                  placeholderStyle={{ color: colors.secondary }}
                  password={field === 'apiKey'}
                  autoHeight
                />
              </View>
            ))}

            <View className='actions'>
              <View
                className='save-btn'
                style={{ backgroundColor: colors.primary }}
                hoverClass={saving ? 'none' : undefined}
                onClick={saving ? undefined : handleSave}
              >
                <Text className='save-btn-text'>{t('common.save')}</Text>
              </View>
              <View
                className='secondary-btn'
                style={{ borderColor: colors.border }}
                onClick={handleTest}
              >
                <Text className='secondary-btn-text' style={{ color: colors.text }}>
                  {t('settings.testConnection')}
                </Text>
              </View>
              {isConfigured && (
                <View
                  className='delete-btn'
                  style={{ borderColor: colors.border }}
                  onClick={handleDelete}
                >
                  <Text style={{ color: colors.text, fontWeight: 600 }}>
                    {t('common.delete')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )
      ) : null}
    </View>
  );
}
