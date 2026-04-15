import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

interface LanguageSwitcherProps {
  onLanguageChange?: (lang: string) => void;
}

export function LanguageSwitcher({ onLanguageChange }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const { colors } = useTheme();
  const currentLang = i18n.language;

  const languages = [
    { code: "zh-CN", label: "简体中文", flag: "🇨🇳" },
    { code: "en", label: "English", flag: "🇺🇸" },
  ];

  const handleLanguageChange = async (langCode: string) => {
    await i18n.changeLanguage(langCode);
    onLanguageChange?.(langCode);
  };

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingLabel, { color: colors.text }]}>
          {t("settings.language", "语言")}
        </Text>
        <Text style={[styles.settingDescription, { color: colors.secondary }]}>
          {t("settings.languageDescription", "选择应用显示语言")}
        </Text>
      </View>
      <View style={styles.languageOptions}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.langButton,
              {
                backgroundColor:
                  currentLang === lang.code ? colors.primary : "transparent",
                borderColor:
                  currentLang === lang.code ? colors.primary : colors.border,
              },
            ]}
            onPress={() => handleLanguageChange(lang.code)}
          >
            <Text style={styles.langFlag}>{lang.flag}</Text>
            <Text
              style={[
                styles.langLabel,
                {
                  color:
                    currentLang === lang.code ? "#FFFFFF" : colors.text,
                },
              ]}
            >
              {lang.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingInfo: {
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 17,
    fontWeight: "500",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  languageOptions: {
    flexDirection: "row",
    gap: 10,
  },
  langButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  langFlag: {
    fontSize: 16,
  },
  langLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
});
