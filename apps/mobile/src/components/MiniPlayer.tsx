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
  const { currentTrack, isPlaying, pause, resume } = usePlayer();

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
      <Image
        source={{
          uri: currentTrack.artwork
            ? typeof currentTrack.artwork === "string" &&
              currentTrack.artwork.startsWith("http")
              ? currentTrack.artwork
              : `${getBaseURL()}${currentTrack.artwork}`
            : "https://picsum.photos/100",
        }}
        style={styles.artwork}
      />
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {currentTrack.title}
        </Text>
        <Text
          style={[styles.artist, { color: colors.secondary }]}
          numberOfLines={1}
        >
          {currentTrack.artist}
        </Text>
      </View>
      <TouchableOpacity onPress={togglePlayback} style={styles.control}>
        <Ionicons
          name={isPlaying ? "pause" : "play"}
          size={28}
          color={colors.primary}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    width: "100%",
    height: 60,
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
  control: {
    padding: 10,
    height: 60,
  },
});
