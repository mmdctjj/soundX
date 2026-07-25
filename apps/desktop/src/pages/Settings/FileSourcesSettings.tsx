import {
  Button,
  Input,
  Progress,
  Space,
  Tag,
  Typography,
  message as antdMessage,
} from "antd";
import {
  getFileSources,
  saveFileSources,
  syncFileSources,
  getImportTask,
  type FileSources,
  type FileSourcesView,
} from "@soundx/services";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMessage } from "../../context/MessageContext";

const { Text, Paragraph } = Typography;

const FIELDS = [
  {
    key: "musicDirs",
    labelKey: "settings.fileSourcesMusic",
    placeholderKey: "settings.filePathPlaceholder",
    existsKey: "settings.filePathExists",
  },
  {
    key: "audiobookDirs",
    labelKey: "settings.fileSourcesAudiobook",
    placeholderKey: "settings.filePathPlaceholder",
    existsKey: "settings.filePathExists",
  },
  {
    key: "mvDirs",
    labelKey: "settings.fileSourcesMv",
    placeholderKey: "settings.filePathPlaceholder",
    existsKey: "settings.filePathExists",
  },
  {
    key: "txtDirs",
    labelKey: "settings.fileSourcesTxt",
    placeholderKey: "settings.filePathPlaceholder",
    existsKey: "settings.filePathExists",
  },
] as const;

const normalize = (arr?: string[]) => (arr && arr.length > 0 ? arr : [""]);

const FileSourcesSettings: React.FC = () => {
  const { t } = useTranslation();
  const message = useMessage();
  const [sources, setSources] = useState<FileSources>({
    musicDirs: [""],
    audiobookDirs: [""],
    mvDirs: [""],
    txtDirs: [""],
  });
  const [exists, setExists] = useState<
    Record<keyof FileSources, boolean[]>
  >({
    musicDirs: [false],
    audiobookDirs: [false],
    mvDirs: [false],
    txtDirs: [false],
  });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<{
    current?: number;
    total?: number;
    message?: string;
  } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void load();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    try {
      const res = await getFileSources();
      if (res.code === 200) {
        const view = res.data as FileSourcesView;
        setSources({
          musicDirs: normalize(view.sources.musicDirs),
          audiobookDirs: normalize(view.sources.audiobookDirs),
          mvDirs: normalize(view.sources.mvDirs),
          txtDirs: normalize(view.sources.txtDirs),
        });
        setExists(view.exists);
      } else {
        antdMessage.error(res.message || t("common.error"));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const setFieldLine = (
    key: keyof FileSources,
    idx: number,
    value: string,
  ) => {
    setSources((prev) => {
      const next = [...prev[key]];
      next[idx] = value;
      return { ...prev, [key]: next };
    });
  };
  const addFieldLine = (key: keyof FileSources) =>
    setSources((prev) => ({ ...prev, [key]: [...prev[key], ""] }));
  const removeFieldLine = (key: keyof FileSources, idx: number) =>
    setSources((prev) => {
      const next = prev[key].filter((_, i) => i !== idx);
      return { ...prev, [key]: next.length > 0 ? next : [""] };
    });

  const compact = (arr: string[]) =>
    arr.map((s) => s.trim()).filter(Boolean);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: FileSources = {
        musicDirs: compact(sources.musicDirs),
        audiobookDirs: compact(sources.audiobookDirs),
        mvDirs: compact(sources.mvDirs),
        txtDirs: compact(sources.txtDirs),
      };
      const res = await saveFileSources(payload);
      if (res.code === 200) {
        const view = res.data as FileSourcesView;
        setSources({
          musicDirs: normalize(view.sources.musicDirs),
          audiobookDirs: normalize(view.sources.audiobookDirs),
          mvDirs: normalize(view.sources.mvDirs),
          txtDirs: normalize(view.sources.txtDirs),
        });
        setExists(view.exists);
        message.success(t("settings.fileSourcesSaveSuccess"));
      } else {
        message.error(res.message || t("settings.fileSourcesSaveFailed"));
      }
    } catch (e) {
      console.error(e);
      message.error(t("settings.fileSourcesSaveFailed"));
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
        const res = await getImportTask(id);
        if (res.code === 200) {
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
            if (task.status === "SUCCESS")
              message.success(
                task.message || t("settings.fileSourcesSyncComplete"),
              );
            else
              message.error(
                task.message || t("settings.fileSourcesSyncFailed"),
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
        setProgress({
          current: 0,
          total: 0,
          message: t("settings.fileSourcesSyncStarting"),
        });
        pollTask(res.data.taskId);
      } else {
        message.error(res.message || t("settings.fileSourcesSyncFailed"));
        setSyncing(false);
      }
    } catch (e) {
      console.error(e);
      message.error(t("settings.fileSourcesSyncFailed"));
      setSyncing(false);
    }
  };

  const pct = useMemo(() => {
    if (!progress || !progress.total || progress.total <= 0) return 0;
    return Math.min(
      100,
      Math.round(((progress.current || 0) / progress.total) * 100),
    );
  }, [progress]);

  return (
    <section>
      <Paragraph type="secondary">{t("settings.fileSourcesDescription")}</Paragraph>
      {FIELDS.map(({ key, labelKey, placeholderKey, existsKey }) => (
        <div key={key} style={{ marginBottom: 24 }}>
          <Text strong>{t(labelKey)}</Text>
          <Space direction="vertical" style={{ width: "100%", marginTop: 8 }}>
            {(sources[key] ?? [""]).map((value, idx) => (
              <Space.Compact key={idx} style={{ width: "100%" }}>
                <Input
                  value={value}
                  onChange={(e) => setFieldLine(key, idx, e.target.value)}
                  placeholder={t(placeholderKey)}
                  style={{ width: "calc(100% - 90px)" }}
                />
                <Button
                  onClick={() => removeFieldLine(key, idx)}
                  danger
                  disabled={(sources[key] ?? []).length <= 1}
                >
                  {t("common.delete")}
                </Button>
              </Space.Compact>
            ))}
            <Button onClick={() => addFieldLine(key)} type="dashed">
              {t("settings.fileSourcesAddPath")}
            </Button>
            <div>
              {(exists[key] ?? []).map((e, i) => (
                <Tag key={i} color={e ? "green" : "orange"}>
                  {sources[key][i] || "(empty)"} {e ? t(existsKey) : t("settings.filePathMissing")}
                </Tag>
              ))}
            </div>
          </Space>
        </div>
      ))}
      <Space>
        <Button type="primary" loading={saving} onClick={handleSave}>
          {t("common.save")}
        </Button>
        <Button loading={syncing} onClick={handleSync}>
          {t("settings.fileSourcesSync")}
        </Button>
      </Space>
      {progress && (
        <div style={{ marginTop: 12 }}>
          <Progress percent={pct} status={syncing ? "active" : "normal"} />
          {progress.message && (
            <Text type="secondary">{progress.message}</Text>
          )}
        </div>
      )}
    </section>
  );
};

export default FileSourcesSettings;