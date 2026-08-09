import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import MarkdownContent from './MarkdownContent';
import { useTheme } from '../context/ThemeContext';
import type { UpdateInfo } from '../../hooks/useCheckUpdate';

interface UpdateModalProps {
  /** 是否展示 */
  visible: boolean;
  /** 远端版本信息（null 时 modal 不展示内容） */
  updateInfo: UpdateInfo | null;
  /** 是否正在跳转商店（用于按钮 loading） */
  opening: boolean;
  /** 点击「立即跳转」 */
  onUpdate: () => void;
  /** 点击「忽略此版本」 */
  onIgnore: () => void;
  /** 关闭弹窗（不忽略，下次启动仍会询问） */
  onClose: () => void;
}

/**
 * 版本更新弹窗（v1 简化版）
 *
 * 仅做「提示 + 跳转」：
 *   - 标题：发现新版本 v{version}
 *   - 内容：GitHub Release body（markdown 渲染）
 *   - 主按钮：立即跳转（调 onUpdate → 跳应用商店）
 *   - 次按钮：忽略此版本（调 onIgnore → 写入 AsyncStorage）
 *   - 关闭：系统返回键 / 点击遮罩 → onClose（不忽略）
 *
 * 历史来源：恢复自 commit f7d5fa28 删除前的 204 行 UpdateModal.tsx，
 * 移除进度条 + 下载相关 state 与分支，新增 storeUrl 不展示（用户已
 * 在「立即跳转」按钮里隐式确认跳商店）。
 */
export const UpdateModal = ({
  visible,
  updateInfo,
  opening,
  onUpdate,
  onIgnore,
  onClose,
}: UpdateModalProps) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { backgroundColor: colors.card }]}>
          {updateInfo ? (
            <>
              <Text style={[styles.title, { color: colors.text }]}>
                {t('update.foundNewVersion')} v{updateInfo.version}
              </Text>

              <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                <MarkdownContent
                  style={{
                    body: { color: colors.text, fontSize: 14, lineHeight: 22 },
                    heading1: {
                      color: colors.text,
                      fontSize: 18,
                      fontWeight: 'bold',
                      marginVertical: 6,
                    },
                    heading2: {
                      color: colors.text,
                      fontSize: 16,
                      fontWeight: 'bold',
                      marginVertical: 4,
                    },
                    heading3: {
                      color: colors.text,
                      fontSize: 15,
                      fontWeight: '600',
                      marginVertical: 4,
                    },
                    bullet_list: { marginVertical: 6 },
                    list_item: { marginVertical: 2 },
                    link: { color: colors.primary },
                    code_inline: {
                      backgroundColor: colors.background,
                      color: colors.primary,
                      borderRadius: 4,
                      paddingHorizontal: 4,
                    },
                  }}
                >
                  {updateInfo.body}
                </MarkdownContent>
              </ScrollView>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    { borderColor: colors.border },
                    opening && styles.buttonDisabled,
                  ]}
                  activeOpacity={0.8}
                  onPress={onIgnore}
                  disabled={opening}
                >
                  <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                    {t('update.ignoreThisVersion')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: colors.primary },
                    opening && styles.buttonDisabled,
                  ]}
                  activeOpacity={0.8}
                  onPress={onUpdate}
                  disabled={opening}
                >
                  {opening ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <Text style={[styles.primaryButtonText, { color: colors.background }]}>
                      {t('update.openStore')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    maxHeight: 360,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
