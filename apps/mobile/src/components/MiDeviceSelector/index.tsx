import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Modal from "react-native-modal";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import {
  getMiAuthStatus,
  getMiDevices,
  getMiQRCode,
  getMiQRCodeStatus,
  type MiDevice,
  type MiQRCodeResponse,
} from "@soundx/services";

export interface MiDeviceSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelectDevice: (device: MiDevice) => void;
  loading?: boolean;
  title?: string;
}

export const MiDeviceSelector: React.FC<MiDeviceSelectorProps> = ({
  visible,
  onClose,
  onSelectDevice,
  loading: externalLoading,
  title,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
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
    if (visible) {
      loadDevices();
    } else {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    }
  }, [visible]);

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

  const handleDevicePress = (device: MiDevice) => {
    if (isBusy) return;
    onSelectDevice(device);
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      useNativeDriver
      hideModalContentWhileAnimating
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropTransitionOutTiming={0}
      style={styles.bottomSheetModal}
    >
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: colors.text }]}>
            {title || t("playerPage.miSpeakerTitle")}
          </Text>

          <ScrollView style={{ maxHeight: 360 }}>
            {isLoading ? (
              <View style={styles.centerContent}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.secondaryText, { color: colors.secondary }]}>
                  {t("common.loading")}
                </Text>
              </View>
            ) : miAuthStatus?.logged_in ? (
              miDevices.length === 0 ? (
                <View style={styles.centerContent}>
                  <Ionicons name="musical-notes-outline" size={40} color={colors.secondary} />
                  <Text style={[styles.secondaryText, { color: colors.secondary }]}>
                    {t("playerPage.noMiDevices")}
                  </Text>
                </View>
              ) : (
                <View>
                  {miDevices.map((device) => (
                    <TouchableOpacity
                      key={device.device_id}
                      style={[
                        styles.deviceRow,
                        { borderBottomColor: colors.border },
                        isBusy && { opacity: 0.6 },
                      ]}
                      disabled={isBusy}
                      onPress={() => handleDevicePress(device)}
                    >
                      <View
                        style={[
                          styles.deviceIcon,
                          { backgroundColor: colors.primary },
                        ]}
                      >
                        <Ionicons name="radio-outline" size={20} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>
                          {device.name}
                        </Text>
                        <Text style={{ color: colors.secondary, fontSize: 12 }}>
                          {device.model}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.secondary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )
            ) : miQRCode?.qrcode_url ? (
              <View style={styles.centerContent}>
                <Text style={[styles.secondaryText, { color: colors.secondary, marginBottom: 12 }]}>
                  {t("playerPage.miLoginRequired")}
                </Text>
                <Image
                  source={{ uri: miQRCode.qrcode_url }}
                  style={{ width: 180, height: 180, borderRadius: 8 }}
                />
                <Text style={[styles.hintText, { color: colors.secondary }]}>
                  {t("playerPage.miScanQRCode")}
                </Text>
              </View>
            ) : (
              <View style={styles.centerContent}>
                <Ionicons name="musical-notes-outline" size={40} color={colors.secondary} />
                <Text style={[styles.secondaryText, { color: colors.secondary }]}>
                  {t("playerPage.miLoginRequired")}
                </Text>
                <TouchableOpacity
                  style={[styles.retryButton, { backgroundColor: colors.primary + '20' }]}
                  onPress={loadDevices}
                >
                  <Text style={{ color: colors.primary }}>{t("common.retry")}</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  bottomSheetModal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  content: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 16,
    maxHeight: "80%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ccc",
    alignSelf: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  centerContent: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  secondaryText: {
    fontSize: 14,
    marginTop: 8,
  },
  hintText: {
    fontSize: 12,
    marginTop: 8,
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  deviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
