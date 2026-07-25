import { Ionicons } from "@expo/vector-icons";
import {
  getFileSources,
  saveFileSources,
  syncFileSources,
  getImportTask,
  type FileSources,
  type FileSourcesView,
} from "@soundx/services";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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

const FIELDS = [
  { key: "musicDirs", labelKey: "settings.fileSourcesMusic" },
  { key: "audiobookDirs", labelKey: "settings.fileSourcesAudiobook" },
  { key: "mvDirs", labelKey: "settings.fileSourcesMv" },
  { key: "txtDirs", labelKey: "settings.fileSourcesTxt" },
] as const;

type SourceRow = {
  value: string;
  exists: boolean | null;
};

type SourceRows = Record<keyof FileSources, SourceRow[]>;

const normalize = (arr?: string[]) => (arr && arr.length > 0 ? arr : [""]);

const normalizeRows = (values?: string[], exists?: boolean[]): SourceRow[] =>
  normalize(values).map((value, idx) => ({
    value,
    exists: values && values.length > 0 ? exists?.[idx] ?? null : null,
  }));

const rowsFromView = (view: FileSourcesView): SourceRows => ({
  musicDirs: normalizeRows(view.sources.musicDirs, view.exists.musicDirs),
  audiobookDirs: normalizeRows(
    view.sources.audiobookDirs,
    view.exists.audiobookDirs,
  ),
  mvDirs: normalizeRows(view.sources.mvDirs, view.exists.mvDirs),
  txtDirs: normalizeRows(view.sources.txtDirs, view.exists.txtDirs),
});

const emptyRows = (): SourceRows => ({
  musicDirs: [{ value: "", exists: null }],
  audiobookDirs: [{ value: "", exists: null }],
  mvDirs: [{ value: "", exists: null }],
  txtDirs: [{ value: "", exists: null }],
});

