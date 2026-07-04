import { Ionicons } from "@expo/vector-icons";
import {
  getCurrentWebDavSyncTask,
  getWebDavSources,
  saveWebDavSources,
  testWebDavConnection,
  triggerWebDavSync,
  type WebDavPathKind,
  type WebDavSource,
  type WebDavSourceInput,
} from "@soundx/services";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
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
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../src/context/ThemeContext";
import { trackEvent } from "../src/services/tracking";
import { goBackOrReplace } from "../src/utils/navigation";

interface EditableSource extends WebDavSource {
  // Local-only UI state: which row is expanded in the accordion.
  expanded?: boolean;
}

interface SyncState {
  id: string;
  status?: string;
  message?: string;
  current?: number;
  total?: number;
}

const PATH_FIELDS: {
  kind: WebDavPathKind;
  labelKey: string;
  placeholderKey: string;
  tagKey: string;
}[] = [
    {
      kind: "MUSIC",
      labelKey: "settings.webdavPathMusic",
      placeholderKey: "settings.webdavPathMusicPlaceholder",
      tagKey: "settings.webdavSourceTypeMusic",
    },
    {
      kind: "AUDIOBOOK",
      labelKey: "settings.webdavPathAudiobook",
      placeholderKey: "settings.webdavPathAudiobookPlaceholder",
      tagKey: "settings.webdavSourceTypeAudiobook",
    },
    {
      kind: "MV",
      labelKey: "settings.webdavPathMv",
      placeholderKey: "settings.webdavPathMvPlaceholder",
      tagKey: "settings.webdavSourceTypeMv",
    },
  ];

