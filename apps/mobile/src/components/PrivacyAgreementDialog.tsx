import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  BackHandler,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

export const PRIVACY_AGREEMENT_ACCEPTED_KEY = "privacy_agreement_accepted";

const USER_AGREEMENT_URL = "https://www.audiodock.cn/docs/user-agreement/";
const PRIVACY_POLICY_URL = "https://www.audiodock.cn/docs/privacy-policy/";

const LINK_COLOR = "#1677ff";

/**
 * 首次启动隐私协议弹窗（仅 Android）。
 * - 首次进入 App 且未同意过协议时展示；
 * - 点击"同意并继续"：记录同意标记并关闭弹窗；
 * - 点击"不同意"：直接退出 App。
 */
export function PrivacyAgreementDialog() {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    let mounted = true;
    AsyncStorage.getItem(PRIVACY_AGREEMENT_ACCEPTED_KEY)
      .then((value) => {
        if (mounted && value !== "true") {
          setVisible(true);
        }
      })
      .catch((error) => {
        console.warn("[PrivacyAgreement] read flag failed", error);
        if (mounted) {
          setVisible(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleAgree = async () => {
    try {
      await AsyncStorage.setItem(PRIVACY_AGREEMENT_ACCEPTED_KEY, "true");
    } catch (error) {
      console.warn("[PrivacyAgreement] save flag failed", error);
    }
    setVisible(false);
  };

  const handleDisagree = () => {
    BackHandler.exitApp();
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch((error) =>
      console.warn("[PrivacyAgreement] open url failed", error)
    );
  };

  if (Platform.OS !== "android") return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        // 拦截返回键：用户必须明确选择"同意并继续"或"不同意"
      }}
    >
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            欢迎使用 声仓
          </Text>

          <View style={styles.body}>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              欢迎使用声仓！
            </Text>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              为了保障您的个人信息安全，请您阅读并同意：
            </Text>
            <View style={styles.linksRow}>
              <Text
                style={[styles.paragraph, styles.link]}
                onPress={() => openLink(USER_AGREEMENT_URL)}
              >
                《用户协议》
              </Text>
              <Text
                style={[styles.paragraph, styles.link]}
                onPress={() => openLink(PRIVACY_POLICY_URL)}
              >
                《隐私政策》
              </Text>
            </View>
            <Text style={[styles.paragraph, { color: colors.secondary }]}>
              我们将按照《隐私政策》收集和使用必要的信息，用于提供音频播放、账号登录、同步等服务。
            </Text>
            <Text style={[styles.paragraph, { color: colors.secondary }]}>
              如果您点击"同意并继续"，即表示您已阅读并同意上述协议。
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.agreeButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
            onPress={handleAgree}
          >
            <Text style={[styles.agreeButtonText, { color: colors.background }]}>
              同意并继续
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.disagreeButton, { borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={handleDisagree}
          >
            <Text style={[styles.disagreeButtonText, { color: colors.secondary }]}>
              不同意
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  dialog: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  body: {
    marginBottom: 20,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 6,
  },
  linksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 2,
  },
  link: {
    color: LINK_COLOR,
    marginRight: 16,
    textDecorationLine: "underline",
  },
  agreeButton: {
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  agreeButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  disagreeButton: {
    height: 46,
    borderRadius: 23,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    alignItems: "center",
  },
  disagreeButtonText: {
    fontSize: 16,
  },
});
