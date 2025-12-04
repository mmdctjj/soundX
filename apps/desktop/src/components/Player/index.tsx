import {
  DeliveredProcedureOutlined,
  DownOutlined,
  HeartFilled,
  HeartOutlined,
  MoreOutlined,
  OrderedListOutlined,
  PauseCircleFilled,
  PlayCircleFilled,
  PlayCircleOutlined,
  PlusOutlined,
  SoundOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import {
  Drawer,
  Dropdown,
  Flex,
  List,
  message,
  Modal,
  Popover,
  Slider,
  Tabs,
  theme,
  Tooltip,
  Typography,
} from "antd";
import React, { useEffect, useRef, useState } from "react";
import { getBaseURL } from "../../https";
import { type Track } from "../../models";
import {
  addTrackToPlaylist,
  getPlaylists,
  type Playlist,
} from "../../services/playlist";
import { usePlayerStore } from "../../store/player";
import { formatDuration } from "../../utils/formatDuration";
import { usePlayMode } from "../../utils/playMode";
import styles from "./index.module.less";
import Lyrics from "./Lyrics";

const { Text, Title } = Typography;

const Player: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    playlist,
    playMode,
    volume,
    currentTime,
    duration,
    play,
    pause,
    next,
    prev,
    setMode,
    setVolume,
    setCurrentTime,
    setDuration,
    toggleLike,
  } = usePlayerStore();
  const { mode: appMode } = usePlayMode();

  const audioRef = useRef<HTMLAudioElement>(null);

  // Local state for UI interactions
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [isFullPlayerVisible, setIsFullPlayerVisible] = useState(false);
  const [skipStart, setSkipStart] = useState(() => {
    const saved = localStorage.getItem("skipStart");
    return saved ? Number(saved) : 0;
  });
  const [skipEnd, setSkipEnd] = useState(() => {
    const saved = localStorage.getItem("skipEnd");
    return saved ? Number(saved) : 0;
  });
  const [activeTab, setActiveTab] = useState<"playlist" | "lyrics">("playlist");

  // Playlist Modal State
  const [isAddToPlaylistModalOpen, setIsAddToPlaylistModalOpen] =
    useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  // Sync volume with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Handle play/pause
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch((e) => {
          console.error("Playback failed", e);
          pause();
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrack]);

  // Save settings
  useEffect(() => {
    localStorage.setItem("playerVolume", String(volume));
  }, [volume]);

  useEffect(() => {
    localStorage.setItem("playOrder", playMode);
  }, [playMode]);

  useEffect(() => {
    localStorage.setItem("skipStart", String(skipStart));
  }, [skipStart]);

  useEffect(() => {
    localStorage.setItem("skipEnd", String(skipEnd));
  }, [skipEnd]);

  const { token } = theme.useToken();

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);

      // Handle skip end
      if (skipEnd > 0 && duration > 0 && time >= duration - skipEnd) {
        next();
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      // Handle skip start
      if (skipStart > 0) {
        audioRef.current.currentTime = skipStart;
      }
    }
  };

  const handleEnded = () => {
    next();
  };

  const handleSeek = (val: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const getCoverUrl = (path?: string | null) => {
    return path
      ? `${getBaseURL()}${path}`
      : "https://picsum.photos/seed/music/300/300";
  };

  const openAddToPlaylistModal = async (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    setSelectedTrack(track);
    setIsAddToPlaylistModalOpen(true);
    try {
      const { mode } = usePlayMode();
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

  return (
    <div
      className={styles.player}
      style={{ color: token.colorText, borderRightColor: token.colorBorder }}
    >
      <audio
        ref={audioRef}
        src={
          currentTrack?.path
            ? `${getBaseURL()}/audio/${currentTrack.path}`
            : undefined
        }
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* Song Info */}
      <div
        className={styles.songInfo}
        onClick={() => setIsFullPlayerVisible(true)}
      >
        <div className={styles.coverWrapper}>
          <img
            src={getCoverUrl(currentTrack?.cover)}
            alt="cover"
            className={styles.coverImage}
          />
        </div>
        <div className={styles.songDetails}>
          <Text strong ellipsis style={{ maxWidth: 250 }}>
            {currentTrack?.name || "No Track"}
          </Text>
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {currentTrack?.artist || "Unknown Artist"}
          </Text>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.controlButtons}>
          <StepBackwardOutlined className={styles.controlIcon} onClick={prev} />
          <div onClick={togglePlay} style={{ cursor: "pointer" }}>
            {isPlaying ? (
              <PauseCircleFilled
                className={styles.playIcon}
                style={{ color: token.colorPrimary }}
              />
            ) : (
              <PlayCircleFilled
                className={styles.playIcon}
                style={{ color: token.colorPrimary }}
              />
            )}
          </div>
          <StepForwardOutlined className={styles.controlIcon} onClick={next} />
        </div>
        <div className={styles.progressWrapper}>
          <Text type="secondary" style={{ fontSize: "10px" }}>
            {formatDuration(currentTime)}
          </Text>
          <Slider
            value={currentTime}
            max={duration || 100}
            onChange={handleSeek}
            tooltip={{ open: false }}
            style={{ flex: 1, margin: 0 }}
            trackStyle={{ backgroundColor: token.colorText }}
            railStyle={{ backgroundColor: token.colorBorder }}
            handleStyle={{ display: "none" }}
          />
          <Text type="secondary" style={{ fontSize: "10px" }}>
            {formatDuration(duration)}
          </Text>
        </div>
      </div>

      {/* Volume & Settings */}
      <div className={styles.settings}>
        {/* Play Order */}
        <Popover
          content={
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                padding: "0px",
              }}
            >
              <div
                onClick={() => setMode("sequence")}
                style={{
                  cursor: "pointer",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  backgroundColor:
                    playMode === "sequence"
                      ? token.colorFillTertiary
                      : "transparent",
                }}
              >
                顺序播放
              </div>
              <div
                onClick={() => setMode("shuffle")}
                style={{
                  cursor: "pointer",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  backgroundColor:
                    playMode === "shuffle"
                      ? token.colorFillTertiary
                      : "transparent",
                }}
              >
                随机播放
              </div>
              <div
                onClick={() => setMode("loop")}
                style={{
                  cursor: "pointer",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  backgroundColor:
                    playMode === "loop"
                      ? token.colorFillTertiary
                      : "transparent",
                }}
              >
                单曲循环
              </div>
              <div
                onClick={() => setMode("single")}
                style={{
                  cursor: "pointer",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  backgroundColor:
                    playMode === "single"
                      ? token.colorFillTertiary
                      : "transparent",
                }}
              >
                单曲播放
              </div>
            </div>
          }
          trigger="click"
          placement="top"
        >
          <Tooltip title="播放顺序">
            <SwapOutlined className={styles.settingIcon} />
          </Tooltip>
        </Popover>

        {/* Volume */}
        <Popover
          content={
            <Flex vertical justify="center">
              <Text style={{ fontSize: "12px" }}>音量: {volume}%</Text>
              <Slider
                style={{ width: "100px" }}
                value={volume}
                max={100}
                onChange={setVolume}
              />
            </Flex>
          }
          trigger="click"
          placement="top"
        >
          <Tooltip title="音量">
            <SoundOutlined className={styles.settingIcon} />
          </Tooltip>
        </Popover>

        {/* Skip Intro */}
        <Popover
          content={
            <div style={{ width: "250px", padding: "10px" }}>
              <div style={{ marginBottom: "15px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "5px",
                  }}
                >
                  <span>跳过片头</span>
                </div>
                <Slider
                  value={skipStart}
                  onChange={setSkipStart}
                  max={90}
                  tooltip={{ formatter: (value) => `${value}s` }}
                />
              </div>
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "5px",
                  }}
                >
                  <span>跳过片尾</span>
                </div>
                <Slider
                  value={skipEnd}
                  onChange={setSkipEnd}
                  max={90}
                  tooltip={{ formatter: (value) => `${value}s` }}
                />
              </div>
            </div>
          }
          trigger="click"
          placement="top"
        >
          <Tooltip title="跳过片头/片尾">
            <DeliveredProcedureOutlined className={styles.settingIcon} />
          </Tooltip>
        </Popover>

        {/* Playlist */}
        <Tooltip title="播放列表">
          <OrderedListOutlined
            onClick={() => setIsPlaylistOpen(true)}
            className={styles.settingIcon}
          />
        </Tooltip>
      </div>

      {/* Full Screen Player */}
      <Drawer
        placement="bottom"
        height="100%"
        open={isFullPlayerVisible}
        onClose={() => setIsFullPlayerVisible(false)}
        classNames={{ body: styles.fullPlayerBody }}
        styles={{
          header: { display: "none" },
        }}
        closeIcon={null}
      >
        {/* Close Button */}
        <div className={styles.fullPlayerClose}>
          <DownOutlined
            onClick={() => setIsFullPlayerVisible(false)}
            className={styles.fullPlayerCloseIcon}
          />
        </div>

        {/* Left Side - Cover (1/3) */}
        <div className={styles.fullPlayerLeft}>
          {/* Background Blur Effect */}
          {/* <div
            className={styles.fullPlayerBackground}
            style={{ backgroundImage: drawerBgImage }}
          /> */}

          <Flex vertical align="center" gap={20}>
            <img
              src={getCoverUrl(currentTrack?.cover)}
              alt="Current Cover"
              className={styles.fullPlayerCover}
            />

            <Flex
              justify="space-between"
              align="center"
              style={{ width: "250px" }}
            >
              <Text type="secondary" style={{ fontSize: "10px" }}>
                {formatDuration(currentTime)}
              </Text>
              <Slider
                value={currentTime}
                max={duration || 100}
                style={{ width: "150px" }}
                onChange={handleSeek}
                tooltip={{ open: false }}
                handleStyle={{ display: "none" }}
              />
              <Text type="secondary" style={{ fontSize: "10px" }}>
                {formatDuration(duration)}
              </Text>
            </Flex>

            <Flex justify="center" style={{ fontSize: 50 }} gap={30}>
              <StepBackwardOutlined
                className={styles.controlIcon}
                onClick={prev}
              />
              <div onClick={togglePlay} style={{ cursor: "pointer" }}>
                {isPlaying ? (
                  <PauseCircleFilled className={styles.playIcon} />
                ) : (
                  <PlayCircleFilled className={styles.playIcon} />
                )}
              </div>
              <StepForwardOutlined
                className={styles.controlIcon}
                onClick={next}
              />
            </Flex>
          </Flex>
        </div>

        {/* Right Side - Info & Playlist/Lyrics (2/3) */}
        <div className={styles.fullPlayerRight}>
          {/* Top: Title */}
          <div style={{ marginBottom: "24px" }}>
            <Title level={3} style={{ margin: "0 0 10px 0" }}>
              {currentTrack?.name || "No Track"}
            </Title>
            <Text type="secondary">
              {currentTrack?.artist || "Unknown Artist"}
            </Text>
          </div>

          {/* Tab Switcher */}
          <div className={styles.tabHeader}>
            <Tabs
              activeKey={activeTab}
              onChange={(e) => setActiveTab(e as "playlist" | "lyrics")}
              items={[
                { key: "lyrics", label: "歌词" },
                { key: "playlist", label: `播放列表 (${playlist.length})` },
              ].filter((item) =>
                appMode === "MUSIC" ? true : item.key !== "lyrics"
              )}
            />
          </div>

          {/* Content */}
          <div
            style={{
              flex: 1,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {activeTab === "playlist" ? (
              <div style={{ flex: 1, overflowY: "auto", paddingRight: "10px" }}>
                <List
                  itemLayout="horizontal"
                  dataSource={playlist}
                  renderItem={(item: Track) => (
                    <List.Item
                      className={styles.playlistItem}
                      onClick={() => play(item)}
                      style={{
                        cursor: "pointer",
                        backgroundColor:
                          currentTrack?.id === item.id
                            ? "rgba(255,255,255,0.1)"
                            : "transparent",
                      }}
                      actions={[
                        <Dropdown
                          key="more"
                          trigger={["click"]}
                          menu={{
                            items: [
                              {
                                key: "play",
                                label: "播放",
                                icon: <PlayCircleOutlined />,
                                onClick: () => {
                                  play(item);
                                },
                              },
                              {
                                key: "like",
                                label: (item as any).likedByUsers?.some(
                                  (like: any) => like.userId === 1
                                )
                                  ? "取消收藏"
                                  : "收藏",
                                icon: (item as any).likedByUsers?.some(
                                  (like: any) => like.userId === 1
                                ) ? (
                                  <HeartFilled style={{ color: "#ff4d4f" }} />
                                ) : (
                                  <HeartOutlined />
                                ),
                                onClick: () => {
                                  toggleLike(item.id);
                                },
                              },
                              {
                                key: "add",
                                label: "添加到播放列表",
                                icon: <PlusOutlined />,
                                onClick: (info) => {
                                  info.domEvent.stopPropagation();
                                  openAddToPlaylistModal(
                                    info.domEvent as any,
                                    item
                                  );
                                },
                              },
                            ],
                          }}
                        >
                          <MoreOutlined
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              color: token.colorTextSecondary,
                              cursor: "pointer",
                            }}
                          />
                        </Dropdown>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <img
                            src={getCoverUrl(item.cover)}
                            alt={item.name}
                            style={{
                              width: "50px",
                              height: "50px",
                              objectFit: "cover",
                              borderRadius: "8px",
                            }}
                          />
                        }
                        title={
                          <Text
                            style={{
                              fontSize: "16px",
                              color:
                                currentTrack?.id === item.id
                                  ? token.colorPrimary
                                  : undefined,
                            }}
                          >
                            {item.name}
                          </Text>
                        }
                        description={
                          <Text type="secondary">{item.artist}</Text>
                        }
                      />
                    </List.Item>
                  )}
                />
              </div>
            ) : (
              <Lyrics
                lyrics={currentTrack?.lyrics || null}
                currentTime={currentTime}
              />
            )}
          </div>
        </div>
      </Drawer>

      <Drawer
        title={`播放列表 (${playlist.length})`}
        placement="right"
        open={isPlaylistOpen}
        onClose={() => setIsPlaylistOpen(false)}
      >
        <List
          style={{ width: "100%" }}
          itemLayout="horizontal"
          dataSource={playlist}
          renderItem={(item: Track) => (
            <List.Item
              onClick={() => play(item)}
              style={{
                cursor: "pointer",
                backgroundColor:
                  currentTrack?.id === item.id
                    ? token.colorFillTertiary
                    : "transparent",
              }}
              actions={[
                <Dropdown
                  key="more"
                  trigger={["click"]}
                  menu={{
                    items: [
                      {
                        key: "play",
                        label: "播放",
                        icon: <PlayCircleOutlined />,
                        onClick: () => {
                          play(item);
                        },
                      },
                      {
                        key: "like",
                        label: (item as any).likedByUsers?.some(
                          (like: any) => like.userId === 1
                        )
                          ? "取消收藏"
                          : "收藏",
                        icon: (item as any).likedByUsers?.some(
                          (like: any) => like.userId === 1
                        ) ? (
                          <HeartFilled style={{ color: "#ff4d4f" }} />
                        ) : (
                          <HeartOutlined />
                        ),
                        onClick: () => {
                          toggleLike(item.id);
                        },
                      },
                      {
                        key: "add",
                        label: "添加到播放列表",
                        icon: <PlusOutlined />,
                        onClick: (info) => {
                          info.domEvent.stopPropagation();
                          openAddToPlaylistModal(info.domEvent as any, item);
                        },
                      },
                    ],
                  }}
                >
                  <MoreOutlined
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      color: token.colorTextSecondary,
                      cursor: "pointer",
                    }}
                  />
                </Dropdown>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <img
                    src={getCoverUrl(item.cover)}
                    alt={item.name}
                    style={{
                      width: "25px",
                      height: "25px",
                      objectFit: "cover",
                    }}
                  />
                }
                title={
                  <Text
                    style={{
                      color:
                        currentTrack?.id === item.id
                          ? token.colorPrimary
                          : undefined,
                    }}
                  >
                    {item.name}
                  </Text>
                }
                description={item.artist}
              />
            </List.Item>
          )}
        />
      </Drawer>

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

export default Player;
