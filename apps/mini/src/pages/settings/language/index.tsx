import { View, Text } from '@tarojs/components';
import {
  EXPLICIT_LANGUAGE_OPTIONS,
  LANGUAGE_STORAGE_KEY,
  SYSTEM_LANGUAGE_VALUE,
  resolveLanguageSelection,
} from '@soundx/i18e';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../context/ThemeContext';
import Taro, { useLoad } from '@tarojs/taro';
import { useState, useEffect } from 'react';
import './index.scss';

export default function LanguageSettings() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [selectedLang, setSelectedLang] = useState<string>('system');

  const languages = [
    { code: SYSTEM_LANGUAGE_VALUE, label: t('settings.themeSystem', '跟随系统') },
    ...EXPLICIT_LANGUAGE_OPTIONS,
  ];

  useLoad(() => {
    Taro.setNavigationBarTitle({ title: t('settings.language', '语言') });
    Taro.setNavigationBarColor({
      frontColor: colors.text === '#11181C' ? '#000000' : '#ffffff',
      backgroundColor: colors.background,
    });
  });

  useEffect(() => {
    const saved = Taro.getStorageSync(LANGUAGE_STORAGE_KEY);
    if (saved) {
      setSelectedLang(saved);
    } else {
      setSelectedLang(SYSTEM_LANGUAGE_VALUE);
    }
  }, []);

  const getDeviceLanguage = () => {
    try {
      const { language } = Taro.getSystemInfoSync();
      return resolveLanguageSelection(SYSTEM_LANGUAGE_VALUE, language);
    } catch (e) {}
    return resolveLanguageSelection(SYSTEM_LANGUAGE_VALUE);
  };

  const handleLanguageSelect = async (langCode: string) => {
    setSelectedLang(langCode);
    Taro.setStorageSync(LANGUAGE_STORAGE_KEY, langCode);
    if (langCode === SYSTEM_LANGUAGE_VALUE) {
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
