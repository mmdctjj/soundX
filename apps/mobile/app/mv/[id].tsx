import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, useWindowDimensions, Alert } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/context/ThemeContext";
import { getMvById, getMvByTrackId } from "@soundx/services";
import { getImageUrl } from "../../src/utils/image";
import { usePlayer } from "../../src/context/PlayerContext";

export default function MvScreen() {
  const { id } = useLocalSearchParams();
  const isTrackMode = useLocalSearchParams().trackId !== undefined;
  const targetId = isTrackMode ? useLocalSearchParams().trackId : id;

  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { pause } = usePlayer();

  const [mv, setMv] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pause(); // pause audio player
    if (targetId) {
      loadMv(String(targetId));
    }
  }, [targetId]);

  const loadMv = async (mid: string) => {
    try {
      setLoading(true);
      const res = isTrackMode ? await getMvByTrackId(Number(mid)) : await getMvById(Number(mid));
      if (res && res.path) {
        setMv(res);
      } else {
        Alert.alert("Error", "MV not found or invalid.");
      }
    } catch (error) {
      console.error("Failed to load MV:", error);
    } finally {
      setLoading(false);
    }
  };

  const videoSource = mv?.path ? getImageUrl(mv.path) : null;
  const player = useVideoPlayer(videoSource, player => {
    player.loop = true;
    player.play();
  });

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Loading...</Text>
      </View>
    );
  }

  if (!mv) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>MV not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#000', paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-down" size={30} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title} numberOfLines={1}>{mv.name}</Text>
          <Text style={styles.artist} numberOfLines={1}>{mv.artist}</Text>
        </View>
      </View>
      
      <View style={styles.videoContainer}>
        {videoSource && (
           <VideoView style={{ width, height: width * (9/16) }} player={player} allowsPictureInPicture nativeControls={true} fullscreenOptions={{
            enable: true,
            orientation: 'landscape',
            autoExitOnRotate: true,
          }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  backBtn: {
    padding: 5,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  artist: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
