import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getBaseURL } from "../../src/https";
import { Artist } from "../../src/models";
import { getArtistList } from "../../src/services/artist";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/context/ThemeContext";

const { width } = Dimensions.get("window");
const COLUMN_COUNT = 3;
const ITEM_WIDTH = (width - 40 - (COLUMN_COUNT - 1) * 15) / COLUMN_COUNT;

export default function LibraryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadArtists(1);
  }, []);

  const loadArtists = async (pageNum: number) => {
    try {
      if (pageNum === 1) setLoading(true);

      // Load 20 items per page
      const res = await getArtistList(20, pageNum, "MUSIC");

      if (res.code === 200 && res.data) {
        const { list, total } = res.data;
        if (pageNum === 1) {
          setArtists(list);
        } else {
          setArtists((prev: Artist[]) => [...prev, ...list]);
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

  if (loading && page === 1) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
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
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Library
        </Text>
      </View>

      <FlatList
        data={artists}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <Image
              source={{
                uri: item.avatar
                  ? `${getBaseURL()}${item.avatar}`
                  : `https://picsum.photos/seed/${item.id}/200/200`,
              }}
              style={[styles.image, { backgroundColor: colors.card }]}
            />
            <Text
              style={[styles.name, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id.toString()}
        numColumns={COLUMN_COUNT}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          hasMore ? (
            <ActivityIndicator style={{ margin: 20 }} color={colors.primary} />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  listContent: {
    padding: 20,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 20,
  },
  card: {
    width: ITEM_WIDTH,
    alignItems: "center",
  },
  image: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    borderRadius: ITEM_WIDTH / 2,
    marginBottom: 8,
    backgroundColor: "#f0f0f0",
  },
  name: {
    fontSize: 14,
    textAlign: "center",
    color: "#333",
  },
});
