import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState, useSyncExternalStore } from "react";
import { View, StyleSheet, Text, TouchableOpacity, useWindowDimensions, Alert, Image, FlatList } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import SkeletonBlock from "@/src/components/SkeletonBlock";
import { useTheme } from "../../src/context/ThemeContext";
import { getMvById, getMvByTrackId, type Mv } from "@soundx/services";
import { getImageUrl } from "../../src/utils/image";
import { usePlayer } from "../../src/context/PlayerContext";
import { mvPlaylistStore } from "../../src/store/mvPlaylist";

export default function MvScreen() {
  const { id, trackId } = useLocalSearchParams<{ id?: string; trackId?: string }>();
  const isTrackMode = trackId !== undefined;
  const targetId = trackId ?? id;

  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { pause } = usePlayer();

  const [mv, setMv] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  const playlistState = useSyncExternalStore(
    mvPlaylistStore.subscribe,
    mvPlaylistStore.getState,
  );
  const inPlaylist = playlistState.list.length > 1;
  const displayPlaylist = playlistState.list.length > 0
    ? playlistState.list
    : mv
      ? [mv]
      : [];
  const displayCurrentIndex = playlistState.list.length > 0 ? playlistState.currentIndex : 0;

  const syncPlaylistIndex = (targetMv: Mv) => {
    const targetIndex = playlistState.list.findIndex((item) => item.id === targetMv.id);
    if (targetIndex >= 0 && targetIndex !== playlistState.currentIndex) {
      mvPlaylistStore.setPlaylist(playlistState.list, targetIndex);
    }
  };

  const handlePlayMv = (targetMv: Mv) => {
    syncPlaylistIndex(targetMv);
    router.replace(`/mv/${targetMv.id}`);
  };

  const handlePrevMv = () => {
    const prevMv = mvPlaylistStore.prev();
    if (prevMv) {
      handlePlayMv(prevMv);
    }
  };

  const handleNextMv = () => {
    const nextMv = mvPlaylistStore.next();
    if (nextMv) {
      handlePlayMv(nextMv);
    }
  };

  const togglePlayback = () => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const videoSource = mv?.path ? getImageUrl(mv.path) : null;
  const player = useVideoPlayer(videoSource, player => {
    player.loop = !inPlaylist;
    player.play();
  });

  useEffect(() => {
    pause();
    if (!targetId) {
      return;
    }

    const fetchMv = async () => {
      try {
        setLoading(true);
        const playlistItem = playlistState.list[playlistState.currentIndex];
        if (playlistItem && String(playlistItem.id) === String(targetId)) {
          setMv(playlistItem);
        } else {
          const res = isTrackMode
            ? await getMvByTrackId(Number(targetId))
            : await getMvById(Number(targetId));
          if (res && res.path) {
            setMv(res);
          } else {
            Alert.alert("Error", "MV not found or invalid.");
          }
        }
      } catch (error) {
        console.error("Failed to load MV:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMv();
  }, [pause, targetId, isTrackMode, playlistState.currentIndex, playlistState.list]);

  // Listen for playback end in playlist mode
  useEffect(() => {
    if (!inPlaylist || !player) return;
    const subscription = player.addListener('statusChange' as any, ({ status }: { status: string }) => {
      if (status === 'idle' && player.currentTime > 0) {
        const nextMv = mvPlaylistStore.next();
        if (nextMv) {
          const targetIndex = playlistState.list.findIndex((item) => item.id === nextMv.id);
          if (targetIndex >= 0 && targetIndex !== playlistState.currentIndex) {
            mvPlaylistStore.setPlaylist(playlistState.list, targetIndex);
          }
          router.replace(`/mv/${nextMv.id}`);
        }
      }
    });
    return () => subscription?.remove();
  }, [inPlaylist, player, playlistState.currentIndex, playlistState.list, router]);

  useEffect(() => {
    if (!player) return;
    setIsPlaying(player.playing);
    const subscription = player.addListener('playingChange' as any, ({ isPlaying: nextIsPlaying }: { isPlaying: boolean }) => {
      setIsPlaying(nextIsPlaying);
    });
    return () => subscription?.remove();
  }, [player, mv?.id]);

  const hasPrev = mvPlaylistStore.hasPrev();
  const hasNext = mvPlaylistStore.hasNext();

  if (loading) {
    return <MvDetailSkeleton />;
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
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{mv.name}</Text>
          <Text style={[styles.artist, { color: colors.secondary }]} numberOfLines={1}>{mv.artist}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {videoSource && (
          <View style={[styles.videoFrame, { width, height: width * (9 / 16) }]}>
            <VideoView
              style={styles.video}
              player={player}
              allowsPictureInPicture
              nativeControls={true}
              showsTimecodes={false}
              fullscreenOptions={{
                enable: true,
                orientation: 'landscape',
                autoExitOnRotate: true,
              }}
            />
          </View>
        )}
        {displayPlaylist.length > 0 && (
          <View style={styles.playlistSection}>
            <View style={styles.playlistHeader}>
              <Text style={[styles.playlistCount, { color: colors.secondary }]}>
                <Text style={[styles.playlistTitle, { color: colors.text }]}>待播放 MV</Text>
                ({displayCurrentIndex + 1} / {displayPlaylist.length})
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-start' }}>
                <TouchableOpacity
                  style={[styles.controlBtn, !hasPrev && styles.controlBtnDisabled]}
                  onPress={handlePrevMv}
                  disabled={!hasPrev}
                >
                  <Ionicons name="play-skip-back" size={22} color={hasPrev ? colors.text : "rgba(255,255,255,0.35)"} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.playBtn} onPress={togglePlayback}>
                  <Ionicons name={isPlaying ? "pause" : "play"} size={30} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.controlBtn, !hasNext && styles.controlBtnDisabled]}
                  onPress={handleNextMv}
                  disabled={!hasNext}
                >
                  <Ionicons name="play-skip-forward" size={22} color={hasNext ? colors.text : "rgba(255,255,255,0.35)"} />
                </TouchableOpacity>
              </View>
              
            </View>
            <FlatList
              data={displayPlaylist}
              keyExtractor={(item) => String(item.id)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
              renderItem={({ item, index }) => {
                const isActive = item.id === mv?.id;
                return (
                  <TouchableOpacity
                    style={[
                      styles.playlistItem,
                      { borderBottomColor: colors.border },
                      isActive && { backgroundColor: colors.primary + '18' },
                    ]}
                    onPress={() => {
                      if (!isActive) handlePlayMv(item);
                    }}
                  >
                    <Text
                      style={[
                        styles.playlistItemIndex,
                        { color: isActive ? colors.primary : colors.secondary },
                      ]}
                    >
                      {index + 1}
                    </Text>
                    <Image
                      source={{ uri: getImageUrl(item.cover, `https://picsum.photos/seed/mv-${item.id}/80/45`) }}
                      style={styles.playlistItemCover}
                    />
                    <View style={styles.playlistItemInfo}>
                      <Text
                        style={[styles.playlistItemName, { color: isActive ? colors.primary : colors.text }]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      {item.artist && (
                        <Text style={[styles.playlistItemArtist, { color: colors.secondary }]} numberOfLines={1}>
                          {item.artist}
                        </Text>
                      )}
                    </View>
                    {isActive && <Ionicons name="play" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
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
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 6,
  },
  videoFrame: {
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  controlsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 18,
    marginBottom: 22,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnDisabled: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistSection: {
    width: '100%',
    paddingHorizontal: 16,
    flex: 1,
    minHeight: 0,
  },
  playlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  playlistTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  playlistCount: {
    fontSize: 12,
  },
  skeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  skeletonInfo: {
    flex: 1,
    marginLeft: 10,
  },
  skeletonVideoFrame: {
    overflow: "hidden",
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  playlistItemIndex: {
    width: 24,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
  },
  playlistItemCover: {
    width: 64,
    height: 36,
    borderRadius: 4,
  },
  playlistItemInfo: {
    flex: 1,
  },
  playlistItemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  playlistItemArtist: {
    fontSize: 11,
    marginTop: 2,
  },
});

function MvDetailSkeleton() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.skeletonHeader}>
        <View style={styles.backBtn}>
          <SkeletonBlock width={28} height={28} borderRadius={14} />
        </View>
        <View style={styles.skeletonInfo}>
          <SkeletonBlock width="52%" height={18} borderRadius={9} style={{ marginBottom: 8 }} />
          <SkeletonBlock width="30%" height={12} borderRadius={6} />
        </View>
      </View>

      <View style={styles.content}>
        <SkeletonBlock
          width={width}
          height={width * (9 / 16)}
          borderRadius={0}
          style={styles.skeletonVideoFrame}
        />
      </View>
    </View>
  );
}
