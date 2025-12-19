import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { usePlayer } from "../context/PlayerContext";
import { useTheme } from "../context/ThemeContext";
import { getBaseURL } from "../https";

export const MiniPlayer = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const { currentTrack, isPlaying, pause, resume, playNext, playPrevious, setShowPlaylist } =
    usePlayer();

  if (!currentTrack) return null;

  const togglePlayback = () => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push("/player")}
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.background,
        },
      ]}
    >
      <View style={styles.infoContaer}>
        <Image
          source={{
            uri: currentTrack.cover
              ? typeof currentTrack.cover === "string" &&
                currentTrack.cover.startsWith("http")
                ? currentTrack.cover
                : `${getBaseURL()}${currentTrack.cover}`
              : "https://picsum.photos/100",
          }}
          style={styles.artwork}
        />
        <View style={styles.info}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {currentTrack.name}
          </Text>
          <Text
            style={[styles.artist, { color: colors.secondary }]}
            numberOfLines={1}
          >
            {currentTrack.artist}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity onPress={playPrevious}>
          <Ionicons name="play-skip-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={togglePlayback}>
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={20}
            color={colors.primary}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={playNext}>
          <Ionicons name="play-skip-forward" size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowPlaylist(true)}>
          <Ionicons name="list" size={24} color={colors.secondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    width: "100%",
    height: 60,
  },
  infoContaer: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  artwork: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  info: {
    flex: 1,
    marginLeft: 10,
    justifyContent: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 5,
  },
  artist: {
    fontSize: 12,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 16,
  },
});
