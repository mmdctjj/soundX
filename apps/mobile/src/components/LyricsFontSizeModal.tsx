import { useTheme } from "@/src/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Modal from "react-native-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { parseLyrics } from "../../app/player";

interface LyricsFontSizeModalProps {
  visible: boolean;
  onClose: () => void;
  lyricFontSize: number;
  setLyricFontSize: (size: number) => void;
  previewLyrics: string;
}

export const LyricsFontSizeModal: React.FC<LyricsFontSizeModalProps> = ({
  visible,
  onClose,
  lyricFontSize,
  setLyricFontSize,
  previewLyrics,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [internalSize, setInternalSize] = useState(lyricFontSize);

  useEffect(() => {
    setInternalSize(lyricFontSize);
  }, [lyricFontSize, visible]);

  const handleUpdateSize = (newSize: number) => {
    const size = Math.min(Math.max(newSize, 12), 40);
    setInternalSize(size);
    setLyricFontSize(size);
    AsyncStorage.setItem("lyric_font_size", size.toString());
  };

  const handleReset = () => {
    handleUpdateSize(16);
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
      <View style={styles.sheetWrapper}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.card,
              paddingBottom: insets.bottom + 20,
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{t('lyricsSize.title')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.container}>
            {/* Left side: Controls */}
            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: colors.border }]}
                onPress={() => handleUpdateSize(internalSize + 2)}
              >
                <Ionicons name="add" size={24} color={colors.text} />
                <Text style={[styles.btnText, { color: colors.text }]}>{t('lyricsSize.enlarge')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: colors.border }]}
                onPress={() => handleUpdateSize(internalSize - 2)}
              >
                <Ionicons name="remove" size={24} color={colors.text} />
                <Text style={[styles.btnText, { color: colors.text }]}>{t('lyricsSize.shrink')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: colors.border }]}
                onPress={handleReset}
              >
                <Ionicons name="refresh-outline" size={22} color={colors.text} />
                <Text style={[styles.btnText, { color: colors.text }]}>{t('lyricsSize.reset')}</Text>
              </TouchableOpacity>
              
              <View style={styles.sizeIndicator}>
                <Text style={[styles.sizeLabel, { color: colors.secondary }]}>{t('lyricsSize.currentSize')}</Text>
                <Text style={[styles.sizeValue, { color: colors.primary }]}>{internalSize}</Text>
              </View>
            </View>

            {/* Right side: Preview */}
            <View style={[styles.preview, { borderLeftColor: colors.border }]}>
               <Text style={[styles.previewLabel, { color: colors.secondary }]}>{t('lyricsSize.preview')}</Text>
               <View style={styles.previewContent}>
                  <Text 
                    style={[
                      styles.previewText, 
                      { 
                        color: colors.text, 
                        fontSize: internalSize,
                        lineHeight: internalSize * 1.5 
                      }
                    ]}
                    numberOfLines={5}
                  >
                    {(() => {
                      if (!previewLyrics) return t('lyricsSize.noLyricsPreview');
                      const parsed = parseLyrics(previewLyrics);
                      return parsed.map(line => line.text).join('\n');
                    })()}
                  </Text>
               </View>
               </View>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  container: {
    flexDirection: "row",
    minHeight: 220,
  },
  controls: {
    flex: 1,
    paddingRight: 10,
    justifyContent: "space-between",
  },
  controlBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  btnText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "600",
  },
  sizeIndicator: {
    alignItems: "center",
    marginTop: 5,
  },
  sizeLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  sizeValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  preview: {
    flex: 2,
    paddingLeft: 20,
    borderLeftWidth: 1,
  },
  previewLabel: {
    fontSize: 12,
    marginBottom: 10,
  },
  previewContent: {
    flex: 1,
    justifyContent: "center",
  },
  previewText: {
    textAlign: "center",
  },
});
