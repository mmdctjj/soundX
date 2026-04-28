import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Modal from "react-native-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext";
import { Artist } from "../models";

interface ArtistMoreModalProps {
  visible: boolean;
  artist: Artist | null;
  onClose: () => void;
  onUpdateCover: () => void;
}

export const ArtistMoreModal: React.FC<ArtistMoreModalProps> = ({
  visible,
  artist,
  onClose,
  onUpdateCover,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  if (!artist) return null;

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
              styles.modalContent,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 },
            ]}
          >
            <View style={styles.handle} />
            <Text style={[styles.title, { color: colors.text }]}>{t('artistMore.title')}</Text>
            <Text style={[styles.artistName, { color: colors.secondary }]}>{artist.name}</Text>

            <TouchableOpacity
              style={styles.option}
              onPress={() => {
                onClose();
                onUpdateCover();
              }}
            >
              <Ionicons name="image-outline" size={24} color={colors.text} />
              <Text style={[styles.optionText, { color: colors.text }]}>{t('artistMore.editCover')}</Text>
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
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(150,150,150,0.3)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    paddingHorizontal: 20,
  },
  artistName: {
    fontSize: 14,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(150,150,150,0.1)",
  },
  optionText: {
    fontSize: 16,
    marginLeft: 16,
  },
});
