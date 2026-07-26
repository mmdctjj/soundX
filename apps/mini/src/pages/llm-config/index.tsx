import { Text, Textarea, View } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import {
  LLM_PROVIDER_OPTIONS,
  getLlmConfig,
  saveLlmConfig,
  testLlmConfig,
} from '../../services/llm-config';
import './index.scss';

export default function LlmConfig() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [provider, setProvider] = useState<string>(LLM_PROVIDER_OPTIONS[0].id);
  const [model, setModel] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useLoad(() => {
    Taro.setNavigationBarTitle({ title: t('settings.llmConfig') });
    Taro.setNavigationBarColor({
      frontColor: colors.text === '#11181C' ? '#000000' : '#ffffff',
      backgroundColor: colors.background,
    });

    (async () => {
      try {
        const res = await getLlmConfig();
        if (res.code === 200 && res.data) {
          setProvider(res.data.provider || LLM_PROVIDER_OPTIONS[0].id);
          setModel(res.data.model || '');
          setApiKey(res.data.apiKey || '');
          setBaseUrl(res.data.baseUrl || '');
        }
      } catch (error) {
        console.warn('Failed to load LLM config', error);
      } finally {
        setLoading(false);
      }
    })();
  });

  const handlePickProvider = () => {
    Taro.showActionSheet({
      itemList: LLM_PROVIDER_OPTIONS.map((opt) => opt.name),
      success: (res) => {
        const opt = LLM_PROVIDER_OPTIONS[res.tapIndex];
        if (opt) setProvider(opt.id);
      },
    });
  };

  const handleSave = async () => {
    if (!provider || !model.trim()) {
      Taro.showToast({ title: t('common.error'), icon: 'none' });
      return;
    }

    Taro.showLoading({ title: t('common.loading') });
    try {
      const res = await saveLlmConfig({ provider, model: model.trim(), apiKey, baseUrl });
      Taro.hideLoading();
      if (res.code === 200) {
        if (res.data?.apiKey !== undefined) setApiKey(res.data.apiKey);
        Taro.showToast({ title: t('settings.llmConfigSaveSuccess'), icon: 'success' });
      } else {
        Taro.showToast({ title: res.message || t('settings.llmConfigSaveFailed'), icon: 'none' });
      }
    } catch (error: any) {
      Taro.hideLoading();
      Taro.showToast({
        title: error?.message || t('settings.llmConfigSaveFailed'),
        icon: 'none',
      });
    }
  };

  const handleTest = async () => {
    if (!apiKey) {
      Taro.showToast({ title: t('settings.testConnectionFailed'), icon: 'none' });
      return;
    }
    Taro.showLoading({ title: t('common.loading') });
    try {
      const res = await testLlmConfig({ provider, model, apiKey, baseUrl });
      Taro.hideLoading();
      if (res.code === 200) {
        Taro.showToast({ title: t('settings.testConnectionSuccess'), icon: 'success' });
      } else {
        Taro.showToast({ title: res.message || t('settings.testConnectionFailed'), icon: 'none' });
      }
    } catch (error: any) {
      Taro.hideLoading();
      Taro.showToast({
        title: error?.message || t('settings.testConnectionFailed'),
        icon: 'none',
      });
    }
  };

  const providerLabel =
    LLM_PROVIDER_OPTIONS.find((o) => o.id === provider)?.name ?? provider;

  return (
    <View className='llm-config' style={{ backgroundColor: colors.background }}>
      <View className='header'>
        <View className='back-btn' onClick={() => Taro.navigateBack()}>
          <Text className='back-icon icon icon-back' style={{ color: colors.text }} />
        </View>
        <Text className='header-title' style={{ color: colors.text }}>
          {t('settings.llmConfig')}
        </Text>
        <View style={{ width: '80rpx' }} />
      </View>

      <Text className='description' style={{ color: colors.secondary }}>
        {t('settings.llmConfigDescription')}
      </Text>
      <Text className='hint' style={{ color: colors.secondary }}>
        {t('settings.llmConfigKeyHint')}
      </Text>

      {!loading && (
        <View className='form'>
          <View className='field'>
            <Text className='field-label' style={{ color: colors.text }}>
              {t('settings.llmProvider')}
            </Text>
            <View
              className='field-pick'
              style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}
              onClick={handlePickProvider}
            >
              <Text style={{ color: colors.text }}>{providerLabel}</Text>
              <Text style={{ color: colors.secondary }}>&gt;</Text>
            </View>
          </View>

          <View className='field'>
            <Text className='field-label' style={{ color: colors.text }}>
              {t('settings.llmModel')}
            </Text>
            <Textarea
              className='field-input'
              style={{ backgroundColor: colors.card, color: colors.text, borderColor: colors.border }}
              value={model}
              onInput={(e) => setModel(e.detail.value)}
              placeholder='deepseek-chat'
              placeholderStyle={{ color: colors.secondary }}
              autoHeight
            />
          </View>

          <View className='field'>
            <Text className='field-label' style={{ color: colors.text }}>
              {t('settings.llmApiKey')}
            </Text>
            <Textarea
              className='field-input'
              style={{ backgroundColor: colors.card, color: colors.text, borderColor: colors.border }}
              value={apiKey}
              onInput={(e) => setApiKey(e.detail.value)}
              placeholder={t('settings.llmConfigKeyHint')}
              placeholderStyle={{ color: colors.secondary }}
              password
              autoHeight
            />
          </View>

          <View className='field'>
            <Text className='field-label' style={{ color: colors.text }}>
              {t('settings.llmBaseUrl')}
            </Text>
            <Textarea
              className='field-input'
              style={{ backgroundColor: colors.card, color: colors.text, borderColor: colors.border }}
              value={baseUrl}
              onInput={(e) => setBaseUrl(e.detail.value)}
              placeholder='https://api.deepseek.com/v1'
              placeholderStyle={{ color: colors.secondary }}
              autoHeight
            />
          </View>

          <View className='action-row'>
            <View
              className='save-btn'
              style={{ backgroundColor: colors.primary }}
              onClick={handleSave}
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
          </View>
        </View>
      )}
    </View>
  );
}
