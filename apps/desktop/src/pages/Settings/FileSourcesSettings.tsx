import { Button, Input, Popconfirm, Progress, Space, Typography } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
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
  },
  {
    key: "audiobookDirs",
    labelKey: "settings.fileSourcesAudiobook",
    placeholderKey: "settings.filePathPlaceholder",
  },
  {
    key: "mvDirs",
    labelKey: "settings.fileSourcesMv",
    placeholderKey: "settings.filePathPlaceholder",
  },
  {
    key: "txtDirs",
    labelKey: "settings.fileSourcesTxt",
    placeholderKey: "settings.filePathPlaceholder",
  },
] as const;

const normalize = (arr?: string[]) => (arr && arr.length > 0 ? arr : [""]);

type SourceRow = {
  value: string;
  exists: boolean | null;
};

type SourceRows = Record<keyof FileSources, SourceRow[]>;

const normalizeRows = (values?: string[], exists?: boolean[]): SourceRow[] =>
  normalize(values).map((value, idx) => ({
    value,
    exists: values && values.length > 0 ? (exists?.[idx] ?? null) : null,
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

const FileSourcesSettings: React.FC = () => {
  const { t } = useTranslation();
  const message = useMessage();
  const [rows, setRows] = useState<SourceRows>(emptyRows);
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
        setRows(rowsFromView(view));
      } else {
        message.error(res.message || t("common.error"));
      }
    } catch (e) {
      console.error(e);
      message.error(t("common.error"));
    }
  };

  const setFieldLine = (
    key: keyof FileSources,
    idx: number,
    value: string,
  ) => {
    setRows((prev) => {
      const next = [...prev[key]];
      next[idx] = { value, exists: null };
      return { ...prev, [key]: next };
    });
  };
  const addFieldLine = (key: keyof FileSources) =>
    setRows((prev) => ({
      ...prev,
      [key]: [...prev[key], { value: "", exists: null }],
    }));
  const removeFieldLine = (key: keyof FileSources, idx: number) =>
    setRows((prev) => {
      const next = prev[key].filter((_, i) => i !== idx);
      return {
        ...prev,
        [key]: next.length > 0 ? next : [{ value: "", exists: null }],
      };
    });

  const compact = (sourceRows: SourceRow[]) =>
    sourceRows.map(({ value }) => value.trim()).filter(Boolean);

  const truncatePath = (p: string) =>
    p.length <= 36 ? p : p.slice(0, 14) + "…" + p.slice(-20);

  const handleSave = async (): Promise<boolean> => {
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
        message.success(t("settings.fileSourcesSaveSuccess"));
        return true;
      }
      message.error(res.message || t("settings.fileSourcesSaveFailed"));
      return false;
    } catch (e) {
      console.error(e);
      message.error(t("settings.fileSourcesSaveFailed"));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndSync = async () => {
    const ok = await handleSave();
    if (ok) {
      await handleSync();
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
        if (res.code !== 200) {
          stopPolling();
          setSyncing(false);
          message.error(res.message || t("settings.fileSourcesSyncFailed"));
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
          if (task.status === "SUCCESS")
            message.success(
              task.message || t("settings.fileSourcesSyncComplete"),
            );
          else
            message.error(
              task.message || t("settings.fileSourcesSyncFailed"),
            );
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
      {FIELDS.map(({ key, labelKey, placeholderKey }) => (
        <div key={key} style={{ marginBottom: 24 }}>
          <Text strong>{t(labelKey)}</Text>
          <Space direction="vertical" style={{ width: "100%", marginTop: 8 }}>
            {(rows[key] ?? [{ value: "", exists: null }]).map(
              ({ value, exists }, idx) => {
                const list = rows[key] ?? [];
                const isLast = idx === list.length - 1;
                const iconWidth = isLast ? 80 : 40;
                const inputStatus =
                  exists === true
                    ? "success"
                    : exists === false
                      ? "error"
                      : undefined;
                return (
                  <div key={idx} style={{ width: "100%" }}>
                    <Space.Compact style={{ width: "100%" }}>
                      <Input
                        value={value}
                        onChange={(e) =>
                          setFieldLine(key, idx, e.target.value)
                        }
                        placeholder={t(placeholderKey)}
                        status={inputStatus as "" | "error" | "warning" | undefined}
                        suffix={
                          inputStatus === "success" ? (
                            <CheckCircleOutlined />
                          ) : inputStatus === "error" ? (
                            <CloseCircleOutlined />
                          ) : null
                        }
                        style={{
                          width: `calc(100% - ${iconWidth}px)`,
                        }}
                      />
                      <Popconfirm
                        title={t("settings.filePathRemoveConfirm", {
                          path: truncatePath(value),
                        })}
                        okText={t("common.confirm")}
                        cancelText={t("common.cancel")}
                        okButtonProps={{ danger: true }}
                        placement="topRight"
                        onConfirm={() => removeFieldLine(key, idx)}
                        disabled={list.length <= 1}
                      >
                        <Button
                          type="text"
                          danger
                          disabled={list.length <= 1}
                          icon={<DeleteOutlined />}
                          aria-label={t("common.delete")}
                        />
                      </Popconfirm>
                      {isLast && (
                        <Button
                          type="text"
                          icon={<PlusOutlined />}
                          onClick={() => addFieldLine(key)}
                          aria-label={t("settings.fileSourcesAddPath")}
                        />
                      )}
                    </Space.Compact>
                    {exists !== null && (
                      <Typography.Text
                        type={exists ? "success" : "danger"}
                        style={{
                          fontSize: 12,
                          marginTop: 4,
                          display: "block",
                        }}
                      >
                        {exists
                          ? t("settings.filePathExists")
                          : t("settings.filePathMissing")}
                      </Typography.Text>
                    )}
                  </div>
                );
              },
            )}
          </Space>
        </div>
      ))}
      <Space>
        <Button
          type="primary"
          loading={saving}
          disabled={syncing}
          onClick={handleSaveAndSync}
        >
          {t("settings.fileSourcesSaveAndSync")}
        </Button>
        <Button onClick={handleSave} disabled={saving || syncing}>
          {t("common.save")}
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