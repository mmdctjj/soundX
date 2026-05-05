import { Ionicons } from "@expo/vector-icons";
import { deleteFolder, Folder } from "@soundx/services";
import React from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext";

interface FolderMoreModalProps {
  visible: boolean;
  folder: Folder | null;
  onClose: () => void;
  onPlayAll: (folder: Folder) => void;
  onShowProperties: (folder: Folder) => void;
  onDeleteSuccess?: (folderId: (number | string)) => void;
}

export const FolderMoreModal: React.FC<FolderMoreModalProps> = ({
  visible,
  folder,
  onClose,
  onPlayAll,
  onShowProperties,
  onDeleteSuccess,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  if (!folder) return null;

  const handleDelete = () => {
    Alert.alert(
      t('folderMore.deleteFolder'),
      t('folderMore.confirmDeleteFolder', { folderName: folder.name }),
      [
        { text: t('common.cancel'), style: "cancel" },
        {
          text: t('folderMore.deleteFolderConfirm'),
          style: "destructive",
          onPress: async () => {
            try {
              const res = await deleteFolder(folder.id);
              if (res.code === 200) {
                onDeleteSuccess?.(folder.id);
                onClose();
              }
            } catch (e) {
              console.error("Failed to delete folder", e);
              Alert.alert(t('common.error'), t('folderMore.deleteFailed'));
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View
          style={[
            styles.content,
            { backgroundColor: colors.card, paddingBottom: insets.bottom + 20, width: '100%', maxWidth: 450 },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.header}>
            <Text style={[styles.folderName, { color: colors.text }]} numberOfLines={1}>
              {folder.name}
            </Text>
            <Text style={[styles.folderPath, { color: colors.secondary }]} numberOfLines={1}>
              {folder.path}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onPlayAll(folder);
              onClose();
            }}
          >
            <Ionicons name="play-circle-outline" size={24} color={colors.text} />
            <Text style={[styles.menuText, { color: colors.text }]}>{t('folderMore.playAll')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onShowProperties(folder);
              onClose();
            }}
          >
            <Ionicons name="information-circle-outline" size={24} color={colors.text} />
            <Text style={[styles.menuText, { color: colors.text }]}>{t('folderMore.properties')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={24} color="#ff4d4f" />
            <Text style={[styles.menuText, styles.dangerText]}>{t('folderMore.deleteFolder')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { marginTop: 10, justifyContent: 'center' }]}
            onPress={onClose}
          >
            <Text style={[styles.menuText, { color: colors.secondary }]}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  content: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(150,150,150,0.1)",
    paddingBottom: 15,
  },
  folderName: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  folderPath: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    gap: 12,
  },
  menuText: {
    fontSize: 16,
    fontWeight: "500",
  },
  dangerText: {
    color: "#ff4d4f",
  },
});
