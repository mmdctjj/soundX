import {
  DeliveredProcedureOutlined,
  DownOutlined,
  OrderedListOutlined,
  PauseCircleFilled,
  PlayCircleFilled,
  SoundOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { type Track } from "@soundx/db";
import {
  Drawer,
  Flex,
  List,
  Popover,
  Slider,
  Tooltip,
  Typography,
  theme,
} from "antd";
import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import { usePlayerStore } from "../../store/player";
import styles from "./index.module.less";

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
  } = usePlayerStore();

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
  const { mode } = useTheme();

  const drawerBgImage =
    mode === "dark"
      ? "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')"
      : "url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2564&auto=format&fit=crop')";

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

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
      ? `http://localhost:3000${path}`
      : "https://picsum.photos/seed/music/300/300";
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
            ? `http://localhost:3000/audio/${currentTrack.path.split("/").pop()}`
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
            {formatTime(currentTime)}
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
            {formatTime(duration)}
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
          body: {
            backgroundImage: drawerBgImage,
          },
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
          <div
            className={styles.fullPlayerBackground}
            style={{ backgroundImage: drawerBgImage }}
          />

          <img
            src={getCoverUrl(currentTrack?.cover)}
            alt="Current Cover"
            className={styles.fullPlayerCover}
          />
        </div>

        {/* Right Side - Info & Playlist (2/3) */}
        <div className={styles.fullPlayerRight}>
          {/* Top: Title */}
          <div style={{ marginBottom: "40px" }}>
            <Title level={1} style={{ margin: "0 0 10px 0" }}>
              {currentTrack?.name || "No Track"}
            </Title>
            <Text style={{ fontSize: "20px" }} type="secondary">
              {currentTrack?.artist || "Unknown Artist"}
            </Text>
          </div>

          {/* Bottom: Playlist */}
          <div style={{ flex: 1, overflowY: "auto", paddingRight: "10px" }}>
            <Title level={4} style={{ marginBottom: "20px" }}>
              ``` 播放列表 ({playlist.length})
            </Title>
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
                    description={<Text type="secondary">{item.artist}</Text>}
                  />
                </List.Item>
              )}
            />
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
    </div>
  );
};

export default Player;
