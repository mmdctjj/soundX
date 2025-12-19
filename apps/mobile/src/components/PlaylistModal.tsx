import { useAuth } from "@/src/context/AuthContext";
import { usePlayer } from "@/src/context/PlayerContext";
import { useTheme } from "@/src/context/ThemeContext";
import { Track, TrackType } from "@/src/models";
import { getHistoryTracks } from "@/src/services/user";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Modal from "react-native-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const PlaylistModal = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { trackList, currentTrack, playTrackList, showPlaylist, setShowPlaylist } = usePlayer();

  const [activeTab, setActiveTab] = useState<"current" | "history">("current");
  const [historyTracks, setHistoryTracks] = useState<Track[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (showPlaylist && activeTab === "history" && user) {
      loadHistory();
    }
  }, [showPlaylist, activeTab, user]);

  const loadHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const res = await getHistoryTracks(user.id, 0, 50);
      if (res.code === 200) {
        setHistoryTracks(res.data.list.map((item: any) => item.track));
      } 
    } catch (error) {
      console.error("Failed to load history in modal:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const data = activeTab === "current" ? trackList : historyTracks;

  return (
    <Modal
      isVisible={showPlaylist}
      onBackdropPress={() => setShowPlaylist(false)}
      onSwipeComplete={() => setShowPlaylist(false)}
      swipeDirection={["down", "right"]}
      style={styles.modal}
      deviceWidth={undefined}
      deviceHeight={undefined}
    >
      <View
        style={[
          styles.modalContent,
          { backgroundColor: colors.card, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity 
            style={[styles.tabItem, activeTab === "current" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab("current")}
          >
            <Text style={[styles.tabText, { color: activeTab === "current" ? colors.primary : colors.secondary }]}>
              当前列表 ({trackList.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabItem, activeTab === "history" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab("history")}
          >
            <Text style={[styles.tabText, { color: activeTab === "history" ? colors.primary : colors.secondary }]}>
              近期所听
            </Text>
          </TouchableOpacity>
        </View>
        {activeTab === "history" && loadingHistory ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  { borderBottomColor: colors.border },
                  currentTrack?.id === item.id && styles.activePlaylistItem,
                ]}
                onPress={() => {
                  playTrackList(data, index);
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
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: "flex-end",
    alignItems: "flex-end", // Align to right on larger screens
  },
  modalContent: {
    width: "100%",
    maxWidth: 600,
    height: "60%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(150,150,150,0.1)",
  },
  tabItem: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
