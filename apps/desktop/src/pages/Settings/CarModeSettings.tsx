import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { Button, Select, Space, Switch, Typography } from "antd";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  useSettingsStore,
  type CarModeColumn,
} from "../../store/settings";
import styles from "./index.module.less";

const { Text } = Typography;

const DEFAULT_COLUMN_ORDER: CarModeColumn[] = ["cover", "lyrics", "content"];

const CarModeSettings: React.FC = () => {
  const { t } = useTranslation();
  const { carMode, updateCarMode } = useSettingsStore();
  // 旧 persist 缓存可能缺整个 carMode 分组或其内部字段，全部兜底
  const enabled = carMode?.enabled ?? false;
  const columnOrder = carMode?.columnOrder ?? DEFAULT_COLUMN_ORDER;
  const mergeCoverLyrics = carMode?.mergeCoverLyrics ?? false;
  const mergedDefaultView = carMode?.mergedDefaultView ?? "cover";

  const columnLabel = (col: CarModeColumn) => {
    const key = `carModeColumn${col.charAt(0).toUpperCase()}${col.slice(1)}`;
    return t(`settings.${key}`);
  };

  const moveColumn = (index: number, direction: -1 | 1) => {
    const order = [...columnOrder];
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    updateCarMode("columnOrder", order);
  };

  return (
    <>
      <div className={styles.settingItem}>
        <div className={styles.label}>{t("settings.carModeEnable")}</div>
        <div className={styles.control}>
          <Space>
            <Switch
              checked={enabled}
              onChange={(val) => updateCarMode("enabled", val)}
            />
            <Text className={styles.description}>
              {t("settings.carModeEnableDescription")}
            </Text>
          </Space>
        </div>
      </div>

      <div className={styles.settingItem}>
        <div className={styles.label}>{t("settings.carModeColumnOrder")}</div>
        <div className={styles.control}>
          <Space direction="vertical" style={{ width: 280 }}>
            {columnOrder.map((col, index) => (
              <div
                key={col}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text>{columnLabel(col)}</Text>
                <Space>
                  <Button
                    size="small"
                    icon={<ArrowUpOutlined />}
                    disabled={index === 0}
                    onClick={() => moveColumn(index, -1)}
                  />
                  <Button
                    size="small"
                    icon={<ArrowDownOutlined />}
                    disabled={index === columnOrder.length - 1}
                    onClick={() => moveColumn(index, 1)}
                  />
                </Space>
              </div>
            ))}
            <Text className={styles.description}>
              {t("settings.carModeColumnOrderDescription")}
            </Text>
          </Space>
        </div>
      </div>

      <div className={styles.settingItem}>
        <div className={styles.label}>
          {t("settings.carModeMergeCoverLyrics")}
        </div>
        <div className={styles.control}>
          <Space>
            <Switch
              checked={mergeCoverLyrics}
              onChange={(val) => updateCarMode("mergeCoverLyrics", val)}
            />
            <Text className={styles.description}>
              {t("settings.carModeMergeCoverLyricsDescription")}
            </Text>
          </Space>
        </div>
      </div>

      {mergeCoverLyrics && (
        <div className={styles.settingItem}>
          <div className={styles.label}>
            {t("settings.carModeMergedDefaultView")}
          </div>
          <div className={styles.control}>
            <Select
              value={mergedDefaultView}
              onChange={(val) => updateCarMode("mergedDefaultView", val)}
              options={[
                {
                  label: t("settings.carModeMergedViewCover"),
                  value: "cover",
                },
                {
                  label: t("settings.carModeMergedViewLyrics"),
                  value: "lyrics",
                },
                {
                  label: t("settings.carModeMergedViewBoth"),
                  value: "both",
                },
              ]}
              style={{ width: 160 }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default CarModeSettings;
