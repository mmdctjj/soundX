import { invoke } from "@tauri-apps/api/core";
import { FolderOpenOutlined } from "@ant-design/icons";
import {
  LANGUAGE_STORAGE_KEY,
  SYSTEM_LANGUAGE_VALUE,
  resolveLanguageSelection,
} from "@soundx/i18e";
import {
  Button,
  ColorPicker,
  Divider,
  Input,
  InputNumber,
  Select,
  Slider,
  Space,
  Switch,
  Typography,
  message,
  theme,
} from "antd";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { languages } from "../../i18n";
import { useAuthStore } from "../../store/auth";
import { useSettingsStore } from "../../store/settings";
import { isTauri } from "../../utils/platform";
import AdminSettings from "./AdminSettings";
import WebDavSourcesSettings from "./WebDavSourcesSettings";
import LlmConfigSettings from "./LlmConfigSettings";
import TtsConfigSettings from "./TtsConfigSettings";
import styles from "./index.module.less";

const { Title, Text } = Typography;

const PLAYBACK_QUALITY_OPTIONS = [
  { labelKey: "settings.playbackQualityLossless", value: "lossless" },
  { labelKey: "settings.playbackQualityHigh", value: "high" },
  { labelKey: "settings.playbackQualityLow", value: "standard" },
] as const;

const PRESERVED_KEYS = new Set([
  "serverAddress",
  "selectedSourceType",
  "plus_token",
  "plus_user_id",
  "plus_vip_status",
  "plus_vip_data",
  "plus_vip_updated_at",
  "userId",
  "i18nextLng",
]);

