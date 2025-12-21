import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { getBaseURL } from "../../src/https";
import { Album, Artist } from "../../src/models";
import { loadMoreAlbum } from "../../src/services/album";
import { getArtistList } from "../../src/services/artist";

import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/context/ThemeContext";
import { usePlayMode } from "../../src/utils/playMode";

const GAP = 15;
const SCREEN_PADDING = 40; // 20 horizontal padding * 2
const TARGET_WIDTH = 120; // Target width similar to Recommended section

const ArtistList = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const { mode } = usePlayMode();
  const { width } = useWindowDimensions();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Calculate columns dynamically
  const availableWidth = width - SCREEN_PADDING;
  // min columns 2
  const numColumns = Math.max(
    2,
    Math.floor((availableWidth + GAP) / (TARGET_WIDTH + GAP))
  );
  const itemWidth = (availableWidth - (numColumns - 1) * GAP) / numColumns;

  useEffect(() => {
    loadArtists(0);
  }, [mode]);

  const loadArtists = async (pageNum: number) => {
    try {
      if (pageNum === 0) setLoading(true);

      const res = await getArtistList(20, pageNum, mode);

      if (res.code === 200 && res.data) {
        const { list, total } = res.data;
        if (pageNum === 0) {
          setArtists(list);
        } else {
          setArtists((prev) => [...prev, ...list]);
        }
        setHasMore(artists.length + list.length < total);
        setPage(pageNum);
      }
    } catch (error) {
      console.error("Failed to load artists:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadArtists(page + 1);
    }
  };
  // ... rest of ArtistList
  if (loading && page === 0) {
    return (
      <ActivityIndicator
        size="large"
        color={colors.primary}
        style={{ marginTop: 20 }}
      />
    );
  }

  return (
    <FlatList
      data={artists}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={{ width: itemWidth }}
          onPress={() => router.push(`/artist/${item.id}`)}
        >
          <Image
            source={{
              uri: item.avatar
                ? `${getBaseURL()}${item.avatar}`
                : `https://picsum.photos/seed/${item.id}/200/200`,
            }}
            style={[
              styles.image,
              {
                width: itemWidth,
                height: itemWidth,
                backgroundColor: colors.card,
              },
            ]}
          />
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item.id.toString()}
      key={numColumns} // Force re-render when columns change
      numColumns={numColumns}
      columnWrapperStyle={[styles.row, { gap: GAP }]}
      contentContainerStyle={styles.listContent}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        hasMore ? (
          <ActivityIndicator style={{ margin: 20 }} color={colors.primary} />
        ) : null
      }
    />
  );
};

const AlbumList = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const { mode } = usePlayMode();
  const { width } = useWindowDimensions();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Calculate columns dynamically
  const availableWidth = width - SCREEN_PADDING;
  const numColumns = Math.max(
    2,
    Math.floor((availableWidth + GAP) / (TARGET_WIDTH + GAP))
  );
  const itemWidth = (availableWidth - (numColumns - 1) * GAP) / numColumns;

  useEffect(() => {
    loadAlbums(0);
  }, [mode]);

  const loadAlbums = async (pageNum: number) => {
    try {
      if (pageNum === 0) setLoading(true);

      const res = await loadMoreAlbum({
        pageSize: 20,
        loadCount: pageNum,
        type: mode,
      });

      if (res.code === 200 && res.data) {
        const { list, total } = res.data;
        if (pageNum === 0) {
          setAlbums(list);
        } else {
          setAlbums((prev) => [...prev, ...list]);
        }
        setHasMore(albums.length + list.length < total);
        setPage(pageNum);
      }
    } catch (error) {
      console.error("Failed to load albums:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadAlbums(page + 1);
    }
  };

  if (loading && page === 0) {
    return (
      <ActivityIndicator
        size="large"
        color={colors.primary}
        style={{ marginTop: 20 }}
      />
    );
  }

  return (
    <FlatList
      data={albums}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={{ width: itemWidth }}
          onPress={() => router.push(`/album/${item.id}`)}
        >
          <Image
            source={{
              uri: item.cover
                ? `${getBaseURL()}${item.cover}`
                : `https://picsum.photos/seed/${item.id}/200/200`,
            }}
            style={[
              styles.albumImage,
              {
                width: itemWidth,
                height: itemWidth,
                backgroundColor: colors.card,
              },
            ]}
          />
          <Text
            style={[styles.albumTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text
            style={[styles.albumArtist, { color: colors.secondary }]}
            numberOfLines={1}
          >
            {item.artist}
          </Text>
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item.id.toString()}
      key={numColumns}
      numColumns={numColumns}
      columnWrapperStyle={[styles.row, { gap: GAP }]}
      contentContainerStyle={styles.listContent}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        hasMore ? (
          <ActivityIndicator style={{ margin: 20 }} color={colors.primary} />
        ) : null
      }
    />
  );
};

export default function LibraryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"artists" | "albums">("artists");

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      <View style={styles.tabContent}>
        <View
          style={[
            styles.segmentedControl,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.segmentItem,
              activeTab === "artists" && { backgroundColor: colors.primary },
            ]}
            onPress={() => setActiveTab("artists")}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    activeTab === "artists" ? "#fff" : colors.secondary,
                },
              ]}
            >
              艺术家
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentItem,
              activeTab === "albums" && { backgroundColor: colors.primary },
            ]}
            onPress={() => setActiveTab("albums")}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    activeTab === "albums" ? "#fff" : colors.secondary,
                },
              ]}
            >
              专辑
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === "artists" ? <ArtistList /> : <AlbumList />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTop: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
  },
  tabContent: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  segmentedControl: {
    flexDirection: "row",
    height: 40,
    borderRadius: 20,
    padding: 2,
    borderWidth: 1,
  },
  segmentItem: {
    flex: 1,
    height: "100%",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  listContent: {
    padding: 20,
  },
  row: {
    // justifyContent: "space-between", // removed for gap support
    marginBottom: 20,
  },
  // Removed fixed Width styles
  image: {
    borderRadius: 999, // circle
    marginBottom: 8,
    backgroundColor: "#f0f0f0",
    alignSelf: "center",
  },
  name: {
    fontSize: 14,
    textAlign: "center",
    color: "#333",
  },
  albumImage: {
    borderRadius: 15,
    marginBottom: 8,
    backgroundColor: "#f0f0f0",
  },
  albumTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  albumArtist: {
    fontSize: 12,
  },
});
