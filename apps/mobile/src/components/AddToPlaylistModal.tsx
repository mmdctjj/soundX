import { Ionicons } from "@expo/vector-icons";
import {
  addTracksToPlaylist,
  addTrackToPlaylist,
  getPlaylists,
} from "@soundx/services";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Modal from "react-native-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { usePlayer } from "../context/PlayerContext";
import { useTheme } from "../context/ThemeContext";
import { Playlist, Track, TrackType } from "../models";
import { usePlayMode } from "../utils/playMode";

interface AddToPlaylistModalProps {
  visible: boolean;
  trackId?: number | string | null;
  trackIds?: (number | string)[];
  tracks?: Track[];
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  visible,
  trackId,
  trackIds,
  tracks,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { mode } = usePlayMode();
  const { insertTracksNext } = usePlayer();
  const insets = useSafeAreaInsets();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<number | string | null>(null);

  useEffect(() => {
    if (visible && user) {
      loadPlaylists();
    }
  }, [visible, user, mode]);

  const loadPlaylists = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await getPlaylists(mode as TrackType, user.id);
      if (res.code === 200) {
        setPlaylists(res.data);
      }
    } catch (e) {
      console.error("Failed to load playlists", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPlaylist = async (playlistId: number | string) => {
    if (!trackId && (!trackIds || trackIds.length === 0)) return;
    try {
      setAddingId(playlistId);
      let res;
      if (trackIds && trackIds.length > 0) {
        res = await addTracksToPlaylist(playlistId, trackIds);
      } else if (trackId) {
        res = await addTrackToPlaylist(playlistId, trackId);
      }

      if (res && res.code === 200) {
        onSuccess?.();
        onClose();
      }
    } catch (e) {
      console.error("Failed to add track(s) to playlist", e);
    } finally {
      setAddingId(null);
    }
  };

  const handleAddToCurrentQueue = async () => {
    if (!tracks) return;

    let tracksToAdd: Track[] = [];
    if (trackIds && trackIds.length > 0) {
      tracksToAdd = tracks.filter((t) => trackIds.includes(t.id));
    } else if (trackId) {
      tracksToAdd = tracks.filter((t) => t.id === trackId);
    }

    if (tracksToAdd.length > 0) {
      await insertTracksNext(tracksToAdd);
      onSuccess?.();
      onClose();
      Alert.alert(t('addToPlaylist.added'));
    }
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
            styles.content,
            {
              backgroundColor: colors.card,
              paddingBottom: insets.bottom + 20,
              width: "100%",
              maxWidth: 450,
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('addToPlaylist.addToPlaylist')}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.secondary} />
            </TouchableOpacity>
          </View>

          {/* todo: add current playlist */}

          {loading ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={{ margin: 40 }}
            />
          ) : (
            <View>
              <TouchableOpacity
                style={[
                  styles.playlistItem,
                  { borderBottomColor: colors.border },
                ]}
                onPress={handleAddToCurrentQueue}
              >
                <Ionicons
                  name="play-forward-circle"
                  size={24}
                  color={colors.primary}
                />
                <Text
                  style={[styles.playlistName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {t('addToPlaylist.currentPlaylist')}
                </Text>
              </TouchableOpacity>

              <FlatList
                data={playlists}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.playlistItem,
                      { borderBottomColor: colors.border },
                    ]}
                    onPress={() => handleAddToPlaylist(item.id)}
                    disabled={addingId !== null}
                  >
                    <Ionicons name="list" size={20} color={colors.primary} />
                    <Text
                      style={[styles.playlistName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {addingId === item.id && (
                      <ActivityIndicator size="small" color={colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.empty}>
                    <Text style={{ color: colors.secondary }}>
                      {t('addToPlaylist.noOtherPlaylists')}
                    </Text>
                  </View>
                }
                style={{ maxHeight: 320 }}
              />
            </View>
          )}
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
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
  closeBtn: {
    padding: 5,
  },
  playlistItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  playlistName: {
    fontSize: 16,
    flex: 1,
  },
  empty: {
    alignItems: "center",
    padding: 40,
  },
});
