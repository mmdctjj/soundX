import {
  CaretRightOutlined,
  CloudDownloadOutlined,
  HeartFilled,
  HeartOutlined,
  MoreOutlined,
  PauseOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  ShareAltOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
} from "@ant-design/icons";
import { useRequest } from "ahooks";
import {
  Avatar,
  Col,
  Dropdown,
  Flex,
  Input,
  List,
  type MenuProps,
  message,
  Modal,
  Row,
  Table,
  theme,
  Typography,
} from "antd";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getBaseURL } from "../../https";
import { type Album, type Track } from "../../models";
import { getAlbumById, getAlbumTracks } from "../../services/album";
import {
  addTrackToPlaylist,
  getPlaylists,
  type Playlist,
} from "../../services/playlist";
import { toggleAlbumLike, unlikeAlbum } from "../../services/user";
import { usePlayerStore } from "../../store/player";
import { formatDuration } from "../../utils/formatDuration";
import { usePlayMode } from "../../utils/playMode";
import styles from "./index.module.less";

const { Title, Text } = Typography;

const Detail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [keyword, setKeyword] = useState("");
  const [keywordMidValue, setKeywordMidValue] = useState("");
  const [isLiked, setIsLiked] = useState(false);

  // Playlist Modal State
  const [isAddToPlaylistModalOpen, setIsAddToPlaylistModalOpen] =
    useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  const { token } = theme.useToken();

  const { play, setPlaylist, currentTrack, isPlaying, toggleLike } =
    usePlayerStore();

  const { mode } = usePlayMode();

  const pageSize = 20;

  const { run: likeAlbum } = useRequest(toggleAlbumLike, {
    manual: true,
    onSuccess: (res) => {
      if (res.code === 200) {
        setIsLiked(true);
        message.success("收藏成功");
      }
    },
  });

  const { run: unlikeAlbumRequest } = useRequest(unlikeAlbum, {
    manual: true,
    onSuccess: (res) => {
      if (res.code === 200) {
        setIsLiked(false);
        message.success("已取消收藏");
      }
    },
  });

  useEffect(() => {
    if (id) {
      fetchAlbumDetails(Number(id));
      // Reset list when id changes
      setTracks([]);
      setPage(0);
      setHasMore(true);
      fetchTracks(Number(id), 0, sort, keyword);
    }
  }, [id, sort, keyword]);

  const fetchAlbumDetails = async (albumId: number) => {
    try {
      const res = await getAlbumById(albumId);
      if (res.code === 200) {
        setAlbum(res.data);
        // Check if liked by current user (userId: 1)
        // @ts-ignore - likedByUsers is included in response but might not be in type definition yet
        const likedByUsers = res.data.likedByUsers || [];
        const isLikedByCurrentUser = likedByUsers.some(
          (like: any) => like.userId === 1
        );
        setIsLiked(isLikedByCurrentUser);
      }
    } catch (error) {
      console.error("Failed to fetch album details:", error);
    }
  };

  const fetchTracks = async (
    albumId: number,
    currentPage: number,
    currentSort: "asc" | "desc",
    currentKeyword: string
  ) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await getAlbumTracks(
        albumId,
        pageSize,
        currentPage * pageSize,
        currentSort,
        currentKeyword
      );
      if (res.code === 200) {
        const newTracks = res.data.list;
        if (currentPage === 0) {
          setTracks(newTracks);
        } else {
          setTracks((prev) => [...prev, ...newTracks]);
        }
        setHasMore(newTracks.length === pageSize);
        setPage(currentPage + 1);
      }
    } catch (error) {
      console.error("Failed to fetch tracks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (
      scrollHeight - scrollTop === clientHeight &&
      hasMore &&
      !loading &&
      id
    ) {
      fetchTracks(Number(id), page, sort, keyword);
    }
  };

  const handlePlayAll = () => {
    if (tracks.length > 0 && album) {
      setPlaylist(tracks);
      play(tracks[0], album.id);
    }
  };

  const handlePlayTrack = (track: Track) => {
    // If track is not in current playlist (or playlist is empty), set it
    // For simplicity, we can just set the current visible tracks as playlist
    if (album) {
      setPlaylist(tracks);
      play(track, album.id);
    }
  };

  const handleToggleLike = async (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    await toggleLike(track.id);
  };

  const openAddToPlaylistModal = async (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    setSelectedTrack(track);
    setIsAddToPlaylistModalOpen(true);
    try {
      const res = await getPlaylists(mode);
      if (res.code === 200) {
        setPlaylists(res.data);
      }
    } catch (error) {
      message.error("获取播放列表失败");
    }
  };

  const handleAddToPlaylist = async (playlistId: number) => {
    if (!selectedTrack) return;
    try {
      const res = await addTrackToPlaylist(playlistId, selectedTrack.id);
      if (res.code === 200) {
        message.success("添加成功");
        setIsAddToPlaylistModalOpen(false);
      } else {
        message.error("添加失败");
      }
    } catch (error) {
      message.error("添加失败");
    }
  };

  const columns = [
    {
      title: "#",
      key: "index",
      width: 100,
      render: (_: number, record: Track) => {
        return <Text>{record?.index?.toString()}</Text>;
      },
    },
    {
      title: " ",
      key: "play",
      width: 100,
      render: (_: any, record: Track) => {
        const isCurrent = currentTrack?.id === record.id;
        return (
          <div
            onClick={(e) => {
              e.stopPropagation();
              handlePlayTrack(record);
            }}
            style={{ cursor: "pointer" }}
          >
            <Text strong={currentTrack?.id === record.id}>
              {isCurrent && isPlaying ? (
                <PauseOutlined />
              ) : (
                <PlayCircleOutlined />
              )}
            </Text>
          </div>
        );
      },
    },
    {
      title: "标题",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      render: (text: string, record: Track) => (
        <Text strong={currentTrack?.id === record.id}>{text}</Text>
      ),
    },
    {
      title: "时长",
      dataIndex: "duration",
      key: "duration",
      width: 100,
      render: (duration: number) => (
        <Text type="secondary">{formatDuration(duration)}</Text>
      ),
    },
    {
      title: <MoreOutlined />,
      key: "actions",
      width: 100,
      render: (_: any, record: Track) => {
        const items: MenuProps["items"] = [
          {
            key: "play",
            label: "播放",
            icon: <PlayCircleOutlined />,
            onClick: (info) => {
              info.domEvent.stopPropagation();
              handlePlayTrack(record);
            },
          },
          {
            key: "like",
            label: (record as any).likedByUsers?.some(
              (like: any) => like.userId === 1
            )
              ? "取消收藏"
              : "收藏",
            icon: (record as any).likedByUsers?.some(
              (like: any) => like.userId === 1
            ) ? (
              <HeartFilled style={{ color: "#ff4d4f" }} />
            ) : (
              <HeartOutlined />
            ),
            onClick: (info) => {
              info.domEvent.stopPropagation();
              handleToggleLike(info.domEvent as any, record);
            },
          },
          {
            key: "add",
            label: "添加到播放列表",
            icon: <PlusOutlined />,
            onClick: (info) => {
              info.domEvent.stopPropagation();
              openAddToPlaylistModal(info.domEvent as any, record);
            },
          },
        ];

        return (
          <Dropdown menu={{ items }} trigger={["click"]}>
            <MoreOutlined
              style={{ cursor: "pointer", fontSize: "20px" }}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div
      className={styles.detailContainer}
      onScroll={handleScroll}
      style={{ overflowY: "auto", height: "100%" }}
    >
      {/* Header Banner */}
      <div
        className={styles.banner}
        style={{
          backgroundImage: `url(${album?.cover ? `${getBaseURL()}${album.cover}` : "https://picsum.photos/seed/podcast/1200/400"})`,
        }}
      >
        <div className={styles.bannerOverlay}></div>

        <Flex align="center" gap={16} className={styles.bannerContent}>
          <Avatar
            size={50}
            src={
              album?.cover
                ? `${getBaseURL()}${album.cover}`
                : "https://api.dicebear.com/7.x/avataaars/svg?seed=Ken"
            }
          />
          <Flex vertical gap={0}>
            <Title level={4} style={{ color: "#fff", margin: 0 }}>
              {album?.name || "Unknown Album"}
            </Title>
            <Text type="secondary" style={{ color: "#ccc" }}>
              {album?.artist || "Unknown Artist"}
            </Text>
          </Flex>
        </Flex>
      </div>

      <div className={styles.contentPadding} style={{ color: token.colorText }}>
        <Row gutter={40}>
          {/* Main Content */}
          <Col span={24}>
            {/* Controls */}
            <div className={styles.controlsRow}>
              <div className={styles.mainControls}>
                <div
                  className={styles.playButton}
                  style={{
                    backgroundColor: `rgba(255, 255, 255, 0.1)`,
                    border: `0.1px solid ${token.colorTextSecondary}`,
                  }}
                >
                  <CaretRightOutlined
                    onClick={handlePlayAll}
                    style={{
                      color: token.colorTextSecondary,
                      fontSize: "30px",
                    }}
                  />
                </div>
                <Typography.Text
                  type="secondary"
                  className={styles.actionGroup}
                >
                  {isLiked ? (
                    <HeartFilled
                      className={styles.actionIcon}
                      style={{ color: "#ff4d4f" }}
                      onClick={() => album && unlikeAlbumRequest(album.id)}
                    />
                  ) : (
                    <HeartOutlined
                      className={styles.actionIcon}
                      onClick={() => album && likeAlbum(album.id)}
                    />
                  )}
                  <ShareAltOutlined className={styles.actionIcon} />
                  <CloudDownloadOutlined className={styles.actionIcon} />
                </Typography.Text>
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "15px" }}
              >
                <Input
                  prefix={
                    <SearchOutlined
                      style={{ color: token.colorTextSecondary }}
                    />
                  }
                  className={styles.searchInput}
                  onChange={(e) => setKeywordMidValue(e.target.value)}
                  onPressEnter={() => setKeyword(keywordMidValue)}
                />
                {sort === "desc" ? (
                  <SortAscendingOutlined
                    className={styles.actionIcon}
                    style={{ fontSize: "18px" }}
                    onClick={() => setSort("asc")}
                  />
                ) : (
                  <SortDescendingOutlined
                    className={styles.actionIcon}
                    style={{ fontSize: "18px" }}
                    onClick={() => setSort("desc")}
                  />
                )}
              </div>
            </div>

            {/* Track List */}
            <Table
              dataSource={tracks}
              columns={columns}
              pagination={false}
              rowKey="id"
              loading={loading}
              onRow={(record) => ({
                onDoubleClick: () => handlePlayTrack(record),
                style: { cursor: "pointer" },
              })}
              rowClassName="episode-row"
            />
          </Col>
        </Row>
      </div>

      <Modal
        title="添加到播放列表"
        open={isAddToPlaylistModalOpen}
        onCancel={() => setIsAddToPlaylistModalOpen(false)}
        footer={null}
      >
        <List
          dataSource={playlists}
          renderItem={(item) => (
            <List.Item
              onClick={() => handleAddToPlaylist(item.id)}
              style={{ cursor: "pointer" }}
              className={styles.playlistItem}
            >
              <Text>{item.name}</Text>
              <Text type="secondary">{item._count?.tracks || 0} 首</Text>
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

export default Detail;