const Settings: React.FC = () => {
  const { token } = theme.useToken();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    general,
    desktopLyric,
    download,
    updateGeneral,
    updateDesktopLyric,
    updateDownload,
  } = useSettingsStore();

  const [cacheSize, setCacheSize] = React.useState<string>(t("common.loading"));
  const [clearing, setClearing] = React.useState(false);

  const fetchCacheSize = async () => {
    if (!isTauri()) {
      setCacheSize("--");
      return;
    }
    try {
      const size = await invoke<number>("cache_get_size");
      setCacheSize(formatSize(size));
    } catch (error) {
      console.warn("Failed to fetch cache size", error);
      setCacheSize("--");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleClearCache = async () => {
    setClearing(true);
    try {
      if (isTauri()) {
        await invoke("cache_clear");
      }
      // Clear localStorage except login and data source keys
      const keysToPreserve: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && PRESERVED_KEYS.has(key)) {
          keysToPreserve[key] = localStorage.getItem(key) || "";
        }
      }
      localStorage.clear();
      for (const [key, value] of Object.entries(keysToPreserve)) {
        localStorage.setItem(key, value);
      }
      await fetchCacheSize();
      message.success(t("settings.cacheCleared"));
    } catch (error) {
      console.warn("Failed to clear cache", error);
      message.error(t("common.error"));
    } finally {
      setClearing(false);
    }
  };

  const [, setDownloadPath] = React.useState<string>("");

  React.useEffect(() => {
    fetchCacheSize();
    loadDownloadPath();
  }, []);

  const loadDownloadPath = async () => {
    if (isTauri()) {
      try {
        const path = await invoke<string>("get_download_path");
        setDownloadPath(path || "");
      } catch (e) {
        console.error("Failed to get download path:", e);
      }
    }
  };

  const handleSelectDirectory = async () => {
    if (isTauri()) {
      try {
        const path = await invoke<string>("select_directory");
        if (path) {
          updateDownload("downloadPath", path);
        }
      } catch (e) {
        console.error("Failed to select directory:", e);
      }
    }
  };

  return (
    <div className={styles.settingsPage} style={{ color: token.colorText }}>
      <header className={styles.header}>
        <Title level={2} className={styles.title}>
          {t("settings.title")}
        </Title>
      </header>

      {user?.is_admin && (
        <>
          <section className={styles.section}>
            <Title level={4} className={styles.sectionTitle}>
              {t("settings.admin")}
            </Title>
            <AdminSettings />
          </section>
          <Divider className={styles.divider} />
        </>
      )}

      {user?.is_admin && (
        <>
          <section className={styles.section}>
            <Title level={4} className={styles.sectionTitle}>
              {t("settings.webdavSources")}
            </Title>
            <WebDavSourcesSettings />
          </section>
          <Divider className={styles.divider} />
        </>
      )}

      {user?.is_admin && (
        <>
          <section className={styles.section}>
            <Title level={4} className={styles.sectionTitle}>
              {t("settings.llmConfig")}
            </Title>
            <LlmConfigSettings />
          </section>
          <Divider className={styles.divider} />
        </>
      )}

      {user?.is_admin && (
        <>
          <section className={styles.section}>
            <Title level={4} className={styles.sectionTitle}>
              {t("settings.ttsConfig")}
            </Title>
            <TtsConfigSettings />
          </section>
          <Divider className={styles.divider} />
        </>
      )}

      <Divider className={styles.divider} />

      {/* General Settings */}
      <section className={styles.section}>
        <Title level={4} className={styles.sectionTitle}>
          {t("settings.general")}
        </Title>
        <div className={styles.settingItem}>
          <div className={styles.label}>{t("settings.autoLaunch")}</div>
          <div className={styles.control}>
            <Space>
              <Switch
                checked={general.autoLaunch}
                onChange={(val) => updateGeneral("autoLaunch", val)}
              />
              <Text className={styles.description}>{t("settings.autoLaunchDescription")}</Text>
            </Space>
          </div>
        </div>
        <div className={styles.settingItem}>
          <div className={styles.label}>{t("settings.minimizeToTray")}</div>
          <div className={styles.control}>
            <Space>
              <Switch
                checked={general.minimizeToTray}
                onChange={(val) => {
                  updateGeneral("minimizeToTray", val);
                  invoke("set_minimize_to_tray", { enable: val }).catch(console.error);
                }}
              />
              <Text className={styles.description}>
                {t("settings.minimizeToTrayDescription")}
              </Text>
            </Space>
          </div>
        </div>
        <div className={styles.settingItem}>
          <div className={styles.label}>{t("settings.relayPlay")}</div>
          <div className={styles.control}>
            <Space>
              <Switch
                checked={general.acceptRelay}
                onChange={(val) => updateGeneral("acceptRelay", val)}
              />
              <Text className={styles.description}>
                {t("settings.relayPlayDescription")}
              </Text>
            </Space>
          </div>
        </div>
        <div className={styles.settingItem}>
          <div className={styles.label}>{t("settings.syncControl")}</div>
          <div className={styles.control}>
            <Space>
              <Switch
                checked={general.acceptSync}
                onChange={(val) => updateGeneral("acceptSync", val)}
              />
              <Text className={styles.description}>
                {t("settings.syncControlDescription")}
              </Text>
            </Space>
          </div>
        </div>
        <div className={styles.settingItem}>
          <div className={styles.label}>{t("settings.recommendationPreference")}</div>
          <div className={styles.control}>
            <div style={{ minWidth: 260 }}>
              <Slider
                min={0}
                max={100}
                step={5}
                value={general.recommendationLikeRatio}
                onChange={(val) =>
                  updateGeneral("recommendationLikeRatio", Number(val))
                }
              />
              <Text className={styles.description}>
                {t("settings.like")} {general.recommendationLikeRatio}% · {t("settings.fresh")}{" "}
                {100 - general.recommendationLikeRatio}%
              </Text>
            </div>
          </div>
        </div>
        <div className={styles.settingItem}>
          <div className={styles.label}>{t("settings.language", "语言")}</div>
          <div className={styles.control}>
            <Select
              value={general.language || "system"}
              onChange={async (val) => {
                if (val === SYSTEM_LANGUAGE_VALUE) {
                  localStorage.removeItem(LANGUAGE_STORAGE_KEY);
                  localStorage.removeItem("i18nextLng");
                  await i18n.changeLanguage(
                    resolveLanguageSelection(SYSTEM_LANGUAGE_VALUE, navigator.language),
                  );
                } else {
                  localStorage.setItem(LANGUAGE_STORAGE_KEY, val);
                  await i18n.changeLanguage(val);
                }
                updateGeneral("language", val);
              }}
              options={[
                { label: t("settings.themeSystem", "跟随系统"), value: SYSTEM_LANGUAGE_VALUE },
                ...languages.map((lang) => ({
                  label: `${lang.flag} ${lang.label}`,
                  value: lang.code,
                })),
              ]}
              style={{ width: 140 }}
            />
          </div>
        </div>
        <div className={styles.settingItem}>
          <div className={styles.label}>{t("settings.internalPlaybackQuality")}</div>
          <div className={styles.control}>
            <Select
              value={general.internalPlaybackQuality}
              onChange={(val) => updateGeneral("internalPlaybackQuality", val)}
              options={PLAYBACK_QUALITY_OPTIONS.map((option) => ({
                label: t(option.labelKey),
                value: option.value,
              }))}
              className={styles.selectMedium}
            />
          </div>
        </div>
        <div className={styles.settingItem}>
          <div className={styles.label}>{t("settings.externalPlaybackQuality")}</div>
          <div className={styles.control}>
            <Select
              value={general.externalPlaybackQuality}
              onChange={(val) => updateGeneral("externalPlaybackQuality", val)}
              options={PLAYBACK_QUALITY_OPTIONS.map((option) => ({
                label: t(option.labelKey),
                value: option.value,
              }))}
              className={styles.selectMedium}
            />
          </div>
        </div>
        <div className={styles.settingItem}>
          <div className={styles.label}>{t("settings.theme")}</div>
          <div className={styles.control}>
            <Select
              value={general.theme}
              onChange={(val) => updateGeneral("theme", val)}
              options={[
                { label: t("settings.themeSystem"), value: "system" },
                { label: t("settings.themeLight"), value: "light" },
                { label: t("settings.themeDark"), value: "dark" },
              ]}
              className={styles.selectSmall}
            />
          </div>
        </div>
      </section>

      <Divider className={styles.divider} />

      {/* Desktop Lyric Settings */}
      <section className={styles.section}>
        <Title level={4} className={styles.sectionTitle}>
          {t("settings.desktopLyric")}
        </Title>
        <div className={styles.settingItem}>
          <div className={styles.label}>{t("settings.desktopLyricEnable")}</div>
          <div className={styles.control}>
            <Space>
              <Switch
                checked={desktopLyric.enable}
                onChange={(val) => updateDesktopLyric("enable", val)}
              />
              <Text className={styles.description}>{t("settings.desktopLyricEnable")}</Text>
            </Space>
          </div>
        </div>
        <div className={styles.settingItem}>
          <div className={styles.label}>{t("settings.lockPosition")}</div>
          <div className={styles.control}>
            <Space>
              <Switch
                checked={desktopLyric.lockPosition}
                onChange={(val) => updateDesktopLyric("lockPosition", val)}
              />
              <Text className={styles.description}>{t("settings.lockPositionDescription")}</Text>
            </Space>
          </div>
        </div>
        <div className={styles.settingItem}>
          <div className={styles.label}>{t("settings.fontSize")}</div>
          <div className={styles.control}>
            <InputNumber
              min={16}
              max={64}
              value={desktopLyric.fontSize}
              onChange={(val) => updateDesktopLyric("fontSize", val)}
              addonAfter="px"
              className={styles.inputNumber}
            />
          </div>
        </div>
        <div className={styles.settingItem}>
          <div className={styles.label}>{t("settings.fontWeight")}</div>
          <div className={styles.control}>
            <Select
              value={desktopLyric.fontWeight}
              onChange={(val) => updateDesktopLyric("fontWeight", val)}
              options={[
                { label: t("settings.fontWeight100"), value: 100 },
                { label: t("settings.fontWeight200"), value: 200 },
                { label: t("settings.fontWeight300"), value: 300 },
                { label: t("settings.fontWeight400"), value: 400 },
                { label: t("settings.fontWeight500"), value: 500 },
                { label: t("settings.fontWeight600"), value: 600 },
                { label: t("settings.fontWeight700"), value: 700 },
                { label: t("settings.fontWeight800"), value: 800 },
                { label: t("settings.fontWeight900"), value: 900 },
              ]}
              className={styles.selectSmall}
            />
          </div>
        </div>
        <div className={styles.settingItem}>
          <div className={styles.label}>{t("settings.fontColor")}</div>
          <div className={styles.control}>
            <ColorPicker
              value={desktopLyric.fontColor}
              onChange={(val) =>
                updateDesktopLyric("fontColor", val.toHexString())
              }
              showText
            />
          </div>
        </div>
        <div className={styles.settingItem}>
          <div className={styles.label}>{t("settings.strokeWidth")}</div>
          <div className={styles.control}>
            <InputNumber
              min={0}
              max={10}
              value={desktopLyric.strokeWidth}
              onChange={(val) => updateDesktopLyric("strokeWidth", val)}
              addonAfter="px"
              className={styles.inputNumber}
            />
          </div>
        </div>
        <div className={styles.settingItem}>
          <div className={styles.label}>{t("settings.strokeColor")}</div>
          <div className={styles.control}>
            <ColorPicker
              value={desktopLyric.strokeColor}
              onChange={(val) =>
                updateDesktopLyric("strokeColor", val?.toHexString?.() || val)
              }
              showText
            />
          </div>
        </div>
        <div className={styles.settingItem}>
          <div className={styles.label}>{t("settings.textShadow")}</div>
          <div className={styles.control}>
            <Space>
              <Switch
                checked={desktopLyric.shadow}
                onChange={(val) => updateDesktopLyric("shadow", val)}
              />
              <Text className={styles.description}>{t("settings.textShadowDescription")}</Text>
            </Space>
          </div>
        </div>
        <div className={styles.settingItem}>
          <div className={styles.label}>{t("settings.alwaysOnTop")}</div>
          <div className={styles.control}>
            <Space>
              <Switch
                checked={desktopLyric.alwaysOnTop}
                onChange={(val) => updateDesktopLyric("alwaysOnTop", val)}
              />
              <Text className={styles.description}>
                {t("settings.alwaysOnTopDescription")}
              </Text>
            </Space>
          </div>
        </div>
      </section>

      <Divider className={styles.divider} />

      {/* Download Settings */}
      <section className={styles.section}>
        <Title level={4} className={styles.sectionTitle}>
          {t("settings.downloadSettings")}
        </Title>
        <div className={styles.settingItem}>
          <div className={styles.label}>{t("settings.downloadPath")}</div>
          <div className={styles.control}>
            <Input
              value={download.downloadPath}
              readOnly
              addonAfter={
                <Button
                  type="text"
                  size="small"
                  icon={<FolderOpenOutlined />}
                  onClick={handleSelectDirectory}
                />
              }
              className={styles.pathInput}
              placeholder={t("settings.downloadPathDescription")}
            />
          </div>
        </div>
        <div className={styles.settingItem}>
          <div className={styles.label}>{t("settings.downloadQuality")}</div>
          <div className={styles.control}>
            <Select
              value={download.quality}
              onChange={(val) => updateDownload("quality", val)}
              options={[
                { label: t("settings.downloadQualityStandard"), value: "128k" },
                { label: t("settings.downloadQualityHigh"), value: "320k" },
                { label: t("settings.downloadQualityLossless"), value: "flac" },
              ]}
              className={styles.selectMedium}
            />
          </div>
        </div>
        <div className={styles.settingItem}>
          <div className={styles.label}>{t("settings.maxDownloadThreads")}</div>
          <div className={styles.control}>
            <InputNumber
              min={1}
              max={10}
              value={download.concurrentDownloads}
              onChange={(val) => updateDownload("concurrentDownloads", val)}
              className={styles.inputNumber}
            />
          </div>
        </div>
        <div className={styles.settingItem}>
          <div className={styles.label}>{t("settings.cacheWhilePlaying")}</div>
          <div className={styles.control}>
            <Space>
              <Switch
                checked={download.cacheEnabled}
                onChange={(val) => updateDownload("cacheEnabled", val)}
              />
              <Text className={styles.description}>
                {t("settings.cacheWhilePlayingDescription")}
              </Text>
            </Space>
          </div>
        </div>
        <div className={styles.settingItem}>
          <div className={styles.label}>{t("settings.clearCache")}</div>
          <div className={styles.control}>
            <Space>
              <Button onClick={handleClearCache} loading={clearing}>{t("settings.clearCache")}</Button>
              <Text className={styles.description}>
                {t("settings.tapToClear")}: {cacheSize}
              </Text>
            </Space>
          </div>
        </div>
      </section>

      <Divider className={styles.divider} />

      {/* About */}
      <section className={styles.section}>
        <Title level={4} className={styles.sectionTitle}>
          {t("settings.about")}
        </Title>
        <div className={styles.settingItem}>
          <div className={styles.label}>{t("settings.productUpdates")}</div>
          <div className={styles.control}>
            <Button type="link" onClick={() => navigate("/product-updates")}>
              {t("settings.productUpdatesDescription")}
            </Button>
          </div>
        </div>
        <div className={styles.settingItem}>
          <div className={styles.label}>{t("settings.experienceProgram")}</div>
          <div className={styles.control}>
            <Space>
              <Switch
                checked={general.experienceProgramEnabled}
                onChange={(val) =>
                  updateGeneral("experienceProgramEnabled", val)
                }
              />
              <Text className={styles.description}>{t("settings.experienceProgramDescription")}</Text>
            </Space>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Settings;
