import { View, Text } from '@tarojs/components';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../context/ThemeContext';
import Taro, { useLoad } from '@tarojs/taro';
import { useState, useEffect } from 'react';
import './index.scss';

const LANGUAGE_KEY = 'app_language';

export default function LanguageSettings() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [selectedLang, setSelectedLang] = useState<string>('system');

  const languages = [
    { code: 'system', label: t('settings.themeSystem', '跟随系统') },
    { code: 'zh-CN', label: '简体中文' },
    { code: 'en', label: 'English' },
  ];

  useLoad(() => {
    Taro.setNavigationBarTitle({ title: t('settings.language', '语言') });
    Taro.setNavigationBarColor({
      frontColor: colors.text === '#11181C' ? '#000000' : '#ffffff',
      backgroundColor: colors.background,
    });
  });

  useEffect(() => {
    const saved = Taro.getStorageSync(LANGUAGE_KEY);
    if (saved) {
      setSelectedLang(saved);
    } else {
      setSelectedLang('system');
    }
  }, []);

  const getDeviceLanguage = () => {
    try {
      const { language } = Taro.getSystemInfoSync();
      if (language) {
        return language.startsWith('zh') ? 'zh-CN' : 'en';
      }
    } catch (e) {}
    return 'zh-CN';
  };

  const handleLanguageSelect = async (langCode: string) => {
    setSelectedLang(langCode);
    Taro.setStorageSync(LANGUAGE_KEY, langCode);
    if (langCode === 'system') {
      await i18n.changeLanguage(getDeviceLanguage());
    } else {
      await i18n.changeLanguage(langCode);
    }
  };

  return (
    <View className='language-settings' style={{ backgroundColor: colors.background }}>
      <View className='header' style={{ backgroundColor: colors.background }}>
        <View className='back-btn' onClick={() => Taro.navigateBack()}>
          <Text className='back-icon icon icon-back' style={{ color: colors.text }} />
        </View>
        <Text className='header-title' style={{ color: colors.text }}>{t('settings.language', '语言')}</Text>
        <View style={{ width: '80rpx' }} />
      </View>
      
      <View className='list'>
        {languages.map((lang) => (
          <View
            key={lang.code}
            className='item'
            style={{ borderBottomColor: colors.border }}
            onClick={() => handleLanguageSelect(lang.code)}
          >
            <Text className='item-text' style={{ color: colors.text }}>
              {lang.label}
            </Text>
            {selectedLang === lang.code && (
              <Text className='checkmark' style={{ color: colors.primary }}>
                ✓
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}