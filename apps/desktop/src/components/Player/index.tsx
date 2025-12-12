import {
  BackwardOutlined, // Added as per instruction
  DeliveredProcedureOutlined,
  DownOutlined,
  ForwardOutlined,
  OrderedListOutlined,
  PauseCircleFilled,
  PlayCircleFilled,
  SoundOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import {
  Drawer,
  Flex,
  InputNumber,
  List, // Keep List for the AddToPlaylistModal
  Modal,
  Popover,
  Slider,
  Tabs,
  theme,
  Tooltip,
  Typography,
} from "antd";
import React, { useEffect, useRef, useState } from "react";
import { useMessage } from "../../context/MessageContext";
import { useMediaSession } from "../../hooks/useMediaSession";
import { getBaseURL } from "../../https";
import { type Track, TrackType } from "../../models";
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
import { QueueList } from "./QueueList"; // Added as per instruction

const { Text, Title } = Typography;

const Player: React.FC = () => {
  const message = useMessage();
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
    syncActiveMode,
  } = usePlayerStore();
  const { mode: appMode } = usePlayMode();

  // Sync store active mode with app mode
  useEffect(() => {
    syncActiveMode(appMode);
  }, [appMode, syncActiveMode]);

  const audioRef = useRef<HTMLAudioElement>(null);
  const ignoreTimeUpdate = useRef(false);

  // Determine if we need to ignore initial time updates (restoring state)
  useEffect(() => {
    if (currentTrack) {
      const state = usePlayerStore.getState();
      if (state.currentTime > 0.5) {
        // Use slight threshold to be safe
        ignoreTimeUpdate.current = true;
      }
    }
  }, [currentTrack?.id]);

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
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(30);

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
      if (ignoreTimeUpdate.current) return;

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
      // Restore saved progress if meaningful
      if (currentTime > 0) {
        audioRef.current.currentTime = currentTime;
      } else if (skipStart > 0) {
        audioRef.current.currentTime = skipStart;
      }

      // Allow updates again after metadata loaded and potential seek performed
      ignoreTimeUpdate.current = false;
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

  // Integrate System Media Controls
  useMediaSession({
    currentTrack,
    isPlaying,
    play,
    pause,
    next,
    prev,
    seekTo: handleSeek,
  });

  // Send track info to main process for tray display
  useEffect(() => {
    if (window.ipcRenderer) {
      window.ipcRenderer.send("player:update", {
        track: currentTrack
          ? {
              name: currentTrack.name,
              artist: currentTrack.artist,
              album: currentTrack.album,
            }
          : null,
        isPlaying,
      });
    }
  }, [currentTrack, isPlaying]);

  // // Create refs for control functions to use in IPC handlers
  // const togglePlayRef = useRef<(() => void) | undefined>(undefined);
  // const nextRef = useRef<(() => void) | undefined>(undefined);
  // const prevRef = useRef<(() => void) | undefined>(undefined);

  // // Update refs when functions change
  // useEffect(() => {
  //   togglePlayRef.current = () => {
  //     const state = usePlayerStore.getState();
  //     if (state.isPlaying) {
  //       state.pause();
  //     } else {
  //       state.play();
  //     }
  //   };
  //   nextRef.current = () => usePlayerStore.getState().next();
  //   prevRef.current = () => usePlayerStore.getState().prev();
  // }, []);

  // Listen for playback control commands from main process
  useEffect(() => {
    if (!window.ipcRenderer) return;

    const handleToggle = () => {
      const state = usePlayerStore.getState();
      if (state.isPlaying) {
        state.pause();
      } else {
        state.play();
      }
    };
    const handleNext = () => usePlayerStore.getState().next();
    const handlePrev = () => usePlayerStore.getState().prev();

    window.ipcRenderer.on("player:toggle", handleToggle);
    window.ipcRenderer.on("player:next", handleNext);
    window.ipcRenderer.on("player:prev", handlePrev);

    return () => {
      window.ipcRenderer.off("player:toggle", handleToggle);
      window.ipcRenderer.off("player:next", handleNext);
      window.ipcRenderer.off("player:prev", handlePrev);
    };
  }, []); // 空依赖数组，只在组件挂载时注册一次

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

  // Skip forward 15 seconds
  const skipForward = () => {
    if (audioRef.current) {
      const newTime = Math.min(audioRef.current.currentTime + 15, duration);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Skip backward 15 seconds
  const skipBackward = () => {
    if (audioRef.current) {
      const newTime = Math.max(audioRef.current.currentTime - 15, 0);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Set sleep timer
  const setSleepTimer = () => {
    if (timerMinutes > 0) {
      setTimeout(
        () => {
          pause();
          message.success("定时关闭已触发");
        },
        timerMinutes * 60 * 1000
      );
      message.success(`已设置 ${timerMinutes} 分钟后自动暂停`);
      setIsTimerModalOpen(false);
    }
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

  const renderPlayOrderButton = (className: string) => (
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
                playMode === "loop" ? token.colorFillTertiary : "transparent",
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
                playMode === "single" ? token.colorFillTertiary : "transparent",
            }}
          >
            单曲播放
          </div>
        </div>
      }
      getPopupContainer={(triggerNode) => triggerNode.parentElement!}
      trigger="click"
      placement="top"
    >
      <Tooltip title="播放顺序">
        <SwapOutlined className={className} />
      </Tooltip>
    </Popover>
  );

  const renderPlaylistButton = (className: string) => (
    <Tooltip title="播放列表">
      <OrderedListOutlined
        onClick={() => setIsPlaylistOpen(true)}
        className={className}
      />
    </Tooltip>
  );

  return (
    <div
      className={styles.player}
      style={{ color: token.colorText, borderRightColor: token.colorBorder }}
    >
      <audio
        ref={audioRef}
        src={
          currentTrack?.path ? `${getBaseURL()}${currentTrack.path}` : undefined
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
        {renderPlayOrderButton(styles.settingIcon)}

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
        {renderPlaylistButton(styles.settingIcon)}
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
              {/* {appMode === TrackType.MUSIC &&
                renderPlayOrderButton(styles.controlIcon)} */}

              {/* Skip Backward 15s */}
              <Tooltip title="后退 15 秒">
                <BackwardOutlined
                  className={styles.controlIcon}
                  onClick={skipBackward}
                />
              </Tooltip>

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

              {/* Skip Forward 15s */}
              <Tooltip title="前进 15 秒">
                <ForwardOutlined
                  className={styles.controlIcon}
                  onClick={skipForward}
                />
              </Tooltip>

              {/* {appMode === TrackType.MUSIC &&
                renderPlaylistButton(styles.controlIcon)} */}
            </Flex>
          </Flex>
        </div>

        {/* Right Side - Info & Playlist/Lyrics (2/3) */}
        <div
          className={styles.fullPlayerRight}
          style={{ textAlign: appMode !== TrackType.MUSIC ? "left" : "center" }}
        >
          {/* Top: Title */}
          <div style={{ marginBottom: "24px" }}>
            <Title level={3} style={{ margin: "0 0 10px 0" }}>
              {currentTrack?.name || "No Track"}
            </Title>
            <Text type="secondary">
              {currentTrack?.artist || "Unknown Artist"}
            </Text>
          </div>

          {/* Tab Switcher - Only for non-MUSIC mode */}
          {appMode !== TrackType.MUSIC && (
            <div className={styles.tabHeader}>
              <Tabs
                activeKey={activeTab}
                onChange={(e) => setActiveTab(e as "playlist" | "lyrics")}
                items={[
                  { key: "lyrics", label: "歌词" },
                  { key: "playlist", label: `播放列表 (${playlist.length})` },
                ].filter((item) => item.key !== "lyrics")}
              />
            </div>
          )}

          {/* Content */}
          <div
            style={{
              flex: 1,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {appMode === TrackType.MUSIC ? (
              <Lyrics
                lyrics={currentTrack?.lyrics || null}
                currentTime={currentTime}
              />
            ) : activeTab === "playlist" ? (
              <div style={{ flex: 1, overflowY: "auto", paddingRight: "10px" }}>
                <QueueList
                  tracks={playlist}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  onPlay={play}
                  onAddToPlaylist={openAddToPlaylistModal}
                  onToggleLike={(_, track, type) => toggleLike(track.id, type)}
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
        <QueueList
          tracks={playlist}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onPlay={play}
          onAddToPlaylist={openAddToPlaylistModal}
          onToggleLike={(_, track, type) => toggleLike(track.id, type)}
        />
      </Drawer>

      {/* Timer Modal */}
      <Modal
        title="定时关闭"
        open={isTimerModalOpen}
        onCancel={() => setIsTimerModalOpen(false)}
        onOk={setSleepTimer}
        okText="确定"
        cancelText="取消"
      >
        <Flex vertical gap={16} style={{ padding: "20px 0" }}>
          <Text>设置多少分钟后自动暂停播放：</Text>
          <InputNumber
            min={1}
            max={180}
            value={timerMinutes}
            onChange={(value: number | null) => setTimerMinutes(value || 30)}
            addonAfter="分钟"
            style={{ width: "100%" }}
          />
        </Flex>
      </Modal>

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
