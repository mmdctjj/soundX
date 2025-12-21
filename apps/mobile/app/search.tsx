import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayer } from "../src/context/PlayerContext";
import { useTheme } from "../src/context/ThemeContext";
import { getBaseURL } from "../src/https";
import { Album, Artist, Track } from "../src/models";
import { searchAlbums, searchArtists, searchTracks } from "../src/services/search";
import { usePlayMode } from "../src/utils/playMode";

export default function SearchScreen() {
  const { colors } = useTheme();
  const { mode } = usePlayMode();
  const { playTrack } = usePlayer();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    tracks: Track[];
    artists: Artist[];
    albums: Album[];
  }>({
    tracks: [],
    artists: [],
    albums: [],
  });

  useEffect(() => {
    if (keyword.trim().length > 0) {
      const timer = setTimeout(() => {
        handleSearch();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setResults({ tracks: [], artists: [], albums: [] });
    }
  }, [keyword]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const [tracksRes, artistsRes, albumsRes] = await Promise.all([
        searchTracks(keyword, mode),
        searchArtists(keyword, mode),
        searchAlbums(keyword, mode),
      ]);

      setResults({
        tracks: tracksRes.code === 200 ? tracksRes.data : [],
        artists: artistsRes.code === 200 ? artistsRes.data : [],
        albums: albumsRes.code === 200 ? albumsRes.data : [],
      });
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item, type }: { item: any; type: string }) => {
    let coverUrl = "https://picsum.photos/100";
    if (type === "track" || type === "album") {
      if (item.cover) {
        coverUrl = item.cover.startsWith("http") ? item.cover : `${getBaseURL()}${item.cover}`;
      }
    } else if (type === "artist") {
      if (item.avatar) {
        coverUrl = item.avatar.startsWith("http") ? item.avatar : `${getBaseURL()}${item.avatar}`;
      }
    }

    return (
      <TouchableOpacity
        style={[styles.item, { borderBottomColor: colors.border }]}
        onPress={() => {
          if (type === "track") {
            playTrack(item);
          } else if (type === "artist") {
            router.push(`/artist/${item.id}`);
          } else if (type === "album") {
            router.push(`/album/${item.id}`);
          }
        }}
      >
        <Image
          source={{ uri: coverUrl }}
          style={[styles.itemImage, type === "artist" && { borderRadius: 25 }]}
        />
        <View style={styles.itemInfo}>
          <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.itemSubtitle, { color: colors.secondary }]}>
            {type === "track" ? item.artist : type === "album" ? item.artist : "艺术家"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.secondary} />
      </TouchableOpacity>
    );
  };

  const sections = [
    { title: "艺术家", data: results.artists, type: "artist" },
    { title: "专辑", data: results.albums, type: "album" },
    { title: "单曲", data: results.tracks, type: "track" },
  ].filter(s => s.data.length > 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={20} color={colors.secondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="搜索单曲，艺术家，专辑"
            placeholderTextColor={colors.secondary}
            value={keyword}
            onChangeText={setKeyword}
            autoFocus
          />
          {keyword.length > 0 && (
            <TouchableOpacity onPress={() => setKeyword("")}>
              <Ionicons name="close-circle" size={20} color={colors.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : keyword.trim().length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={64} color={colors.border} />
          <Text style={{ color: colors.secondary, marginTop: 10 }}>开始搜索你喜欢的音乐</Text>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: colors.secondary }}>未找到相关结果</Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item) => item.title}
          renderItem={({ item: section }) => (
            <View>
              <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
              </View>
              {section.data.map((item) => (
                <View key={item.id}>
                  {renderItem({ item, type: section.type })}
                </View>
              ))}
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 10,
  },
  backBtn: {
    padding: 5,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
  },
  center: {
    paddingTop: 100,
    alignItems: "center",
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    marginHorizontal: 15,
    borderBottomWidth: 0.5,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 15,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 13,
  },
});
