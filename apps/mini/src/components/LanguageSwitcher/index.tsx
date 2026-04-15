import { Text, View } from '@tarojs/components';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import Taro from '@tarojs/taro';
import './index.scss';

interface LanguageSwitcherProps {
  onLanguageChange?: (lang: string) => void;
}

export default function LanguageSwitcher({ onLanguageChange }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const { colors } = useTheme();
  const currentLang = i18n.language;

  const languages = [
    { code: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
  ];

  const handleLanguageChange = async (langCode: string) => {
    await i18n.changeLanguage(langCode);
    onLanguageChange?.(langCode);
  };

  return (
    <View className='language-switcher'>
      <View className='setting-info'>
        <Text className='setting-label' style={{ color: colors.text }}>
          {t('settings.language', '语言')}
        </Text>
        <Text className='setting-description' style={{ color: colors.secondary }}>
          {t('settings.languageDescription', '选择应用显示语言')}
        </Text>
      </View>
      <View className='language-options'>
        {languages.map((lang) => (
          <View
            key={lang.code}
            className={`lang-button ${currentLang === lang.code ? 'active' : ''}`}
            style={{
              backgroundColor: currentLang === lang.code ? colors.primary : 'transparent',
              borderColor: currentLang === lang.code ? colors.primary : colors.border,
            }}
            onClick={() => handleLanguageChange(lang.code)}
          >
            <Text className='lang-flag'>{lang.flag}</Text>
            <Text 
              className='lang-label'
              style={{ color: currentLang === lang.code ? '#FFFFFF' : colors.text }}
            >
              {lang.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
