import {
  Button,
  Collapse,
  Empty,
  Form,
  Input,
  Popconfirm,
  Progress,
  Space,
  Switch,
  Tag,
  Typography,
} from "antd";
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
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMessage } from "../../context/MessageContext";
import styles from "./index.module.less";

const { Text, Paragraph } = Typography;

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

interface SyncState {
  id: string;
  status?: string;
  message?: string;
  current?: number;
  total?: number;
}

const normalizePathList = (value?: string | string[]) => {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.length > 0 ? values : [""];
};

const compactPathList = (value?: string | string[]) =>
  normalizePathList(value)
    .map((p) => p.trim())
    .filter(Boolean);

const emptyPaths = () => ({ MUSIC: [""], AUDIOBOOK: [""], MV: [""] });

const WebDavSourcesSettings: React.FC = () => {
  const { t } = useTranslation();
  const message = useMessage();
  const [sources, setSources] = useState<WebDavSource[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [, setSyncing] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [legacyEnvImported, setLegacyEnvImported] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void load();
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    try {
      const res = await getWebDavSources();
      const rawList = (res.code === 200 ? res.data : []) as
        | WebDavSource[]
        | undefined;
      if (res.code === 200) {
        const list = (rawList || []).map((s: WebDavSource) => ({
          ...s,
          paths: {
            MUSIC: normalizePathList(s.paths?.MUSIC) as any,
            AUDIOBOOK: normalizePathList(s.paths?.AUDIOBOOK) as any,
            MV: normalizePathList(s.paths?.MV) as any,
          },
        }));
        setSources(list);
        setLegacyEnvImported(
          list.some((s: WebDavSource) => s.name.endsWith("(env)")),
        );
      } else {
        message.error(res.message || t("common.error"));
      }
    } catch (error) {
      console.error("Failed to load WebDAV sources", error);
      message.error(t("common.error"));
    } finally {
      setLoaded(true);
    }
  };

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
        paths: emptyPaths() as any,
      },
    ]);
  };

  const updateSource = (id: string, patch: Partial<WebDavSource>) => {
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
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  const handleTest = async (source: WebDavSource) => {
    if (!source.name.trim() || !source.url.trim()) {
      message.warning(t("settings.webdavSourceRequired"));
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
          MUSIC: compactPathList(source.paths?.MUSIC) as any,
          AUDIOBOOK: compactPathList(source.paths?.AUDIOBOOK) as any,
          MV: compactPathList(source.paths?.MV) as any,
        },
      });
      if (res.code === 200) {
        const result = res.data;
        if (result.success) {
          message.success(t("settings.webdavTestSuccess"));
        } else {
          const detailEntries = result.details
            ? Object.entries(result.details)
            : [];
          const detailMsg =
            detailEntries
              .filter(([, v]) => !(v as { success: boolean }).success)
              .map(([k, v]) => `${k}: ${(v as { message: string }).message}`)
              .join("; ") || result.message;
          message.error(`${t("settings.webdavTestFailed")}: ${detailMsg}`);
        }
      } else {
        message.error(res.message || t("settings.webdavTestFailed"));
      }
    } catch (error) {
      console.error("WebDAV test failed", error);
      message.error(t("settings.webdavTestFailed"));
    } finally {
      setTestingId(null);
    }
  };

  const handleSave = async (triggerSync: boolean) => {
    // Keep only rows that have at least a name; reject rows missing URL.
    const sanitized: WebDavSourceInput[] = [];
    for (const s of sources) {
      const name = s.name.trim();
      const url = s.url.trim();
      const pathInput = {
        MUSIC: compactPathList(s.paths?.MUSIC) as any,
        AUDIOBOOK: compactPathList(s.paths?.AUDIOBOOK) as any,
        MV: compactPathList(s.paths?.MV) as any,
      };
      if (
        !name &&
        !url &&
        !pathInput.MUSIC.length &&
        !pathInput.AUDIOBOOK.length &&
        !pathInput.MV.length
      ) {
        continue; // untouched empty row
      }
      if (!name || !url) {
        message.warning(t("settings.webdavSourceRequired"));
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
      const rawList = (res.code === 200 ? res.data : []) as
        | WebDavSource[]
        | undefined;
      if (res.code === 200) {
        const list = (rawList || []).map((s: WebDavSource) => ({
          ...s,
          paths: {
            MUSIC: normalizePathList(s.paths?.MUSIC) as any,
            AUDIOBOOK: normalizePathList(s.paths?.AUDIOBOOK) as any,
            MV: normalizePathList(s.paths?.MV) as any,
          },
        }));
        setSources(list);
        setLegacyEnvImported(false);
        message.success(t("settings.webdavSaveSuccess"));
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
        message.error(res.message || t("settings.webdavSaveFailed"));
      }
    } catch (error) {
      console.error("Save WebDAV sources failed", error);
      message.error(t("settings.webdavSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
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
            setSyncing(false);
            if (task.status === "SUCCESS") {
              message.success(task.message || t("settings.webdavSyncComplete"));
            } else {
              message.error(task.message || t("settings.webdavSyncFailed"));
            }
          }
        }
      } catch {
        // continue polling
      }
    }, 1500);
  };

  const runSync = async () => {
    setSyncing(true);
    try {
      const res = await triggerWebDavSync();
      if (res.code === 200 && res.data?.id) {
        setSyncState({ id: res.data.id, status: "INITIALIZING" });
        pollTask(res.data.id);
      } else {
        message.error(res.message || t("settings.webdavSyncFailed"));
        setSyncing(false);
      }
    } catch (error) {
      console.error("Trigger WebDAV sync failed", error);
      message.error(t("settings.webdavSyncFailed"));
      setSyncing(false);
    }
  };

  const renderPathTags = (source: WebDavSource) => {
    const tags: React.ReactNode[] = [];
    for (const f of PATH_FIELDS) {
      const paths = compactPathList(source.paths?.[f.kind]);
      if (paths.length > 0) {
        tags.push(
          <Tag key={f.kind} color="blue">
            {t(f.tagKey)}:{" "}
            {paths.length > 1 ? `${paths[0]} +${paths.length - 1}` : paths[0]}
          </Tag>,
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
    <div className={styles.webdavWrapper}>
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        {t("settings.webdavSourcesDescription")}
      </Paragraph>
      <Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 12 }}>
        {t("settings.webdavPathHint")}
      </Paragraph>

      {legacyEnvImported && (
        <Paragraph type="warning" style={{ marginBottom: 12 }}>
          {t("settings.webdavLegacyEnvHint")}
        </Paragraph>
      )}

      {loaded && sources.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t("settings.webdavEmpty")}
          style={{ margin: "32px 0" }}
        />
      ) : (
        <Collapse
          accordion={false}
          activeKey={sources.map((s) => s.id)}
          items={sources.map((source) => ({
            key: source.id,
            label: (
              <Space size={4} wrap>
                <Text strong>
                  {source.name || t("settings.webdavSourceName")}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {source.url || "—"}
                </Text>
                {renderPathTags(source)}
                {!source.enabled && (
                  <Tag color="default">
                    {t("settings.webdavSourceEnabled")}: OFF
                  </Tag>
                )}
              </Space>
            ),
            children: (
              <Form layout="vertical" size="middle">
                <Form.Item label={t("settings.webdavSourceName")}>
                  <Input
                    value={source.name}
                    placeholder={t("settings.webdavSourceNamePlaceholder")}
                    onChange={(e) =>
                      updateSource(source.id, { name: e.target.value })
                    }
                  />
                </Form.Item>
                <Form.Item label={t("settings.webdavSourceUrl")}>
                  <Input
                    value={source.url}
                    placeholder={t("settings.webdavSourceUrlPlaceholder")}
                    onChange={(e) =>
                      updateSource(source.id, { url: e.target.value })
                    }
                  />
                </Form.Item>
                <Form.Item label={t("settings.webdavSourceUsername")}>
                  <Input
                    value={source.username || ""}
                    placeholder={t("settings.webdavSourceUsernamePlaceholder")}
                    onChange={(e) =>
                      updateSource(source.id, { username: e.target.value })
                    }
                  />
                </Form.Item>
                <Form.Item
                  label={t("settings.webdavSourcePassword")}
                  extra={t("settings.webdavPasswordStoredHint")}
                >
                  <Input.Password
                    value={source.password || ""}
                    placeholder={t("settings.webdavSourcePasswordPlaceholder")}
                    onChange={(e) =>
                      updateSource(source.id, { password: e.target.value })
                    }
                  />
                </Form.Item>
                {PATH_FIELDS.map((f) => (
                  <Form.Item key={f.kind} label={t(f.labelKey)}>
                    <Space direction="vertical" style={{ width: "100%" }}>
                      {normalizePathList(source.paths?.[f.kind]).map(
                        (pathValue, index) => (
                          <Space.Compact
                            key={`${f.kind}-${index}`}
                            style={{ width: "100%" }}
                          >
                            <Input
                              value={pathValue}
                              placeholder={t(f.placeholderKey)}
                              onChange={(e) =>
                                updateSourcePath(
                                  source.id,
                                  f.kind,
                                  index,
                                  e.target.value,
                                )
                              }
                            />
                            <Button
                              onClick={() =>
                                removeSourcePath(source.id, f.kind, index)
                              }
                              disabled={
                                normalizePathList(source.paths?.[f.kind])
                                  .length <= 1
                              }
                            >
                              -
                            </Button>
                          </Space.Compact>
                        ),
                      )}
                      <Button
                        type="dashed"
                        size="small"
                        onClick={() => addSourcePath(source.id, f.kind)}
                      >
                        + {t(f.labelKey)}
                      </Button>
                    </Space>
                  </Form.Item>
                ))}
                <Form.Item>
                  <Space wrap>
                    <Switch
                      checked={source.enabled}
                      checkedChildren={t("settings.webdavSourceEnabled")}
                      unCheckedChildren={t("settings.webdavSourceEnabled")}
                      onChange={(val) =>
                        updateSource(source.id, { enabled: val })
                      }
                    />
                    <Button
                      loading={testingId === source.id}
                      onClick={() => handleTest(source)}
                    >
                      {testingId === source.id
                        ? t("settings.webdavTestingConnection")
                        : t("settings.webdavTestConnection")}
                    </Button>
                    <Popconfirm
                      title={t("settings.webdavSourceRemove")}
                      onConfirm={() => removeSource(source.id)}
                    >
                      <Button danger>{t("settings.webdavSourceRemove")}</Button>
                    </Popconfirm>
                  </Space>
                </Form.Item>
              </Form>
            ),
          }))}
        />
      )}

      <Space style={{ marginTop: 16 }} wrap>
        <Button onClick={addSource} type="dashed">
          + {t("settings.webdavAddSource")}
        </Button>
        <Button
          type="primary"
          loading={saving}
          onClick={() => handleSave(true)}
          disabled={sources.length === 0}
        >
          {saving
            ? t("settings.webdavSaving")
            : t("settings.webdavSaveAndSync")}
        </Button>
        <Button
          onClick={() => handleSave(false)}
          loading={saving}
          disabled={sources.length === 0}
        >
          {saving
            ? t("settings.webdavSaving")
            : t("settings.webdavSaveSuccess")}
        </Button>
      </Space>

      {syncState && (
        <div className={styles.webdavSyncPanel}>
          <Text strong>{t("settings.webdavSyncStatus")}: </Text>
          <Tag
            color={
              syncState.status === "SUCCESS"
                ? "green"
                : syncState.status === "FAILED"
                  ? "red"
                  : "blue"
            }
          >
            {syncState.status}
          </Tag>
          {syncState.message && (
            <Text type="secondary" style={{ marginLeft: 8 }}>
              {syncState.message}
            </Text>
          )}
          {syncState.total !== undefined && syncState.total > 0 && (
            <div style={{ marginTop: 8 }}>
              <Progress
                percent={progress}
                size="small"
                status={syncState.status === "FAILED" ? "exception" : "active"}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("settings.webdavProgressCurrent")}: {syncState.current ?? 0}{" "}
                / {syncState.total ?? 0}
              </Text>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WebDavSourcesSettings;
