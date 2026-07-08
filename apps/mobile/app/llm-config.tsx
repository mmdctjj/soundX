import { Ionicons } from "@expo/vector-icons";
import {
  LLM_PROVIDER_OPTIONS,
  getLlmConfig,
  saveLlmConfig,
  testLlmConfig,
} from "@soundx/services";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../src/context/ThemeContext";
import { goBackOrReplace } from "../src/utils/navigation";

export default function LlmConfigScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [provider, setProvider] = useState<string>(LLM_PROVIDER_OPTIONS[0].id);
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await getLlmConfig();
        if (res.code === 200 && res.data) {
          setProvider(res.data.provider || LLM_PROVIDER_OPTIONS[0].id);
          setModel(res.data.model || "");
          setApiKey(res.data.apiKey || "");
          setBaseUrl(res.data.baseUrl || "");
        }
      } catch (error) {
        console.warn("Failed to load LLM config", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!provider || !model) {
      Alert.alert(t("common.error"), `${t("settings.llmProvider")} / ${t("settings.llmModel")}`);
      return;
    }
    setSaving(true);
    try {
      const res = await saveLlmConfig({ provider, model, apiKey, baseUrl });
      if (res.code === 200) {
        if (res.data?.apiKey !== undefined) setApiKey(res.data.apiKey);
        Alert.alert(t("settings.llmConfigSaveSuccess"));
      } else {
        Alert.alert(t("settings.llmConfigSaveFailed"), res.message);
      }
    } catch (error) {
      Alert.alert(
        t("settings.llmConfigSaveFailed"),
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!provider || !apiKey) {
      Alert.alert(t("common.error"), t("settings.llmProvider") + " / API Key");
      return;
    }
    setTesting(true);
    try {
      const res = await testLlmConfig({ provider, model, apiKey, baseUrl });
      if (res.code === 200) {
        Alert.alert(t("settings.testConnectionSuccess"));
      } else {
        Alert.alert(t("settings.testConnectionFailed"), res.message);
      }
    } catch (error) {
      Alert.alert(
        t("settings.testConnectionFailed"),
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setTesting(false);
    }
  };

  const handleProviderPick = () => {
    Alert.alert(
      t("settings.llmProvider"),
      undefined,
      LLM_PROVIDER_OPTIONS.map((opt) => ({
        text: opt.name,
        onPress: () => setProvider(opt.id),
      })),
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => goBackOrReplace(router, "/(tabs)/personal")}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t("settings.llmConfig")}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.description, { color: colors.secondary }]}>
            {t("settings.llmConfigDescription")}
          </Text>
          <Text style={[styles.hint, { color: colors.secondary }]}>
            {t("settings.llmConfigKeyHint")}
          </Text>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : (
            <View style={{ marginTop: 12 }}>
              <Field
                label={t("settings.llmProvider")}
                value={
                  LLM_PROVIDER_OPTIONS.find((o) => o.id === provider)?.name ??
                  provider
                }
                onPress={handleProviderPick}
                colors={colors}
              />
              <Field
                label={t("settings.llmModel")}
                value={model}
                onChangeText={setModel}
                colors={colors}
                placeholder="deepseek-chat"
              />
              <Field
                label={t("settings.llmApiKey")}
                value={apiKey}
                onChangeText={setApiKey}
                colors={colors}
                secureTextEntry
                placeholder={t("settings.llmConfigKeyHint")}
              />
              <Field
                label={t("settings.llmBaseUrl")}
                value={baseUrl}
                onChangeText={setBaseUrl}
                colors={colors}
                placeholder="https://api.deepseek.com/v1"
              />

              <View style={{ flexDirection: "row", marginTop: 24 }}>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    { backgroundColor: colors.primary, flex: 1 },
                  ]}
                  disabled={saving || testing}
                  onPress={handleSave}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>{t("common.save")}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.deleteButton,
                    { borderColor: colors.border, marginLeft: 12 },
                  ]}
                  disabled={saving || testing}
                  onPress={handleTest}
                >
                  {testing ? (
                    <ActivityIndicator color={colors.text} />
                  ) : (
                    <Text style={{ color: colors.text, fontWeight: "600" }}>
                      {t("settings.testConnection")}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  onPress?: () => void;
  colors: any;
  placeholder?: string;
  secureTextEntry?: boolean;
}

const Field: React.FC<FieldProps> = ({
  label,
  value,
  onChangeText,
  onPress,
  colors,
  placeholder,
  secureTextEntry,
}) => (
  <View style={{ marginBottom: 16 }}>
    <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    {onPress ? (
      <TouchableOpacity
        style={[
          styles.input,
          { borderColor: colors.border, backgroundColor: colors.card },
        ]}
        onPress={onPress}
      >
        <Text style={{ color: value ? colors.text : colors.secondary }}>
          {value || placeholder || "-"}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.secondary} />
      </TouchableOpacity>
    ) : (
      <TextInput
        style={[
          styles.input,
          {
            borderColor: colors.border,
            backgroundColor: colors.card,
            color: colors.text,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.secondary}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={secureTextEntry}
      />
    )}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  backButton: { padding: 5 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  description: { fontSize: 14, lineHeight: 20, marginTop: 8 },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 6, opacity: 0.8 },
  label: { fontSize: 14, marginBottom: 6, fontWeight: "600" },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  deleteButton: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
});
