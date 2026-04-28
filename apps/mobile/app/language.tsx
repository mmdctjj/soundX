import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  EXPLICIT_LANGUAGE_OPTIONS,
  LANGUAGE_STORAGE_KEY,
  SYSTEM_LANGUAGE_VALUE,
  resolveLanguageSelection,
} from "@soundx/i18e";
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

export default function LanguageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { i18n, t } = useTranslation();
  const [selectedLang, setSelectedLang] = useState<string>("system");

  const languages = [
    { code: SYSTEM_LANGUAGE_VALUE, label: t("settings.themeSystem", "跟随系统") },
    ...EXPLICIT_LANGUAGE_OPTIONS,
  ];

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((saved) => {
      if (saved) {
        setSelectedLang(saved);
      } else {
        setSelectedLang(SYSTEM_LANGUAGE_VALUE);
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
      return resolveLanguageSelection(SYSTEM_LANGUAGE_VALUE, locale);
    } catch (e) {}
    return resolveLanguageSelection(SYSTEM_LANGUAGE_VALUE);
  };

  const handleLanguageSelect = async (langCode: string) => {
    setSelectedLang(langCode);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, langCode);
    if (langCode === SYSTEM_LANGUAGE_VALUE) {
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
