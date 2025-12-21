import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
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

export default function PersonalScreen() {
  const { theme, toggleTheme, colors } = useTheme();
  const { mode, setMode } = usePlayMode();
  const { logout, user } = useAuth();
  const { playTrackList } = usePlayer();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabType>("playlists");
  const [showSettings, setShowSettings] = useState(false);
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

  const renderItem = ({ item }: { item: any }) => {
    const isPlaylist = activeTab === "playlists";
    const data = isPlaylist ? (item as Playlist) : (item as Track);
    
    let coverUrl = "https://picsum.photos/100";
    if (isPlaylist) {
      const playlist = item as Playlist;
      if (playlist.tracks && playlist.tracks.length > 0 && playlist.tracks[0].cover) {
        const cover = playlist.tracks[0].cover;
        coverUrl = cover.startsWith("http") ? cover : `${getBaseURL()}${cover}`;
      }
    } else {
      const track = item as Track;
      if (track.cover) {
        coverUrl = track.cover.startsWith("http") ? track.cover : `${getBaseURL()}${track.cover}`;
      }
    }
    
    return (
      <TouchableOpacity 
        style={[styles.item, { borderBottomColor: colors.border }]}
        onPress={() => {
          if (!isPlaylist) {
            const list = activeTab === "favorites" ? favorites : history;
            const index = list.findIndex(t => t.id === (data as Track).id);
            playTrackList(list, index);
          }
        }}
      >
        <Image
          source={{ uri: coverUrl }}
          style={styles.itemCover}
        />
        <View style={styles.itemInfo}>
          <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
            {data.name}
          </Text>
          <Text style={[styles.itemSubtitle, { color: colors.secondary }]}>
            {isPlaylist ? `${(data as Playlist).tracks?.length || 0} 首` : (data as Track).artist}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

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
        <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.iconBtn}>
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

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, paddingTop: insets.top }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>设置</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingRow}>
              <Text style={[styles.settingText, { color: colors.text }]}>深色模式</Text>
              <Switch
                value={theme === "dark"}
                onValueChange={toggleTheme}
                trackColor={{ false: "#767577", true: colors.primary }}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={[styles.settingText, { color: colors.text }]}>有声书模式</Text>
              <Switch
                value={mode === "AUDIOBOOK"}
                onValueChange={(val) => setMode(val ? "AUDIOBOOK" : "MUSIC")}
                trackColor={{ false: "#767577", true: colors.primary }}
              />
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={() => { setShowSettings(false); logout(); }}>
              <Text style={styles.logoutText}>退出登录</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 30,
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
