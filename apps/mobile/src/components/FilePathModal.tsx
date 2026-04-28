import { useTheme } from "@/src/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Modal from "react-native-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

interface FilePathModalProps {
  visible: boolean;
  title?: string;
  path?: string | null;
  onClose: () => void;
}

export const FilePathModal: React.FC<FilePathModalProps> = ({
  visible,
  title,
  path,
  onClose,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const displayPath = path?.trim() || t('filePath.noFilePath');

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
      <View style={styles.sheetWrapper}>
        <View style={{ width: "100%", maxWidth: 450, alignSelf: "center" }}>
          <View
            style={[
              styles.content,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 },
            ]}
          >
            <View style={styles.handle} />
            <View style={styles.header}>
              <Ionicons name="document-text-outline" size={20} color={colors.text} />
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {title || t('filePath.title')}
              </Text>
            </View>
            <Text style={[styles.path, { color: colors.secondary }]} selectable>
              {displayPath}
            </Text>
            <TouchableOpacity
              style={[styles.button, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>{t('filePath.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  bottomSheetModal: {
    margin: 0,
    justifyContent: "flex-end",
  },
  sheetWrapper: {
    width: "100%",
    alignItems: "center",
  },
  content: {
    width: "100%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
    backgroundColor: "rgba(150,150,150,0.3)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  path: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  button: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
