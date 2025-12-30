import { usePlayer } from "@/src/context/PlayerContext";
import { useTheme } from "@/src/context/ThemeContext";
import { getBaseURL } from "@/src/https";
import { Playlist } from "@/src/models";
import { getPlaylistDetail } from "@/src/services/playlist";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const { playTrack, playTrackList } = usePlayer();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (id) {
      loadData(Number(id));
    }
  }, [id]);

  const loadData = async (playlistId: number) => {
    try {
      setLoading(true);
      const res = await getPlaylistDetail(playlistId);
      if (res.code === 200) setPlaylist(res.data);
    } catch (error) {
      console.error("Failed to load playlist details:", error);
    } finally {
      setLoading(false);
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

  if (!playlist) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, justifyContent: "center" },
        ]}
      >
        <Text style={{ color: colors.text }}>Playlist not found</Text>
      </View>
    );
  }

  const tracks = playlist.tracks || [];

  // Extract unique albums for photo wall - use album name for uniqueness
  const uniqueAlbums = tracks
    .reduce((acc: any[], track) => {
      const albumKey = track.album || track.name;
      if (!acc.find((a) => (a.album || a.name) === albumKey)) {
        acc.push({
          cover: track.cover,
          id: track.id,
          album: track.album,
          name: track.name,
        });
      }
      return acc;
    }, [])
    .slice(0, 11); // Show max 11 album covers

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.customHeader,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      <ScrollView>
        {/* Photo Wall - Staggered Grid */}
        <View style={styles.photoWall}>
          {uniqueAlbums.map((album, index) => {
            // Pattern:
            // Row 1 (4 items): 0.5 - 1 - 1 - 0.5
            // Row 2 (3 items): 1 - 1 - 1
            // Row 3 (4 items): 0.5 - 1 - 1 - 0.5
            const isSmall = [0, 3, 7, 10].includes(index);
            const itemStyle = {
              width: isSmall ? "16.66%" : "33.33%",
              aspectRatio: isSmall ? 0.5 : 1,
            };

            return (
              <View key={index} style={[styles.photoWallItem, itemStyle as ViewStyle]}>
                <Image
                  source={{
                    uri: album.cover
                      ? album.cover.startsWith("http")
                        ? album.cover
                        : `${getBaseURL()}${album.cover}`
                      : `https://picsum.photos/seed/${album.id}/400/400`,
                  }}
                  style={styles.photoWallImage}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {playlist.name}
          </Text>
          <Text style={[styles.subtitle, { color: colors.secondary }]}>
            {tracks.length} 首歌曲
          </Text>
        </View>

        <View style={styles.trackList}>
          {tracks.map((track, index) => (
            <TouchableOpacity
              key={track.id}
              style={[styles.trackItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                playTrackList(tracks, index);
              }}
            >
              <Text style={[styles.trackIndex, { color: colors.secondary }]}>
                {index + 1}
              </Text>
              <Image
                source={{
                  uri: track.cover
                    ? track.cover.startsWith("http")
                      ? track.cover
                      : `${getBaseURL()}${track.cover}`
                    : `https://picsum.photos/seed/${track.id}/20/20`,
                }}
                alt=""
                style={{ width: 40, height: 40, borderRadius: 4 }}
              />
              <View style={styles.trackInfo}>
                <Text
                  style={[styles.trackName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {track.name}
                </Text>
                <Text
                  style={[styles.trackArtist, { color: colors.secondary }]}
                  numberOfLines={1}
                >
                  {track.artist}
                </Text>
              </View>
              <Text style={[styles.trackDuration, { color: colors.secondary }]}>
                {track.duration
                  ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, "0")}`
                  : "--:--"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
    paddingHorizontal: 15,
    paddingBottom: 10,
    zIndex: 1,
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
  },
  photoWall: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
    // gap: 4, // Commented out gap to rule out compatibility issues
  },
  photoWallItem: {
    width: "33.33%", // 3 items per row
    aspectRatio: 1,
    padding: 2, // Use padding to create spacing
  },
  photoWallImage: {
    width: "100%",
    height: "100%",
    borderRadius: 0,
    backgroundColor: "#ddd", // Placeholder color
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
    width: 30,
    fontSize: 14,
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
