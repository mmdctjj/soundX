import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Avatar,
  Button,
  Flex,
  List,
  Modal,
  Spin,
} from "antd";
import {
  SoundOutlined,
} from "@ant-design/icons";
import Icon from "@ant-design/icons";
import {
  getMiAuthStatus,
  getMiDevices,
  getMiQRCode,
  getMiQRCodeStatus,
  type MiDevice,
  type MiQRCodeResponse,
} from "@soundx/services";
import XiaoAiSvg from "../../assets/xiaoai.svg?react";

export const XiaoAiIcon = (props: any) => <Icon component={XiaoAiSvg} {...props} />;

const XiaoAiOutlined = (props: any) => <Icon component={XiaoAiSvg} {...props} />;

export interface MiDeviceSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectDevice: (device: MiDevice) => void;
  loading?: boolean;
  title?: string;
}

export const MiDeviceSelector: React.FC<MiDeviceSelectorProps> = ({
  open,
  onClose,
  onSelectDevice,
  loading: externalLoading,
  title,
}) => {
  const { t } = useTranslation();
  const [miDevices, setMiDevices] = useState<MiDevice[]>([]);
  const [miAuthStatus, setMiAuthStatus] = useState<{ logged_in: boolean } | null>(null);
  const [miQRCode, setMiQRCode] = useState<MiQRCodeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isBusy = externalLoading || isLoading;

  // 清理轮询定时器
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, []);

  // 打开时加载设备
  useEffect(() => {
    if (open) {
      loadDevices();
    } else {
      // 关闭时停止轮询
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    }
  }, [open]);

  const loadDevices = async () => {
    setIsLoading(true);
    try {
      const authRes = await getMiAuthStatus();
      setMiAuthStatus(authRes);

      if (authRes.logged_in) {
        const res = await getMiDevices();
        setMiDevices(res.devices || []);
      } else {
        const qrRes = await getMiQRCode();
        setMiQRCode(qrRes);
        if (qrRes.already_logged_in) {
          const res = await getMiDevices();
          setMiDevices(res.devices || []);
        } else if (qrRes.status_url) {
          startQRPolling(qrRes.status_url);
        }
      }
    } catch (error) {
      console.error("Failed to load Mi devices:", error);
      setMiDevices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const startQRPolling = (lpUrl: string) => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }

    pollingTimerRef.current = setInterval(async () => {
      try {
        const statusRes = await getMiQRCodeStatus(lpUrl);
        if (statusRes.status === "success") {
          if (pollingTimerRef.current) {
            clearInterval(pollingTimerRef.current);
            pollingTimerRef.current = null;
          }
          setMiAuthStatus({ logged_in: true });
          const res = await getMiDevices();
          setMiDevices(res.devices || []);
        } else if (statusRes.status === "expired" || statusRes.status === "error") {
          if (pollingTimerRef.current) {
            clearInterval(pollingTimerRef.current);
            pollingTimerRef.current = null;
          }
          setMiQRCode(null);
        }
      } catch (error) {
        console.error("QR polling error:", error);
      }
    }, 3000);
  };

  const handleDeviceClick = (device: MiDevice) => {
    if (isBusy) return;
    onSelectDevice(device);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={title || t("player.miSpeakerTitle")}
      width={360}
      destroyOnClose
    >
      <Flex vertical style={{ minHeight: 120, justifyContent: "center" }}>
        {isLoading ? (
          <Flex justify="center" align="center" gap="8px">
            <Spin size="small" />
            <span>{t("common.loading")}</span>
          </Flex>
        ) : miAuthStatus?.logged_in ? (
          miDevices.length === 0 ? (
            <Flex vertical align="center" gap="12px">
              <SoundOutlined style={{ fontSize: 32, color: "#999" }} />
              <span style={{ color: "#999" }}>{t("player.noMiDevices")}</span>
            </Flex>
          ) : (
            <List
              size="small"
              dataSource={miDevices}
              renderItem={(device) => (
                <List.Item
                  style={{
                    cursor: isBusy ? "not-allowed" : "pointer",
                    opacity: isBusy ? 0.6 : 1,
                  }}
                  onClick={() => handleDeviceClick(device)}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        size={32}
                        style={{ backgroundColor: "#1890ff", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <XiaoAiOutlined style={{ width: 20, height: 20, color: "#fff" }} />
                      </Avatar>
                    }
                    title={device.name}
                    description={device.model}
                  />
                </List.Item>
              )}
            />
          )
        ) : miQRCode?.qrcode_url ? (
          <Flex vertical align="center" gap="12px">
            <span style={{ color: "#999" }}>{t("player.miLoginRequired")}</span>
            <img
              src={miQRCode.qrcode_url}
              alt="小米扫码登录"
              style={{ width: 180, height: 180, borderRadius: 8 }}
            />
            <span style={{ color: "#999", fontSize: "12px" }}>
              {t("player.miScanQRCode")}
            </span>
          </Flex>
        ) : (
          <Flex vertical align="center" gap="12px">
            <SoundOutlined style={{ fontSize: 32, color: "#999" }} />
            <span style={{ color: "#999" }}>{t("player.miLoginRequired")}</span>
            <Button size="small" onClick={loadDevices}>
              {t("common.retry")}
            </Button>
          </Flex>
        )}
      </Flex>
    </Modal>
  );
};
