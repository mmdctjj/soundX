import { usePlayer } from "@/src/context/PlayerContext";
import { useTheme } from "@/src/context/ThemeContext";
import { TrackType } from "@/src/models";
import React from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Modal from "react-native-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const PlaylistModal = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { trackList, currentTrack, playTrackList, showPlaylist, setShowPlaylist } = usePlayer();

  return (
    <Modal
      isVisible={showPlaylist}
      onBackdropPress={() => setShowPlaylist(false)}
      onSwipeComplete={() => setShowPlaylist(false)}
      swipeDirection="down"
      style={styles.modal}
    >
      <View
        style={[
          styles.modalContent,
          { backgroundColor: colors.card, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            播放列表 ({trackList.length})
          </Text>
        </View>
        <FlatList
          data={trackList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[
                styles.modalItem,
                { borderBottomColor: colors.border },
                currentTrack?.id === item.id && styles.activePlaylistItem,
              ]}
              onPress={() => {
                playTrackList(trackList, index);
              }}
            >
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    {
                      color:
                        currentTrack?.id === item.id
                          ? colors.primary
                          : colors.text,
                    },
                    { flex: 1 },
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {currentTrack?.type === TrackType.AUDIOBOOK && item.progress ? (
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.secondary,
                      marginLeft: 10,
                    }}
                  >
                    已听
                    {Math.floor(
                      ((item.progress || 0) / (item.duration || 1)) * 100
                    )}
                    %
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: "flex-end",
  },
  modalContent: {
    height: "60%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(150,150,150,0.1)",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  modalItem: {
    padding: 15,
    borderBottomWidth: 0.5,
  },
  modalItemText: {
    fontSize: 16,
  },
  activePlaylistItem: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
});
