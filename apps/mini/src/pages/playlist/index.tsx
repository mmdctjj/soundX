import { getPlaylistById, Track } from "@soundx/services";
import { Image, ScrollView, Text, View } from "@tarojs/components";
import Taro, { useRouter } from "@tarojs/taro";
import { useEffect, useMemo, useState } from "react";
import MiniPlayer from "../../components/MiniPlayer";
import { usePlayer } from "../../context/PlayerContext";
import { getBaseURL } from "../../utils/request";
import "./index.scss";
import BottomTabBar from '../../components/BottomTabBar';

export default function PlaylistDetail() {
  const router = useRouter();
  const playlistId = useMemo(() => Number(router.params.id), [router.params.id]);
  const { playTrackList, currentTrack, isPlaying } = usePlayer();

  const [loading, setLoading] = useState(true);
  const [playlistName, setPlaylistName] = useState("播放列表");
  const [tracks, setTracks] = useState<Track[]>([]);

  useEffect(() => {
    if (!playlistId) return;
    loadData(playlistId);
  }, [playlistId]);

  const loadData = async (id: number) => {
    setLoading(true);
    try {
      const res = await getPlaylistById(id);
      if (res.code === 200 && res.data) {
        setPlaylistName(res.data.name || "播放列表");
        setTracks((res.data.tracks || []) as unknown as Track[]);
      }
    } catch (error) {
      console.error("Failed to load playlist:", error);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (url: string | null) => {
    if (!url) return `https://picsum.photos/200/200`;
    if (url.startsWith("http")) return url;
    return `${getBaseURL()}${url}`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const uniqueAlbums = useMemo(() => {
    return tracks
      .reduce((acc: any[], track) => {
        const albumKey = track.album || track.name;
        if (!acc.find((a) => (a.album || a.name) === albumKey)) {
          acc.push({
            cover: track.cover,
            id: track.id,
            album: track.album,
            name: track.name,
          });
        }
        return acc;
      }, [])
      .slice(0, 11);
  }, [tracks]);

  if (loading) {
    return (
      <View className="playlist-page">
        <View className="center-msg"><Text>加载中...</Text></View>
      </View>
    );
  }

  return (
    <View className="playlist-page">
      <ScrollView scrollY className="content">
        {/* Photo Wall - Staggered Grid */}
        <View className="photo-wall">
          {uniqueAlbums.map((album, index) => {
            const isSmall = [0, 3, 7, 10].includes(index);
            const itemStyle = {
              width: isSmall ? "16.66%" : "33.33%",
              aspectRatio: isSmall ? 0.5 : 1,
            };

            return (
              <View
                key={index}
                className="photo-wall-item"
                style={itemStyle}
              >
                <Image
                  src={getImageUrl(album.cover)}
                  className="photo-wall-image"
                  mode="aspectFill"
                />
              </View>
            );
          })}
        </View>

        <View className="nav-bar">
          <Text className="title" numberOfLines={1}>{playlistName}</Text>
          <View className="spacer" />
        </View>

        <View className="actions">
          <View
            className={`play-all ${tracks.length === 0 ? "disabled" : ""}`}
            onClick={() => tracks.length > 0 && playTrackList(tracks as any, 0)}
          >
            <Text>播放全部</Text>
          </View>
        </View>

        <View className="track-list">
          {tracks.length === 0 ? (
            <View className="center-msg"><Text>暂无曲目</Text></View>
          ) : (
              tracks.map((item, index) => (
                <View
                  key={`${item.id}-${index}`}
                  className="track-item"
                  onClick={() => playTrackList(tracks as any, index)}
                >
                  <Image src={getImageUrl(item.cover || null)} className="cover" mode="aspectFill" />
                  <View className="info">
                    <Text className={`name ${currentTrack?.id === item.id ? "active" : ""}`} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text className="sub" numberOfLines={1}>
                      {item.artist || "未知艺术家"}
                    </Text>
                  </View>
                  <View className="right">
                    {currentTrack?.id === item.id && isPlaying ? <Text className="playing">播放中</Text> : null}
                    <Text className="duration">{formatDuration(item.duration || 0)}</Text>
                  </View>
                </View>
              ))
            )}
        </View>
        <View style={{ height: "180rpx" }} />
      </ScrollView>

      <BottomTabBar />
      <MiniPlayer />
    </View>
  );
}
