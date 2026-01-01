import { AddToPlaylistModal } from "@/src/components/AddToPlaylistModal";
import PlayingIndicator from "@/src/components/PlayingIndicator";
import { TrackMoreModal } from "@/src/components/TrackMoreModal";
import { usePlayer } from "@/src/context/PlayerContext";
import { useTheme } from "@/src/context/ThemeContext";
import { getBaseURL } from "@/src/https";
import { Album, Track } from "@/src/models";
import { getAlbumById, getAlbumTracks } from "@/src/services/album";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function AlbumDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const { playTrack, playTrackList, currentTrack, isPlaying } = usePlayer();
  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [moreModalVisible, setMoreModalVisible] = useState(false);
  const [addToPlaylistVisible, setAddToPlaylistVisible] = useState(false);

  const PAGE_SIZE = 50;

  useEffect(() => {
    if (id) {
      loadData(Number(id));
    }
  }, [id]);

  const loadData = async (albumId: number) => {
    try {
      setLoading(true);
      const [albumRes, tracksRes] = await Promise.all([
        getAlbumById(albumId),
        getAlbumTracks(albumId, PAGE_SIZE, 0),
      ]);

      if (albumRes.code === 200) setAlbum(albumRes.data);
      if (tracksRes.code === 200) {
        setTracks(tracksRes.data.list);
        setTotal(tracksRes.data.total);
        setHasMore(tracksRes.data.list.length < tracksRes.data.total);
      }
    } catch (error) {
      console.error("Failed to load album details:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || !album) return;

    try {
      setLoadingMore(true);
      const res = await getAlbumTracks(album.id, PAGE_SIZE, tracks.length);
      if (res.code === 200) {
        const newList = [...tracks, ...res.data.list];
        setTracks(newList);
        setHasMore(newList.length < res.data.total);
      }
    } catch (error) {
      console.error("Failed to load more tracks:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, justifyContent: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!album) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, justifyContent: "center" },
        ]}
      >
        <Text style={{ color: colors.text }}>Album not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[styles.customHeader, { backgroundColor: colors.background }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={tracks}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={
          <View style={styles.header}>
            <Image
              source={{
                uri: album.cover
                  ? `${getBaseURL()}${album.cover}`
                  : `https://picsum.photos/seed/${album.id}/300/300`,
              }}
              style={styles.cover}
            />
            <Text style={[styles.title, { color: colors.text }]}>
              {album.name}
            </Text>
            <Text style={[styles.artist, { color: colors.secondary }]}>
              {album.artist}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[styles.trackItem, { borderBottomColor: colors.border }]}
            onPress={() => {
              playTrackList(tracks, index);
            }}
            onLongPress={() => {
              setSelectedTrack(item);
              setMoreModalVisible(true);
            }}
          >
            <View style={styles.trackIndexContainer}>
              {currentTrack?.id === item.id && isPlaying ? (
                <PlayingIndicator />
              ) : (
                <Text style={[styles.trackIndex, { color: currentTrack?.id === item.id ? colors.primary : colors.secondary }]}>
                  {index + 1}
                </Text>
              )}
            </View>
            <Image
              source={{
                uri: item.cover
                  ? `${getBaseURL()}${item.cover}`
                  : `https://picsum.photos/seed/${item.id}/20/20`,
              }}
              alt=""
              style={{ width: 20, height: 20, borderRadius: 2 }}
            />
            <View style={styles.trackInfo}>
              <Text
                style={[styles.trackName, { color: colors.text }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
            </View>
            {album.type === "AUDIOBOOK" &&
            item.listenedAsAudiobookByUsers?.[0]?.progress ? (
              <View style={{ marginRight: 10 }}>
                <Text style={{ fontSize: 10, color: colors.primary }}>
                  {Math.floor(
                    ((item.listenedAsAudiobookByUsers[0].progress || 0) /
                      (item.duration || 1)) *
                      100
                  )}
                  %
                </Text>
              </View>
            ) : null}
            <Text style={[styles.trackDuration, { color: colors.secondary }]}>
              {item.duration
                ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, "0")}`
                : "--:--"}
            </Text>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ padding: 20 }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      />

      <TrackMoreModal
        visible={moreModalVisible}
        track={selectedTrack}
        onClose={() => setMoreModalVisible(false)}
        onAddToPlaylist={(track) => {
          setSelectedTrack(track);
          setAddToPlaylistVisible(true);
        }}
        onDeleteSuccess={(id) => {
          setTracks(tracks.filter((t) => t.id !== id));
        }}
      />

      <AddToPlaylistModal
        visible={addToPlaylistVisible}
        trackId={selectedTrack?.id ?? null}
        onClose={() => setAddToPlaylistVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    padding: 20,
  },
  customHeader: {
    paddingTop: 50, // Adjust for status bar
    paddingHorizontal: 15,
    paddingBottom: 10,
    zIndex: 1,
  },
  backButton: {
    padding: 5,
  },
  cover: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  artist: {
    fontSize: 18,
    textAlign: "center",
  },
  trackList: {
    padding: 20,
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  trackIndex: {
    fontSize: 14,
    textAlign: 'center',
  },
  trackIndexContainer: {
    width: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    marginHorizontal: 10,
  },
  trackName: {
    fontSize: 16,
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 12,
  },
  trackDuration: {
    fontSize: 12,
  },
});