export default function FileSourcesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [rows, setRows] = useState<SourceRows>(emptyRows);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<{
    current?: number;
    total?: number;
    message?: string;
  } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await getFileSources();
      if (res.code === 200) {
        const view = res.data as FileSourcesView;
        setRows(rowsFromView(view));
      } else {
        Alert.alert(t("common.error"), res.message || t("common.error"));
      }
    } catch (error) {
      console.error("Failed to load file sources", error);
      Alert.alert(t("common.error"), t("common.error"));
    }
  }, [t]);

  useEffect(() => {
    void load();
    return () => stopPolling();
  }, [load, stopPolling]);

  const setLine = (key: keyof FileSources, idx: number, value: string) => {
    setRows((prev) => {
      const next = [...prev[key]];
      next[idx] = { value, exists: null };
      return { ...prev, [key]: next };
    });
  };
  const addLine = (key: keyof FileSources) =>
    setRows((prev) => ({
      ...prev,
      [key]: [...prev[key], { value: "", exists: null }],
    }));
  const removeLine = (key: keyof FileSources, idx: number) =>
    setRows((prev) => {
      const next = prev[key].filter((_, i) => i !== idx);
      return {
        ...prev,
        [key]: next.length > 0 ? next : [{ value: "", exists: null }],
      };
    });

  const compact = (sourceRows: SourceRow[]) =>
    sourceRows.map(({ value }) => value.trim()).filter(Boolean);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: FileSources = {
        musicDirs: compact(rows.musicDirs),
        audiobookDirs: compact(rows.audiobookDirs),
        mvDirs: compact(rows.mvDirs),
        txtDirs: compact(rows.txtDirs),
      };
      const res = await saveFileSources(payload);
      if (res.code === 200) {
        const view = res.data as FileSourcesView;
        setRows(rowsFromView(view));
        Alert.alert(t("common.success"), t("settings.fileSourcesSaveSuccess"));
      } else {
        Alert.alert(t("settings.fileSourcesSaveFailed"), res.message || "");
      }
    } catch (error: any) {
      console.error("Save file sources failed", error);
      Alert.alert(
        t("settings.fileSourcesSaveFailed"),
        error?.message || "",
      );
    } finally {
      setSaving(false);
    }
  };

  const pollTask = (id: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await getImportTask(id);
        if (res.code !== 200) {
          stopPolling();
          setSyncing(false);
          Alert.alert(
            t("settings.fileSourcesSyncFailed"),
            res.message || "",
          );
          return;
        }
        const task = res.data;
        if (!task || task.id !== id) return;
        setProgress({
          current: task.current,
          total: task.total,
          message: task.message,
        });
        if (task.status === "SUCCESS" || task.status === "FAILED") {
          stopPolling();
          setSyncing(false);
          if (task.status === "SUCCESS") {
            Alert.alert(
              t("common.success"),
              task.message || t("settings.fileSourcesSyncComplete"),
            );
          } else {
            Alert.alert(
              t("settings.fileSourcesSyncFailed"),
              task.message || "",
            );
          }
        }
      } catch {
        /* keep polling */
      }
    }, 1500);
  };
  const handleSync = async () => {
    setSyncing(true);
    setProgress({ current: 0, total: 0 });
    try {
      const res = await syncFileSources();
      if (res.code === 200 && res.data?.taskId) {
        pollTask(res.data.taskId);
      } else {
        Alert.alert(t("settings.fileSourcesSyncFailed"), res.message || "");
        setSyncing(false);
      }
    } catch (error: any) {
      console.error("Trigger file sync failed", error);
      Alert.alert(
        t("settings.fileSourcesSyncFailed"),
        error?.message || "",
      );
      setSyncing(false);
    }
  };

  const pct =
    progress && progress.total && progress.total > 0
      ? Math.min(100, Math.round(((progress.current || 0) / progress.total) * 100))
      : 0;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => goBackOrReplace(router, "/settings")}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t("settings.fileSources")}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.description, { color: colors.secondary }]}>
          {t("settings.fileSourcesDescription")}
        </Text>

        {FIELDS.map(({ key, labelKey }) => (
          <View key={key} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t(labelKey)}
            </Text>
            {(rows[key] ?? [{ value: "", exists: null }]).map(
              ({ value, exists }, idx) => {
                const list = rows[key] ?? [];
                return (
                  <View key={idx} style={styles.pathRow}>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          color: colors.text,
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                      ]}
                      value={value}
                      onChangeText={(v) => setLine(key, idx, v)}
                      placeholder={t("settings.filePathPlaceholder")}
                      placeholderTextColor={colors.secondary}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => removeLine(key, idx)}
                      disabled={list.length <= 1}
                      style={[
                        styles.iconButton,
                        { borderColor: colors.border },
                      ]}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color={list.length <= 1 ? colors.secondary : "#cf1322"}
                      />
                    </TouchableOpacity>
                  </View>
                );
              },
            )}
            <TouchableOpacity
              onPress={() => addLine(key)}
              style={[
                styles.addBtn,
                { borderColor: colors.primary },
              ]}
            >
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: "600" }}>
                {t("settings.fileSourcesAddPath")}
              </Text>
            </TouchableOpacity>
            <View style={styles.tagRow}>
              {(rows[key] ?? []).map(
                (row, i) =>
                  row.exists === null ? null : (
                    <View
                      key={i}
                      style={[
                        styles.tag,
                        { backgroundColor: row.exists ? "#52c41a22" : "#faad1422" },
                      ]}
                    >
                      <Text
                        style={{
                          color: row.exists ? "#389e0d" : "#d46b08",
                          fontSize: 12,
                        }}
                      >
                        {row.value || "(empty)"} ·{" "}
                        {row.exists
                          ? t("settings.filePathExists")
                          : t("settings.filePathMissing")}
                      </Text>
                    </View>
                  ),
              )}
            </View>
          </View>
        ))}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            disabled={saving}
            onPress={handleSave}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>{t("common.save")}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            disabled={syncing}
            onPress={handleSync}
          >
            {syncing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>
                {t("settings.fileSourcesSync")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        {progress && (
          <View
            style={[
              styles.syncPanel,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            <Text style={{ color: colors.text }}>
              {progress.message || ""} ({pct}%)
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  scrollContent: { padding: 16, paddingBottom: 80, gap: 8 },
  description: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: "600", marginBottom: 8 },
  pathRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: 4,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 6, marginBottom: 4 },
  actions: { flexDirection: "row", gap: 12, marginTop: 16 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#fff", fontWeight: "600" },
  syncPanel: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
});
