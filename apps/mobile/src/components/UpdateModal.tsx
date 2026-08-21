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
  /** 是否正在跳转商店 / 创建下载任务（用于按钮 loading / 下载中视图） */
  opening: boolean;
  /** APK 下载进度（0~1，小米模式下载中才有意义） */
  progress: number;
  /** 点击「立即更新 / 前往应用商店」 */
  onUpdate: () => void;
  /** 点击「忽略此版本」 */
  onIgnore: () => void;
  /** 关闭弹窗（不忽略，下次启动仍会询问；下载中点击 = 后台继续下载） */
  onClose: () => void;
}

/**
 * 版本更新弹窗（v2，支持双模式）
 *
 * 更新方式由 useCheckUpdate 按设备品牌决定：
 *   - mode=xiaomi（小米/红米）：「立即更新」→ 系统下载器下载 APK，
 *     下载中展示进度条 + 「隐藏弹窗（后台继续下载）」按钮
 *   - mode=store（iOS / OPPO / vivo / 荣耀…）：「前往应用商店」→ 跳商店
 *
 * 两种模式共用：
 *   - 标题：发现新版本 v{version}
 *   - 内容：GitHub Release body（markdown 渲染）
 *   - 次按钮：忽略此版本（写入 AsyncStorage）
 */
export const UpdateModal = ({
  visible,
  updateInfo,
  opening,
  progress,
  onUpdate,
  onIgnore,
  onClose,
}: UpdateModalProps) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  /** 小米模式且正在创建下载任务 → 展示下载中视图 */
  const isDownloading = opening && updateInfo?.mode === 'xiaomi';

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
          {isDownloading ? (
            <>
              <Text style={[styles.title, { color: colors.text }]}>
                {progress > 0 ? t('update.systemDownloadStarted') : t('update.preparing')}
              </Text>

              <View style={styles.progressContainer}>
                <View style={[styles.progressBarBackground, { backgroundColor: colors.background }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(Math.max(progress, 0.05), 1) * 100}%`, backgroundColor: colors.primary },
                    ]}
                  />
                </View>
              </View>
              <Text style={[styles.progressHint, { color: colors.secondary }]}>
                {progress > 0
                  ? t('update.systemDownloadDescription')
                  : t('update.requestingLink')}
              </Text>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border }]}
                activeOpacity={0.8}
                onPress={onClose}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                  {t('update.hideDialogBackgroundDownload')}
                </Text>
              </TouchableOpacity>
            </>
          ) : updateInfo ? (
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
                      {updateInfo.mode === 'xiaomi'
                        ? t('update.updateNow')
                        : t('update.openStore')}
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
  progressContainer: {
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  progressHint: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 19,
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
