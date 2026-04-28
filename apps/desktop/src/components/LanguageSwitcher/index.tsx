import React from "react";
import { Segmented } from "antd";
import { useTranslation } from "react-i18next";
import { languages } from "../../i18n";
import styles from "./index.module.less";

interface LanguageSwitcherProps {
  onLanguageChange?: (lang: string) => void;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  onLanguageChange,
}) => {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language;

  const options = languages.map((lang) => ({
    label: (
      <span>
        {lang.flag} {lang.label}
      </span>
    ),
    value: lang.code,
  }));

  const handleChange = async (value: string) => {
    await i18n.changeLanguage(value);
    onLanguageChange?.(value);
  };

  return (
    <div className={styles.languageSwitcher}>
      <div className={styles.settingLabel}>{t("settings.language", "语言")}</div>
      <Segmented
        value={currentLang}
        onChange={handleChange}
        options={options}
      />
    </div>
  );
};
