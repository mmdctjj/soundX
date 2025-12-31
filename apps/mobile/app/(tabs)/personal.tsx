import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/context/AuthContext";
import { usePlayer } from "../../src/context/PlayerContext";
import { useTheme } from "../../src/context/ThemeContext";
import { getBaseURL } from "../../src/https";
import { Playlist, Track } from "../../src/models";
import { getPlaylists } from "../../src/services/playlist";
import { getHistoryTracks, getLikedTracks } from "../../src/services/user";
import { usePlayMode } from "../../src/utils/playMode";

type TabType = "playlists" | "favorites" | "history";

const StackedCover = ({ tracks }: { tracks: any[] }) => {
  const covers = (tracks || []).slice(0, 3);
  
  return (
    <View style={styles.stackedCoverContainer}>
      {covers.map((track, index) => {
        let coverUrl = "https://picsum.photos/100";
        if (track.cover) {
          coverUrl = track.cover.startsWith("http") ? track.cover : `${getBaseURL()}${track.cover}`;
        }
        
        return (
          <Image
            key={track.id}
            source={{ uri: coverUrl }}
            style={[
              styles.itemCover,
              styles.stackedCover,
              { 
                zIndex: 3 - index,
                left: index * 10,
                top: index * 4,
                position: index === 0 ? 'relative' : 'absolute',
                opacity: 1 - (index * 0.2)
              }
            ]}
          />
        );
      })}
      {covers.length === 0 && (
        <Image
          source={{ uri: "https://picsum.photos/100" }}
          style={styles.itemCover}
        />
      )}
    </View>
  );
};

export default function PersonalScreen() {
  const { theme, toggleTheme, colors } = useTheme();
  const { mode, setMode } = usePlayMode();
  const { logout, user } = useAuth();
  const { playTrackList } = usePlayer();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>("playlists");
  const [loading, setLoading] = useState(false);
  
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, activeTab, mode]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (activeTab === "playlists") {
        const res = await getPlaylists(user.id, mode as any); 
        if (res.code === 200) setPlaylists(res.data);
      } else if (activeTab === "favorites") {
        const res = await getLikedTracks(user.id, 0, 10000, mode as any);
        if (res.code === 200) setFavorites(res.data.list.map((item: any) => item.track));
      } else if (activeTab === "history") {
        const res = await getHistoryTracks(user.id, 0, 10000, mode as any);
        if (res.code === 200) setHistory(res.data.list.map((item: any) => item.track));
      }
    } catch (error) {
      console.error("Failed to load personal data:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = React.useCallback(({ item }: { item: any }) => {
    const isPlaylist = activeTab === "playlists";
    const data = isPlaylist ? (item as Playlist) : (item as Track);
    let coverUrl = "https://picsum.photos/100";
    if (!isPlaylist) {
      const track = item as Track;
      if (track.cover) {
        coverUrl = track.cover.startsWith("http") ? track.cover : `${getBaseURL()}${track.cover}`;
      }
    }
    
    return (
      <TouchableOpacity 
        style={[styles.item, { borderBottomColor: colors.border }]}
        onPress={() => {
          if (isPlaylist) {
            router.push(`/playlist/${(data as Playlist).id}`);
          } else {
            const list = activeTab === "favorites" ? favorites : history;
            const index = list.findIndex(t => t.id === (data as Track).id);
            playTrackList(list, index);
          }
        }}
      >
        {isPlaylist ? (
          <StackedCover tracks={(item as Playlist).tracks || []} />
        ) : (
          <Image
            source={{ uri: coverUrl }}
            style={styles.itemCover}
          />
        )}
        <View style={styles.itemInfo}>
          <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
            {data.name}
          </Text>
          <Text style={[styles.itemSubtitle, { color: colors.secondary }]}>
            {isPlaylist ? `${(data as Playlist)._count?.tracks || (data as Playlist).tracks?.length || 0} 首` : (data as Track).artist}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [activeTab, colors, favorites, history, playTrackList]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <TouchableOpacity onPress={() => router.push("/settings")} style={styles.iconBtn}>
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* User Info */}
      <View style={styles.userInfo}>
        <Image
          source={{ uri: "https://picsum.photos/200" }} // Placeholder for avatar
          style={styles.avatar}
        />
        <Text style={[styles.nickname, { color: colors.text }]}>
          {user?.username || "未登录"}
        </Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {[
          { key: "playlists", label: "播放列表" },
          { key: "favorites", label: "收藏" },
          { key: "history", label: "听过" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabItem,
              activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab(tab.key as TabType)}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.key ? colors.primary : colors.secondary },
                activeTab === tab.key && { fontWeight: "bold" },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={activeTab === "playlists" ? playlists : (activeTab === "favorites" ? favorites : history)}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: colors.secondary, marginTop: 40 }}>暂无数据</Text>
            </View>
          }
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    height: 50,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  iconBtn: {
    padding: 5,
  },
  userInfo: {
    alignItems: "center",
    paddingVertical: 0,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 15,
  },
  nickname: {
    fontSize: 20,
    fontWeight: "bold",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 15,
  },
  tabText: {
    fontSize: 16,
  },
  item: {
    flexDirection: "row",
    padding: 15,
    alignItems: "center",
    borderBottomWidth: 0.5,
  },
  itemCover: {
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
  stackedCoverContainer: {
    width: 70,
    height: 60,
    marginRight: 15,
  },
  stackedCover: {
    borderWidth: 2,
    borderColor: "#fff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    height: "60%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(150,150,150,0.2)",
  },
  settingText: {
    fontSize: 16,
  },
  logoutBtn: {
    marginTop: 40,
    backgroundColor: "#ff4d4f",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
