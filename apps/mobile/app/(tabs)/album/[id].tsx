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
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function AlbumDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const { playTrack, playTrackList } = usePlayer();
  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

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
        getAlbumTracks(albumId, 100, 0),
      ]);

      if (albumRes.code === 200) setAlbum(albumRes.data);
      if (tracksRes.code === 200) setTracks(tracksRes.data.list);
    } catch (error) {
      console.error("Failed to load album details:", error);
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
      <ScrollView>
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

        <View style={styles.trackList}>
          {tracks.map((track, index) => (
            <TouchableOpacity
              key={track.id}
              style={[styles.trackItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                const mappedTracks = tracks.map((t) => ({
                  id: String(t.id),
                  url: `${getBaseURL()}${t.path}`,
                  title: t.name,
                  artist: t.artist,
                  artwork: album.cover || "",
                  duration: t.duration || 0,
                  lyrics: t.lyrics,
                  type: album.type,
                  progress: t.listenedAsAudiobookByUsers?.[0]?.progress || 0,
                }));
                playTrackList(mappedTracks, index);
              }}
            >
              <Text style={[styles.trackIndex, { color: colors.secondary }]}>
                {index + 1}
              </Text>
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
              {album.type === "AUDIOBOOK" &&
              track.listenedAsAudiobookByUsers?.[0]?.progress ? (
                <View style={{ marginRight: 10 }}>
                  <Text style={{ fontSize: 10, color: colors.primary }}>
                    {Math.floor(
                      ((track.listenedAsAudiobookByUsers[0].progress || 0) /
                        (track.duration || 1)) *
                        100
                    )}
                    %
                  </Text>
                </View>
              ) : null}
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
