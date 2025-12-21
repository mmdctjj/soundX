import { usePlayer } from "@/src/context/PlayerContext";
import { useTheme } from "@/src/context/ThemeContext";
import { Track } from "@/src/models";
import { Ionicons } from "@expo/vector-icons";
import { Router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SleepTimerModal from "./SleepTimerModal";

interface PlayerMoreModalProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  onClose: () => void;
  currentTrack: Track | null;
  router: Router;
}

export const PlayerMoreModal: React.FC<PlayerMoreModalProps> = ({
  visible,
  setVisible,
  onClose,
  currentTrack,
  router,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [sleepTimerVisible, setSleepTimerVisible] = useState(false);
  const { sleepTimer } = usePlayer();
  const [remainingTime, setRemainingTime] = useState<string>("");

  // Calculate remaining time
  useEffect(() => {
    if (!sleepTimer) {
      setRemainingTime("");
      return;
    }

    const updateRemainingTime = () => {
      const now = Date.now();
      const remaining = sleepTimer - now;
      
      if (remaining <= 0) {
        setRemainingTime("");
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setRemainingTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateRemainingTime();
    const interval = setInterval(updateRemainingTime, 1000);

    return () => clearInterval(interval);
  }, [sleepTimer]);

  const handleArtistDetails = () => {
    if (currentTrack?.artistId) {
      onClose();
      router.push(`/artist/${currentTrack.artistId}`);
    }
  };

  const handleAlbumDetails = () => {
    if (currentTrack?.albumId) {
      onClose();
      router.push(`/album/${currentTrack.albumId}`);
    }
  };

  const handleSleepTimer = () => {
    console.log("Opening sleep timer modal");
    setVisible(false);
    setSleepTimerVisible(true);
  };

  const handleDownload = () => {
    // Placeholder - not implemented yet
  };

  const options = [
    {
      icon: "person-outline" as const,
      label: "歌手详情",
      onPress: handleArtistDetails,
      disabled: !currentTrack?.artistId,
    },
    {
      icon: "albums-outline" as const,
      label: "专辑详情",
      onPress: handleAlbumDetails,
      disabled: !currentTrack?.albumId,
    },
    {
      icon: "time-outline" as const,
      label: remainingTime ? `定时关闭 (${remainingTime})` : "定时关闭",
      onPress: handleSleepTimer,
      disabled: false,
    },
    {
      icon: "download-outline" as const,
      label: "下载",
      onPress: handleDownload,
      disabled: true,
    },
  ];

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={{ width: "100%" }} onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: colors.card, paddingBottom: insets.bottom },
              ]}
            >
              <View style={styles.handle} />
              <Text style={[styles.title, { color: colors.text }]}>更多选项</Text>

              {options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.option,
                    { borderBottomColor: colors.border },
                    option.disabled && styles.optionDisabled,
                  ]}
                  onPress={option.onPress}
                  disabled={option.disabled}
                >
                  <Ionicons
                    name={option.icon}
                    size={24}
                    color={option.disabled ? colors.secondary : colors.text}
                  />
                  <Text
                    style={[
                      styles.optionText,
                      { color: option.disabled ? colors.secondary : colors.text },
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.secondary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <SleepTimerModal
        visible={sleepTimerVisible}
        onClose={() => setSleepTimerVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
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
    paddingBottom: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionText: {
    fontSize: 16,
    flex: 1,
    marginLeft: 16,
  },
});