const generateId = () =>
  `wd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const normalizePathList = (value?: string | string[]) => {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.length > 0 ? values : [""];
};

const compactPathList = (value?: string | string[]) =>
  normalizePathList(value)
    .map((p) => p.trim())
    .filter(Boolean);

export default function WebDavSourcesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [sources, setSources] = useState<EditableSource[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [legacyEnvImported, setLegacyEnvImported] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await getWebDavSources();
      const list = (res.code === 200 ? res.data : []) as
        | WebDavSource[]
        | undefined;
      if (res.code === 200) {
        const editable: EditableSource[] = (list || []).map((s, idx) => ({
          ...s,
          paths: {
            MUSIC: normalizePathList(s.paths?.MUSIC),
            AUDIOBOOK: normalizePathList(s.paths?.AUDIOBOOK),
            MV: normalizePathList(s.paths?.MV),
          },
          // Expand only the first row by default; others stay collapsed.
          expanded: idx === 0,
        }));
        setSources(editable);
        setLegacyEnvImported(editable.some((s) => s.name.endsWith("(env)")));
      } else {
        Alert.alert(t("common.error"), res.message || t("common.error"));
      }
    } catch (error) {
      console.error("Failed to load WebDAV sources", error);
      Alert.alert(t("common.error"), t("common.error"));
    } finally {
      setLoaded(true);
    }
  }, [t]);

  useEffect(() => {
    void load();
    return () => stopPolling();
  }, [load, stopPolling]);

  const addSource = () => {
    setSources((prev) => [
      ...prev,
      {
        id: generateId(),
        name: "",
        url: "",
        username: "",
        password: "",
        enabled: true,
        paths: { MUSIC: [""], AUDIOBOOK: [""], MV: [""] },
        expanded: true,
      },
    ]);
  };

  const updateSource = (id: string, patch: Partial<EditableSource>) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  };

  const updateSourcePath = (
    id: string,
    kind: WebDavPathKind,
    index: number,
    value: string,
  ) => {
    setSources((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const next = normalizePathList(s.paths?.[kind]);
        next[index] = value;
        return { ...s, paths: { ...s.paths, [kind]: next } };
      }),
    );
  };

  const addSourcePath = (id: string, kind: WebDavPathKind) => {
    setSources((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
            ...s,
            paths: {
              ...s.paths,
              [kind]: [...normalizePathList(s.paths?.[kind]), ""],
            },
          }
          : s,
      ),
    );
  };

  const removeSourcePath = (
    id: string,
    kind: WebDavPathKind,
    index: number,
  ) => {
    setSources((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const next = normalizePathList(s.paths?.[kind]).filter(
          (_, i) => i !== index,
        );
        return {
          ...s,
          paths: { ...s.paths, [kind]: next.length > 0 ? next : [""] },
        };
      }),
    );
  };

  const removeSource = (id: string) => {
    Alert.alert(t("settings.webdavSourceRemove"), "", [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.webdavSourceRemove"),
        style: "destructive",
        onPress: () => setSources((prev) => prev.filter((s) => s.id !== id)),
      },
    ]);
  };

  const handleTest = async (source: EditableSource) => {
    if (!source.name.trim() || !source.url.trim()) {
      Alert.alert(t("settings.webdavSourceRequired"));
      return;
    }
    setTestingId(source.id);
    try {
      const res = await testWebDavConnection({
        name: source.name,
        url: source.url,
        username: source.username,
        password: source.password,
        enabled: source.enabled,
        paths: {
          MUSIC: compactPathList(source.paths?.MUSIC),
          AUDIOBOOK: compactPathList(source.paths?.AUDIOBOOK),
          MV: compactPathList(source.paths?.MV),
        },
      });
      if (res.code === 200) {
        const result = res.data;
        if (result.success) {
          Alert.alert(t("settings.webdavTestSuccess"));
        } else {
          const detailEntries = result.details
            ? Object.entries(result.details)
            : [];
          const detailMsg =
            detailEntries
              .filter(([, v]) => !(v as { success: boolean }).success)
              .map(([k, v]) => `${k}: ${(v as { message: string }).message}`)
              .join("\n") || result.message;
          Alert.alert(t("settings.webdavTestFailed"), detailMsg);
        }
      } else {
        Alert.alert(t("settings.webdavTestFailed"), res.message);
      }
    } catch (error) {
      console.error("WebDAV test failed", error);
      Alert.alert(t("settings.webdavTestFailed"));
    } finally {
      setTestingId(null);
    }
  };

  const handleSave = async (triggerSync: boolean) => {
    const sanitized: WebDavSourceInput[] = [];
    for (const s of sources) {
      const name = s.name.trim();
      const url = s.url.trim();
      const pathInput = {
        MUSIC: compactPathList(s.paths?.MUSIC),
        AUDIOBOOK: compactPathList(s.paths?.AUDIOBOOK),
        MV: compactPathList(s.paths?.MV),
      };
      if (
        !name &&
        !url &&
        !pathInput.MUSIC.length &&
        !pathInput.AUDIOBOOK.length &&
        !pathInput.MV.length
      ) {
        continue;
      }
      if (!name || !url) {
        Alert.alert(t("settings.webdavSourceRequired"));
        return;
      }
      sanitized.push({
        id: s.id,
        name,
        url,
        username: s.username?.trim() || undefined,
        password: s.password || undefined,
        enabled: s.enabled,
        paths: pathInput,
      });
    }

    setSaving(true);
    try {
      const res = await saveWebDavSources(sanitized);
      const saved = (res.code === 200 ? res.data : []) as
        | WebDavSource[]
        | undefined;
      if (res.code === 200) {
        const editable: EditableSource[] = (saved || []).map(
          (s: WebDavSource, idx: number) => ({
            ...s,
            paths: {
              MUSIC: normalizePathList(s.paths?.MUSIC),
              AUDIOBOOK: normalizePathList(s.paths?.AUDIOBOOK),
              MV: normalizePathList(s.paths?.MV),
            },
            expanded: idx === 0,
          }),
        );
        setSources(editable);
        setLegacyEnvImported(false);
        Alert.alert(t("settings.webdavSaveSuccess"));
        trackEvent({
          feature: "settings",
          eventName: "webdav_sources_save",
          metadata: { count: sanitized.length },
        });
        const hasAnyPath = sanitized.some(
          (s) =>
            s.paths?.MUSIC?.length ||
            s.paths?.AUDIOBOOK?.length ||
            s.paths?.MV?.length,
        );
        if (triggerSync && sanitized.length > 0 && hasAnyPath) {
          await runSync();
        }
      } else {
        Alert.alert(t("settings.webdavSaveFailed"), res.message);
      }
    } catch (error) {
      console.error("Save WebDAV sources failed", error);
      Alert.alert(t("settings.webdavSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const pollTask = (id: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await getCurrentWebDavSyncTask();
        if (res.code === 200) {
          const task = res.data;
          if (!task || task.id !== id) return;
          setSyncState({
            id,
            status: task.status,
            message: task.message,
            current: task.current,
            total: task.total,
          });
          if (task.status === "SUCCESS" || task.status === "FAILED") {
            stopPolling();
            if (task.status === "SUCCESS") {
              Alert.alert(t("settings.webdavSyncComplete"), task.message || "");
            } else {
              Alert.alert(t("settings.webdavSyncFailed"), task.message || "");
            }
          }
        }
      } catch {
        // continue polling
      }
    }, 1500);
  };

  const runSync = async () => {
    try {
      const res = await triggerWebDavSync();
      if (res.code === 200 && res.data?.id) {
        setSyncState({ id: res.data.id, status: "INITIALIZING" });
        pollTask(res.data.id);
      } else {
        Alert.alert(t("settings.webdavSyncFailed"), res.message);
      }
    } catch (error) {
      console.error("Trigger WebDAV sync failed", error);
      Alert.alert(t("settings.webdavSyncFailed"));
    }
  };

  const renderPathTags = (source: EditableSource) => {
    const tags: React.ReactNode[] = [];
    for (const f of PATH_FIELDS) {
      const paths = compactPathList(source.paths?.[f.kind]);
      if (paths.length > 0) {
        tags.push(
          <View
            key={f.kind}
            style={[styles.tag, { borderColor: colors.primary }]}
          >
            <Text style={[styles.tagText, { color: colors.primary }]}>
              {t(f.tagKey)}:{" "}
              {paths.length > 1 ? `${paths[0]} +${paths.length - 1}` : paths[0]}
            </Text>
          </View>,
        );
      }
    }
    return tags;
  };

  const progress = useMemo(() => {
    if (!syncState || !syncState.total || syncState.total <= 0) return 0;
    return Math.min(
      100,
      Math.round(((syncState.current || 0) / syncState.total) * 100),
    );
  }, [syncState]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => goBackOrReplace(router, "/settings")}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t("settings.webdavSources")}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.description, { color: colors.secondary }]}>
            {t("settings.webdavSourcesDescription")}
          </Text>
          <Text style={[styles.descriptionHint, { color: colors.secondary }]}>
            {t("settings.webdavPathHint")}
          </Text>

          {legacyEnvImported && (
            <Text style={[styles.legacyHint, { color: "#D48806" }]}>
              {t("settings.webdavLegacyEnvHint")}
            </Text>
          )}

          {loaded && sources.length === 0 ? (
            <View style={[styles.emptyCard, { borderColor: colors.border }]}>
              <Text style={[styles.emptyText, { color: colors.secondary }]}>
                {t("settings.webdavEmpty")}
              </Text>
            </View>
          ) : (
            sources.map((source) => {
              const isExpanded = source.expanded ?? false;
              const hasValue = !!(source.url || source.name);
              return (
                <View
                  key={source.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={() =>
                      updateSource(source.id, { expanded: !isExpanded })
                    }
                    activeOpacity={hasValue ? 0.7 : 1}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>
                        {source.name || t("settings.webdavSourceName")}
                      </Text>
                      <Text
                        style={[
                          styles.cardSubtitle,
                          { color: colors.secondary },
                        ]}
                        numberOfLines={1}
                      >
                        {source.url || "—"}
                      </Text>
                      <View style={styles.tagsRow}>
                        {renderPathTags(source)}
                      </View>
                    </View>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={22}
                      color={colors.secondary}
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.cardBody}>
                      <View style={styles.inputGroup}>
                        <Text
                          style={[styles.label, { color: colors.secondary }]}
                        >
                          {t("settings.webdavSourceName")}
                        </Text>
                        <TextInput
                          style={[
                            styles.input,
                            {
                              color: colors.text,
                              borderColor: colors.border,
                              backgroundColor: colors.background,
                            },
                          ]}
                          value={source.name}
                          placeholder={t(
                            "settings.webdavSourceNamePlaceholder",
                          )}
                          placeholderTextColor={colors.secondary}
                          onChangeText={(val) =>
                            updateSource(source.id, { name: val })
                          }
                          autoCapitalize="none"
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text
                          style={[styles.label, { color: colors.secondary }]}
                        >
                          {t("settings.webdavSourceUrl")}
                        </Text>
                        <TextInput
                          style={[
                            styles.input,
                            {
                              color: colors.text,
                              borderColor: colors.border,
                              backgroundColor: colors.background,
                            },
                          ]}
                          value={source.url}
                          placeholder={t("settings.webdavSourceUrlPlaceholder")}
                          placeholderTextColor={colors.secondary}
                          onChangeText={(val) =>
                            updateSource(source.id, { url: val })
                          }
                          autoCapitalize="none"
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text
                          style={[styles.label, { color: colors.secondary }]}
                        >
                          {t("settings.webdavSourceUsername")}
                        </Text>
                        <TextInput
                          style={[
                            styles.input,
                            {
                              color: colors.text,
                              borderColor: colors.border,
                              backgroundColor: colors.background,
                            },
                          ]}
                          value={source.username || ""}
                          placeholder={t(
                            "settings.webdavSourceUsernamePlaceholder",
                          )}
                          placeholderTextColor={colors.secondary}
                          onChangeText={(val) =>
                            updateSource(source.id, { username: val })
                          }
                          autoCapitalize="none"
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text
                          style={[styles.label, { color: colors.secondary }]}
                        >
                          {t("settings.webdavSourcePassword")}
                        </Text>
                        <TextInput
                          style={[
                            styles.input,
                            {
                              color: colors.text,
                              borderColor: colors.border,
                              backgroundColor: colors.background,
                            },
                          ]}
                          value={source.password || ""}
                          placeholder={t(
                            "settings.webdavSourcePasswordPlaceholder",
                          )}
                          placeholderTextColor={colors.secondary}
                          onChangeText={(val) =>
                            updateSource(source.id, { password: val })
                          }
                          autoCapitalize="none"
                          secureTextEntry
                        />
                        <Text
                          style={[styles.hint, { color: colors.secondary }]}
                        >
                          {t("settings.webdavPasswordStoredHint")}
                        </Text>
                      </View>

                      {PATH_FIELDS.map((f) => (
                        <View key={f.kind} style={styles.inputGroup}>
                          <Text
                            style={[styles.label, { color: colors.secondary }]}
                          >
                            {t(f.labelKey)}
                          </Text>
                          {normalizePathList(source.paths?.[f.kind]).map(
                            (pathValue, index) => (
                              <View
                                key={`${f.kind}-${index}`}
                                style={styles.pathRow}
                              >
                                <TextInput
                                  style={[
                                    styles.input,
                                    styles.pathInput,
                                    {
                                      color: colors.text,
                                      borderColor: colors.border,
                                      backgroundColor: colors.background,
                                    },
                                  ]}
                                  value={pathValue}
                                  placeholder={t(f.placeholderKey)}
                                  placeholderTextColor={colors.secondary}
                                  onChangeText={(val) =>
                                    updateSourcePath(
                                      source.id,
                                      f.kind,
                                      index,
                                      val,
                                    )
                                  }
                                  autoCapitalize="none"
                                />
                                <TouchableOpacity
                                  style={[
                                    styles.pathIconButton,
                                    { borderColor: colors.border },
                                  ]}
                                  onPress={() =>
                                    removeSourcePath(source.id, f.kind, index)
                                  }
                                  disabled={
                                    normalizePathList(source.paths?.[f.kind])
                                      .length <= 1
                                  }
                                >
                                  <Ionicons
                                    name="remove"
                                    size={18}
                                    color={colors.secondary}
                                  />
                                </TouchableOpacity>
                              </View>
                            ),
                          )}
                          <TouchableOpacity
                            style={[
                              styles.addPathButton,
                              { borderColor: colors.primary },
                            ]}
                            onPress={() => addSourcePath(source.id, f.kind)}
                          >
                            <Ionicons
                              name="add"
                              size={16}
                              color={colors.primary}
                            />
                            <Text
                              style={{
                                color: colors.primary,
                                fontWeight: "600",
                              }}
                            >
                              {t(f.labelKey)}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ))}

                      <View style={styles.actionsRow}>
                        <View style={styles.switchRow}>
                          <Switch
                            value={source.enabled}
                            onValueChange={(val) =>
                              updateSource(source.id, { enabled: val })
                            }
                            trackColor={{
                              false: "#767577",
                              true: colors.primary,
                            }}
                            thumbColor="#f4f3f4"
                          />
                          <Text
                            style={[styles.switchLabel, { color: colors.text }]}
                          >
                            {t("settings.webdavSourceEnabled")}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.testButton,
                            { borderColor: colors.primary },
                          ]}
                          onPress={() => handleTest(source)}
                          disabled={testingId === source.id}
                        >
                          {testingId === source.id ? (
                            <ActivityIndicator color={colors.primary} />
                          ) : (
                            <Text
                              style={{
                                color: colors.primary,
                                fontWeight: "600",
                              }}
                            >
                              {t("settings.webdavTestConnection")}
                            </Text>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.removeButton,
                            { borderColor: "#FF3B30" },
                          ]}
                          onPress={() => removeSource(source.id)}
                        >
                          <Text style={{ color: "#FF3B30", fontWeight: "600" }}>
                            {t("settings.webdavSourceRemove")}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}

          <TouchableOpacity
            style={[
              styles.addButton,
              { borderColor: colors.primary, backgroundColor: colors.card },
            ]}
            onPress={addSource}
          >
            <Ionicons
              name="add-circle-outline"
              size={18}
              color={colors.primary}
            />
            <Text style={[styles.addButtonText, { color: colors.primary }]}>
              {t("settings.webdavAddSource")}
            </Text>
          </TouchableOpacity>

          <View style={styles.footerButtons}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                {
                  backgroundColor:
                    sources.length === 0 ? colors.border : colors.primary,
                },
              ]}
              onPress={() => handleSave(true)}
              disabled={saving || sources.length === 0}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {t("settings.webdavSaveAndSync")}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={() => handleSave(false)}
              disabled={saving || sources.length === 0}
            >
              <Text
                style={[styles.secondaryButtonText, { color: colors.text }]}
              >
                {t("settings.webdavSaveSuccess")}
              </Text>
            </TouchableOpacity>
          </View>

          {syncState && (
            <View
              style={[
                styles.syncPanel,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}
            >
              <Text style={[styles.syncTitle, { color: colors.text }]}>
                {t("settings.webdavSyncStatus")}: {syncState.status}
              </Text>
              {syncState.message && (
                <Text style={[styles.syncMessage, { color: colors.secondary }]}>
                  {syncState.message}
                </Text>
              )}
              {syncState.total !== undefined && syncState.total > 0 && (
                <>
                  <View
                    style={[
                      styles.progressBar,
                      { backgroundColor: colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: colors.primary,
                          width: `${progress}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[styles.syncProgress, { color: colors.secondary }]}
                  >
                    {t("settings.webdavProgressCurrent")}:{" "}
                    {syncState.current ?? 0} / {syncState.total ?? 0}
                  </Text>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  backButton: { padding: 5 },
  scrollContent: { padding: 15, gap: 12, paddingBottom: 60 },
  description: { fontSize: 13, lineHeight: 18 },
  descriptionHint: { fontSize: 12, lineHeight: 16 },
  legacyHint: { fontSize: 12, lineHeight: 16 },
  emptyCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
  },
  emptyText: { fontSize: 14, textAlign: "center" },
  card: { padding: 12, borderRadius: 12, borderWidth: 1 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardSubtitle: { fontSize: 12, marginTop: 2 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 6, gap: 6 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  tagText: { fontSize: 11, fontWeight: "500" },
  cardBody: { marginTop: 12, gap: 10 },
  inputGroup: { gap: 4 },
  label: { fontSize: 12 },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  hint: { fontSize: 11 },
  pathRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pathInput: { flex: 1 },
  pathIconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  addPathButton: {
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
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 10,
  },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  switchLabel: { fontSize: 13, fontWeight: "500" },
  testButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: 8,
  },
  addButtonText: { fontSize: 14, fontWeight: "600" },
  footerButtons: { gap: 10, marginTop: 8 },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  syncPanel: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  syncTitle: { fontSize: 14, fontWeight: "700" },
  syncMessage: { fontSize: 12 },
  syncProgress: { fontSize: 12 },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 4,
  },
  progressFill: { height: "100%" },
});
