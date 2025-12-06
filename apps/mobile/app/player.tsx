import { usePlayer } from "@/src/context/PlayerContext";
import { useTheme } from "@/src/context/ThemeContext";
import { getBaseURL } from "@/src/https";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

// Parse LRC format lyrics
interface LyricLine {
  time: number;
  text: string;
}

const parseLyrics = (lyrics: string): LyricLine[] => {
  if (!lyrics) return [];

  const lines = lyrics.split("\n");
  const parsed: LyricLine[] = [];

  for (const line of lines) {
    // Match LRC format: [mm:ss.xx] or [mm:ss] text
    const match = line.match(/\[(\d+):(\d+)(?:\.(\d+))?\](.*)/);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const milliseconds = match[3] ? parseInt(match[3].padEnd(3, "0")) : 0;
      const time = minutes * 60 + seconds + milliseconds / 1000;
      const text = match[4].trim();

      if (text) {
        parsed.push({ time, text });
      }
    } else if (line.trim() && !line.startsWith("[")) {
      // Plain text without timestamp
      parsed.push({ time: 0, text: line.trim() });
    }
  }

  return parsed.sort((a, b) => a.time - b.time);
};

export default function PlayerScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentTrack, isPlaying, pause, resume, duration, position, seekTo } =
    usePlayer();
  const [showLyrics, setShowLyrics] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);

  // Auto-scroll to current lyric
  useEffect(() => {
    if (!showLyrics || !currentTrack?.lyrics) return;

    const lyrics = parseLyrics(currentTrack.lyrics);
    const activeIndex = lyrics.findIndex((line, index) => {
      return (
        line.time <= position &&
        (index === lyrics.length - 1 || lyrics[index + 1].time > position)
      );
    });

    if (activeIndex !== -1 && activeIndex !== currentLyricIndex) {
      setCurrentLyricIndex(activeIndex);

      // Scroll to center the active lyric
      // Each lyric line is approximately 40px (16px font + 8px margin top + 8px margin bottom + 8px line spacing)
      const lineHeight = 40;
      const containerHeight = width * 0.7; // Height of lyrics container
      const scrollToY =
        activeIndex * lineHeight - containerHeight / 2 + lineHeight / 2;

      scrollViewRef.current?.scrollTo({
        y: Math.max(0, scrollToY),
        animated: true,
      });
    }
  }, [position, showLyrics, currentTrack?.lyrics, currentLyricIndex]);

  // Format time (mm:ss)
  const formatTime = (millis: number) => {
    if (!millis) return "0:00";
    const minutes = Math.floor(millis / 60000);
    const seconds = ((millis % 60000) / 1000).toFixed(0);
    return `${minutes}:${Number(seconds) < 10 ? "0" : ""}${seconds}`;
  };

  const togglePlayback = () => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  if (!currentTrack) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>No track playing</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary, marginTop: 20 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="chevron-down" size={30} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View>
          <View style={styles.artworkContainer}>
            {showLyrics ? (
              <View style={styles.lyricsContainer}>
                {currentTrack.lyrics ? (
                  <>
                    <TouchableOpacity
                      style={styles.lyricsToggleButton}
                      onPress={() => setShowLyrics(false)}
                    >
                      <View style={styles.trackInfo}>
                        <Text
                          style={[styles.trackTitle, { color: colors.text }]}
                        >
                          {currentTrack.title}
                        </Text>
                        <Text
                          style={[
                            styles.trackArtist,
                            { color: colors.secondary },
                          ]}
                        >
                          {currentTrack.artist}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <ScrollView
                      ref={scrollViewRef}
                      style={styles.lyricsScroll}
                      contentContainerStyle={styles.lyricsScrollContent}
                    >
                      {parseLyrics(currentTrack.lyrics).map((line, index) => {
                        const isActive =
                          line.time <= position &&
                          (index ===
                            parseLyrics(currentTrack.lyrics!).length - 1 ||
                            parseLyrics(currentTrack.lyrics!)[index + 1].time >
                              position);

                        return (
                          <Text
                            key={index}
                            style={[
                              styles.lyricsLine,
                              {
                                color: isActive
                                  ? colors.primary
                                  : colors.secondary,
                              },
                              isActive && styles.activeLyricsLine,
                            ]}
                          >
                            {line.text}
                          </Text>
                        );
                      })}
                    </ScrollView>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.noLyricsContainer}
                    onPress={() => setShowLyrics(false)}
                  >
                    <Text
                      style={[styles.lyricsText, { color: colors.secondary }]}
                    >
                      暂无歌词
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.artworkContainer}
                activeOpacity={0.9}
                onPress={() => setShowLyrics(true)}
              >
                <Image
                  source={{
                    uri: currentTrack.artwork
                      ? typeof currentTrack.artwork === "string" &&
                        currentTrack.artwork.startsWith("http")
                        ? currentTrack.artwork
                        : `${getBaseURL()}${currentTrack.artwork}`
                      : "https://picsum.photos/400",
                  }}
                  style={styles.artwork}
                />
                <View style={styles.trackInfo}>
                  <Text style={[styles.trackTitle, { color: colors.text }]}>
                    {currentTrack.title}
                  </Text>
                  <Text
                    style={[styles.trackArtist, { color: colors.secondary }]}
                  >
                    {currentTrack.artist}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View>
          <View style={styles.timeContainer}>
            <Text style={[styles.timeText, { color: colors.secondary }]}>
              {formatTime(position)}
            </Text>
            <View
              style={{
                height: 40,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 10,
              }}
            >
              {Array.from({ length: 30 }).map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: 3,
                    height: 10 + Math.random() * 20,
                    backgroundColor:
                      i < (position / duration) * 30
                        ? colors.primary
                        : colors.border,
                    marginHorizontal: 2,
                    borderRadius: 2,
                  }}
                />
              ))}
            </View>
            <Text style={[styles.timeText, { color: colors.secondary }]}>
              {formatTime(duration)}
            </Text>
          </View>

          {/* Controls - Always visible */}
          <View style={styles.controls}>
            <TouchableOpacity>
              <Ionicons name="shuffle" size={24} color={colors.secondary} />
            </TouchableOpacity>

            <View style={styles.mainControls}>
              <TouchableOpacity>
                <Ionicons name="play-skip-back" size={35} color={colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={togglePlayback}
                style={[styles.playButton, { backgroundColor: colors.text }]}
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={40}
                  color={colors.background}
                  style={{ marginLeft: isPlaying ? 0 : 4 }}
                />
              </TouchableOpacity>

              <TouchableOpacity>
                <Ionicons
                  name="play-skip-forward"
                  size={35}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity>
              <Ionicons name="list" size={24} color={colors.secondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  content: {
    flex: 2,
    paddingHorizontal: 30,
    justifyContent: "space-between",
  },
  artworkContainer: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    gap: 40,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  artwork: {
    width: 200,
    height: 200,
    borderRadius: 20,
    boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.3)",
  },
  lyricsContainer: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 20,
  },
  lyricsToggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: "center",
    marginBottom: 10,
  },
  lyricsToggleText: {
    fontSize: 12,
    opacity: 0.6,
  },
  noLyricsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  lyricsScroll: {
    flex: 1,
    width: "100%",
  },
  lyricsScrollContent: {
    paddingVertical: 20,
    alignItems: "center",
  },
  lyricsLine: {
    fontSize: 16,
    textAlign: "center",
    marginVertical: 8,
    lineHeight: 24,
    opacity: 0.6,
  },
  activeLyricsLine: {
    fontSize: 18,
    fontWeight: "600",
    opacity: 1,
  },
  lyricsText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  trackInfo: {
    alignItems: "center",
    marginTop: 0,
  },
  trackTitle: {
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  trackArtist: {
    textAlign: "center",
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  timeText: {
    fontSize: 12,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 40,
  },
  mainControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 30,
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
    paddingHorizontal: 20,
  },
});
