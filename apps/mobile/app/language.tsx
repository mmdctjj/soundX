import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useTheme } from "../src/context/ThemeContext";
import { Platform, NativeModules } from "react-native";

const LANGUAGE_KEY = "app_language";

export default function LanguageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { i18n, t } = useTranslation();
  const [selectedLang, setSelectedLang] = useState<string>("system");

  const languages = [
    { code: "system", label: t("settings.themeSystem", "跟随系统") },
    { code: "zh-CN", label: "简体中文" },
    { code: "en", label: "English" },
  ];

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_KEY).then((saved) => {
      if (saved) {
        setSelectedLang(saved);
      } else {
        setSelectedLang("system");
      }
    });
  }, []);

  const getDeviceLanguage = () => {
    try {
      const locale =
        Platform.OS === "ios"
          ? NativeModules.SettingsManager.settings.AppleLocale ||
            NativeModules.SettingsManager.settings.AppleLanguages[0]
          : NativeModules.I18nManager.localeIdentifier;
      if (locale) {
        return locale.startsWith("zh") ? "zh-CN" : "en";
      }
    } catch (e) {}
    return "zh-CN";
  };

  const handleLanguageSelect = async (langCode: string) => {
    setSelectedLang(langCode);
    await AsyncStorage.setItem(LANGUAGE_KEY, langCode);
    if (langCode === "system") {
      await i18n.changeLanguage(getDeviceLanguage());
    } else {
      await i18n.changeLanguage(langCode);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t("settings.language", "语言")}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.list}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[styles.item, { borderBottomColor: colors.border }]}
            onPress={() => handleLanguageSelect(lang.code)}
          >
            <Text style={[styles.itemText, { color: colors.text }]}>
              {lang.label}
            </Text>
            {selectedLang === lang.code && (
              <Ionicons name="checkmark" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  list: {
    marginTop: 10,
    paddingHorizontal: 20,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemText: {
    fontSize: 16,
  },
});