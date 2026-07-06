import {
  Button,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Typography,
  message,
} from "antd";
import {
  getTtsProviderConfigs,
  getTtsSupportedProviders,
  saveTtsProviderConfig,
  deleteTtsProviderConfig,
  type TtsProviderConfig,
  type TtsProviderOption,
} from "@soundx/services";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const { Text, Paragraph } = Typography;

interface ProviderDraft {
  apiKey: string;
  appId: string;
  groupId: string;
  model: string;
}

const emptyDraft = (): ProviderDraft => ({
  apiKey: "",
  appId: "",
  groupId: "",
  model: "",
});

interface ProviderSchema {
  fields: (keyof ProviderDraft)[];
  defaults: Partial<ProviderDraft>;
}

const PROVIDER_SCHEMAS: Record<string, ProviderSchema> = {
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

const FIELD_KEY: Record<keyof ProviderDraft, string> = {
  apiKey: "settings.ttsConfigFieldApiKey",
  appId: "settings.ttsConfigFieldAppId",
  groupId: "settings.ttsConfigFieldGroupId",
  model: "settings.ttsConfigFieldModel",
};

const CONFIG_FIELD_KEYS: Record<keyof ProviderDraft, string> = {
  apiKey: "api_key",
  appId: "app_id",
  groupId: "group_id",
  model: "model",
};

const TtsConfigSettings: React.FC = () => {
  const { t } = useTranslation();
  const [supported, setSupported] = useState<TtsProviderOption[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [configs, setConfigs] = useState<Record<string, TtsProviderConfig>>({});
  const [draft, setDraft] = useState<ProviderDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const schema = useMemo<ProviderSchema | null>(() => {
    if (!selectedProvider) return null;
    return (
      PROVIDER_SCHEMAS[selectedProvider] ?? { fields: ["apiKey"], defaults: {} }
    );
  }, [selectedProvider]);

  useEffect(() => {
    (async () => {
      try {
        const [providersRes, configsRes] = await Promise.all([
          getTtsSupportedProviders(),
          getTtsProviderConfigs(),
        ]);
        const list = providersRes.providers ?? [];
        setSupported(list);
        const cfgs = configsRes.configs ?? {};
        setConfigs(cfgs);
        const first = list.find((p) => p.id in PROVIDER_SCHEMAS || p.id === "mimo" || p.id === "minimax" || p.id === "volc");
        if (first) setSelectedProvider(first.id);
      } catch (error) {
        console.warn("Failed to load TTS providers", error);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedProvider) return;
    const stored = configs[selectedProvider] ?? {};
    const defaults = PROVIDER_SCHEMAS[selectedProvider]?.defaults ?? {};
    setDraft({
      apiKey: typeof stored.api_key === "string" ? stored.api_key : "",
      appId: typeof stored.app_id === "string" ? stored.app_id : "",
      groupId: typeof stored.group_id === "string" ? stored.group_id : "",
      model:
        typeof stored.model === "string"
          ? stored.model
          : (defaults.model ?? ""),
    });
  }, [selectedProvider, configs]);

  const handleSave = async () => {
    if (!selectedProvider || !schema) return;
    setSaving(true);
    try {
      const payload: TtsProviderConfig = {};
      for (const f of schema.fields) {
        const value = draft[f].trim();
        const cfgKey = CONFIG_FIELD_KEYS[f];
        if (value) payload[cfgKey] = value;
      }
      const res = await saveTtsProviderConfig(selectedProvider, payload);
      setConfigs((prev) => ({
        ...prev,
        [selectedProvider]: res.config ?? {},
      }));
      message.success(t("settings.ttsConfigSaveSuccess"));
    } catch (error) {
      console.error("Failed to save TTS config", error);
      message.error(t("settings.ttsConfigSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProvider) return;
    try {
      await deleteTtsProviderConfig(selectedProvider);
      setConfigs((prev) => {
        const next = { ...prev };
        delete next[selectedProvider];
        return next;
      });
      setDraft(emptyDraft());
      message.success(t("settings.ttsConfigDeleteSuccess"));
    } catch (error) {
      console.error("Failed to delete TTS config", error);
      message.error(t("settings.ttsConfigSaveFailed"));
    }
  };

  const configuredIds = Object.keys(configs);
  const supportedIds = supported.map((p) => p.id);

  return (
    <>
      <Paragraph type="secondary" style={{ marginBottom: 12 }}>
        {t("settings.ttsConfigDescription")}
      </Paragraph>

      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <div>
          <Text strong>{t("settings.ttsConfig")}</Text>
          <Select
            value={selectedProvider ?? undefined}
            onChange={setSelectedProvider}
            options={supportedIds.map((id) => ({
              label: `${supported.find((p) => p.id === id)?.name ?? id}${
                configuredIds.includes(id) ? " ✓" : ""
              }`,
              value: id,
            }))}
            style={{ width: 260, marginLeft: 12 }}
            placeholder={t("settings.ttsConfig")}
            loading={!loaded}
          />
        </div>

        {schema && (
          <Form layout="vertical" style={{ maxWidth: 520 }}>
            {schema.fields.map((field) => (
              <Form.Item key={field} label={t(FIELD_KEY[field])}>
                <Input
                  value={draft[field]}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, [field]: e.target.value }))
                  }
                  placeholder={
                    field === "apiKey"
                      ? t("settings.llmConfigKeyHint")
                      : undefined
                  }
                />
              </Form.Item>
            ))}
            <Space>
              <Button type="primary" loading={saving} onClick={handleSave}>
                {t("common.save")}
              </Button>
              {configuredIds.includes(selectedProvider ?? "") && (
                <Popconfirm
                  title={t("settings.ttsConfigDeleteSuccess")}
                  onConfirm={handleDelete}
                >
                  <Button danger>{t("common.delete")}</Button>
                </Popconfirm>
              )}
            </Space>
          </Form>
        )}
      </Space>
    </>
  );
};

export default TtsConfigSettings;
