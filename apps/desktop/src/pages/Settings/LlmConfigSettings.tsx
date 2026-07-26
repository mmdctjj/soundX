import { Button, Form, Input, Select, Space, Typography, message } from "antd";
import {
  LLM_PROVIDER_OPTIONS,
  getLlmConfig,
  saveLlmConfig,
  testLlmConfig,
} from "@soundx/services";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const { Text, Paragraph } = Typography;

const LlmConfigSettings: React.FC = () => {
  const { t } = useTranslation();
  const [provider, setProvider] = useState<string>(LLM_PROVIDER_OPTIONS[0].id);
  const [model, setModel] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [baseUrl, setBaseUrl] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loaded, setLoaded] = useState(false);

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
        setLoaded(true);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await saveLlmConfig({
        provider,
        model,
        apiKey,
        baseUrl,
      });
      if (res.code === 200 && res.data) {
        setApiKey(res.data.apiKey || "");
        message.success(t("settings.llmConfigSaveSuccess"));
      } else {
        message.error(res.message || t("settings.llmConfigSaveFailed"));
      }
    } catch (error) {
      console.error("Failed to save LLM config", error);
      message.error(t("settings.llmConfigSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await testLlmConfig({ provider, model, apiKey, baseUrl });
      if (res.code === 200) {
        message.success(t("settings.testConnectionSuccess"));
      } else {
        message.error(res.message || t("settings.testConnectionFailed"));
      }
    } catch (error: any) {
      const detail =
        error?.response?.data?.message ||
        error?.message ||
        t("settings.testConnectionFailed");
      message.error(typeof detail === "string" ? detail : t("settings.testConnectionFailed"));
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <Paragraph type="secondary" style={{ marginBottom: 12 }}>
        {t("settings.llmConfigDescription")}
      </Paragraph>
      <Text type="secondary" style={{ display: "block", marginBottom: 12, fontSize: 12 }}>
        {t("settings.llmConfigKeyHint")}
      </Text>
      <Form layout="vertical" style={{ maxWidth: 520 }}>
        <Form.Item label={t("settings.llmProvider")}>
          <Select
            value={provider}
            onChange={setProvider}
            options={LLM_PROVIDER_OPTIONS.map((opt) => ({
              label: opt.name,
              value: opt.id,
            }))}
            loading={!loaded}
          />
        </Form.Item>
        <Form.Item label={t("settings.llmModel")}>
          <Input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="deepseek-chat"
          />
        </Form.Item>
        <Form.Item label={t("settings.llmApiKey")}>
          <Input.Password
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            autoComplete="off"
          />
        </Form.Item>
        <Form.Item label={t("settings.llmBaseUrl")}>
          <Input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.deepseek.com/v1"
          />
        </Form.Item>
        <Space>
          <Button type="primary" loading={saving} onClick={handleSave}>
            {t("common.save")}
          </Button>
          <Button loading={testing} onClick={handleTest}>
            {t("settings.testConnection")}
          </Button>
        </Space>
      </Form>
    </>
  );
};

export default LlmConfigSettings;
