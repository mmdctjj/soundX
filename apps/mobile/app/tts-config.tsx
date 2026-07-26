import { Ionicons } from "@expo/vector-icons";
import {
  deleteTtsProviderConfig,
  getTtsProviderConfigs,
  getTtsSupportedProviders,
  saveTtsProviderConfig,
  testTtsProviderConfig,
  type TtsProviderConfig,
  type TtsProviderOption,
} from "@soundx/services";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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

interface ProviderSchema {
  fields: string[];
  defaults: Record<string, string>;
}

const SCHEMAS: Record<string, ProviderSchema> = {
  mimo: {
    fields: ["apiKey", "model"],
    defaults: { model: "mimo-v2.5-tts" },
  },
  minimax: {
    fields: ["apiKey", "groupId", "model"],
    defaults: { model: "speech-2.8-hd" },
  },
  volc: {
    fields: ["appId", "apiKey"],
    defaults: {},
  },
};

const FIELD_TO_LABEL_KEY: Record<string, string> = {
  apiKey: "settings.ttsConfigFieldApiKey",
  appId: "settings.ttsConfigFieldAppId",
  groupId: "settings.ttsConfigFieldGroupId",
  model: "settings.ttsConfigFieldModel",
};

const FIELD_TO_CONFIG_KEY: Record<string, string> = {
  apiKey: "api_key",
  appId: "app_id",
  groupId: "group_id",
  model: "model",
};

const TtsConfigScreen: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [providers, setProviders] = useState<TtsProviderOption[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [configs, setConfigs] = useState<Record<string, TtsProviderConfig>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const schema = useMemo<ProviderSchema | null>(() => {
    if (!selected) return null;
    return SCHEMAS[selected] ?? { fields: ["apiKey"], defaults: {} };
  }, [selected]);

  useEffect(() => {
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
          list.find((p) => p.id === "mimo") ??
          list.find((p) => p.id in SCHEMAS) ??
          list[0];
        if (initial) setSelected(initial.id);
      } catch (error) {
        console.warn("Failed to load TTS configs", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selected) return;
    const stored = configs[selected] ?? {};
    const defaults = SCHEMAS[selected]?.defaults ?? {};
    const next: Record<string, string> = {};
    for (const field of Object.keys(FIELD_TO_LABEL_KEY)) {
      const cfgKey = FIELD_TO_CONFIG_KEY[field];
      const v = stored[cfgKey];
      next[field] = typeof v === "string" ? v : defaults[field] ?? "";
    }
    setDraft(next);
  }, [selected, configs]);

  const handleSave = async () => {
    if (!selected || !schema) return;
    setSaving(true);
    try {
      const payload: TtsProviderConfig = {};
      for (const field of schema.fields) {
        const v = (draft[field] ?? "").trim();
        if (v) payload[FIELD_TO_CONFIG_KEY[field]] = v;
      }
      const res = await saveTtsProviderConfig(selected, payload);
      setConfigs((prev) => ({
        ...prev,
        [selected]: res.config ?? {},
      }));
      Alert.alert(t("settings.ttsConfigSaveSuccess"));
    } catch (error) {
      Alert.alert(
        t("settings.ttsConfigSaveFailed"),
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!selected || !schema) return;
    setTesting(true);
    try {
      const payload: TtsProviderConfig = {};
      for (const field of schema.fields) {
        const v = (draft[field] ?? "").trim();
        if (v) payload[FIELD_TO_CONFIG_KEY[field]] = v;
      }
      await testTtsProviderConfig(selected, payload);
      Alert.alert(t("settings.testConnectionSuccess"));
    } catch (error: any) {
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        (error instanceof Error ? error.message : String(error));
      Alert.alert(t("settings.testConnectionFailed"), String(detail));
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = () => {
    if (!selected) return;
    Alert.alert(t("settings.ttsConfigDeleteSuccess"), undefined, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTtsProviderConfig(selected);
            setConfigs((prev) => {
              const next = { ...prev };
              delete next[selected];
              return next;
            });
            Alert.alert(t("settings.ttsConfigDeleteSuccess"));
          } catch (error) {
            Alert.alert(
              t("settings.ttsConfigSaveFailed"),
              error instanceof Error ? error.message : String(error),
            );
          }
        },
      },
    ]);
  };

  const pickProvider = () => {
    if (providers.length === 0) return;
    Alert.alert(
      t("settings.ttsConfig"),
      undefined,
      providers.map((p) => ({
        text: p.name,
        onPress: () => setSelected(p.id),
      })),
    );
  };

  const selectedLabel = providers.find((p) => p.id === selected)?.name ?? "-";
  const isConfigured = selected ? configs[selected] !== undefined : false;

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
          {t("settings.ttsConfig")}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.description, { color: colors.secondary }]}>
            {t("settings.ttsConfigDescription")}
          </Text>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : providers.length === 0 ? (
            <Text style={{ color: colors.secondary, marginTop: 24 }}>
              {t("settings.ttsConfigEmpty")}
            </Text>
          ) : (
            <View style={{ marginTop: 12 }}>
              <Field
                label={t("settings.ttsConfig")}
                value={selectedLabel + (isConfigured ? " ✓" : "")}
                onPress={pickProvider}
                colors={colors}
              />
              {schema?.fields.map((field) => (
                <Field
                  key={field}
                  label={t(FIELD_TO_LABEL_KEY[field])}
                  value={draft[field] ?? ""}
                  onChangeText={(v) =>
                    setDraft((prev) => ({ ...prev, [field]: v }))
                  }
                  colors={colors}
                  placeholder={
                    field === "apiKey" ? t("settings.llmConfigKeyHint") : undefined
                  }
                  secureTextEntry={field === "apiKey"}
                />
              ))}
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
                {isConfigured && (
                  <TouchableOpacity
                    style={[
                      styles.deleteButton,
                      { borderColor: colors.border, marginLeft: 12 },
                    ]}
                    onPress={handleDelete}
                  >
                    <Text style={{ color: colors.text, fontWeight: "600" }}>
                      {t("common.delete")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

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

export default TtsConfigScreen;
