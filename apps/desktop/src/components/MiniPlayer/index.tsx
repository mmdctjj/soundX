import {
  CaretRightFilled,
  HeartFilled,
  HeartOutlined,
  PauseOutlined,
  PushpinFilled,
  PushpinOutlined,
  SelectOutlined,
  StepBackwardFilled,
  StepForwardFilled,
  UnorderedListOutlined
} from "@ant-design/icons";
import { Button, Slider, Tooltip, Typography, theme } from "antd";
import React, { useEffect, useState } from "react";
import { getBaseURL } from "../../https";
import type { Track } from "../../models";
import styles from "./index.module.less";

const { Text } = Typography;

interface MiniPlayerProps {
  onRestore?: () => void;
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({ onRestore }) => {
  const { token } = theme.useToken();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(240);
  const [currentLyric, setCurrentLyric] = useState<string>("");

  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(true);

  useEffect(() => {
    if (!(window as any).ipcRenderer) return;

    const fetchState = async () => {
      const state = await (window as any).ipcRenderer.invoke(
        "player:get-state"
      );
      if (state) {
        setIsPlaying(state.isPlaying);
        setCurrentTrack(state.track);
        // If track has duration, use it
      }
    };

    fetchState();

    const handleUpdate = (_event: any, payload: any) => {
      if (payload.isPlaying !== undefined) setIsPlaying(payload.isPlaying);
      if (payload.track !== undefined) {
         setCurrentTrack(payload.track);
         setCurrentLyric("");
      }
      if (payload.currentTime !== undefined) setCurrentTime(payload.currentTime);
      if (payload.duration !== undefined) setDuration(payload.duration);
    };

    const handleLyricUpdate = (_event: any, payload: any) => {
       if (payload.currentLyric) setCurrentLyric(payload.currentLyric);
    };

    (window as any).ipcRenderer.on("player:update", handleUpdate);
    (window as any).ipcRenderer.on("lyric:update", handleLyricUpdate);

    return () => {
      (window as any).ipcRenderer.off("player:update", handleUpdate);
      (window as any).ipcRenderer.off("lyric:update", handleLyricUpdate);
    };
  }, []);

  const toggleAlwaysOnTop = () => {
    const newState = !isAlwaysOnTop;
    setIsAlwaysOnTop(newState);
    if ((window as any).ipcRenderer) {
      (window as any).ipcRenderer.send("window:set-always-on-top", newState);
    }
  };

  const play = () => (window as any).ipcRenderer?.send("player:toggle");
  const pause = () => (window as any).ipcRenderer?.send("player:toggle");
  const next = () => (window as any).ipcRenderer?.send("player:next");
  const prev = () => (window as any).ipcRenderer?.send("player:prev");

  const handleRestore = () => {
    if ((window as any).ipcRenderer) {
      (window as any).ipcRenderer.send("window:restore-main");
    }
    if (onRestore) onRestore();
  };

  const getCoverUrl = (path?: string | null) => {
    return path ? `${getBaseURL()}${path}` : "https://picsum.photos/200/200";
  };

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={styles.container}
      style={{ backgroundColor: token.colorBgContainer }}
    >
      {/* Top Bar: Window Actions */}
      <div className={styles.topBar}>
        <div></div>
        <div className={styles.windowActionsRight}>
          <Tooltip title="回到主窗口">
            <Button
              type="text"
              size="small"
              icon={<SelectOutlined />}
              onClick={handleRestore}
              className={styles.iconBtn}
            />
          </Tooltip>
          <Tooltip title={isAlwaysOnTop ? "取消置顶" : "置顶"}>
            <Button
              type="text"
              size="small"
              icon={isAlwaysOnTop ? <PushpinFilled /> : <PushpinOutlined />}
              onClick={toggleAlwaysOnTop}
              className={`${styles.iconBtn} ${isAlwaysOnTop ? styles.active : ""}`}
            />
          </Tooltip>
        </div>
      </div>

      {/* Info Section */}
      <div className={styles.infoSection}>
        <img src={getCoverUrl(currentTrack?.cover)} className={styles.cover} />
        <div className={styles.infoText}>
          <div className={styles.titleRow}>
            <Text ellipsis className={styles.title}>
              {currentTrack?.name || "SoundX"}
            </Text>
          </div>
          <Text ellipsis type="secondary" className={styles.artist} style={{ color: currentLyric ? token.colorPrimary : undefined }}>
            {currentLyric || currentTrack?.artist || "AudioDock"}
          </Text>
        </div>
      </div>

      {/* Progress */}
      <div className={styles.progressSection}>
        <Text type="secondary">{formatTime(currentTime)}</Text>
        <Slider
          min={0}
          max={duration}
          value={currentTime}
          tooltip={{ formatter: null }}
          className={styles.slider}
          styles={{
            track: { background: token.colorPrimary },
            handle: { display: "none" },
          }} // Hide handle for cleaner look like image? Or small handle
        />
        <Text type="secondary">{formatTime(duration)}</Text>
      </div>

      {/* Controls */}
      <div className={styles.controlsSection}>
        <div className={styles.controlSide}>
          {/* Left side icons if any, e.g. like, or empty */}
          <Button
            type="text"
            size="small"
            icon={
              currentTrack?.likedByUsers?.includes(
                Number(localStorage.getItem("userId"))
              ) ? (
                <HeartFilled />
              ) : (
                <HeartOutlined />
              )
            }
            className={styles.secondaryBtn}
          />
        </div>
        <div className={styles.controlCenter}>
          <Button
            type="text"
            icon={<StepBackwardFilled />}
            onClick={prev}
            className={styles.prevNextBtn}
          />

          {/* Main Play Button */}
          <div
            className={styles.playButtonWrapper}
            style={{ background: token.colorPrimary }}
            onClick={isPlaying ? pause : play}
          >
            {isPlaying ? (
              <PauseOutlined style={{ color: "#fff" }} />
            ) : (
              <CaretRightFilled style={{ color: "#fff" }} />
            )}
          </div>

          <Button
            type="text"
            icon={<StepForwardFilled />}
            onClick={next}
            className={styles.prevNextBtn}
          />
        </div>
        <div className={styles.controlSide}>
          <Button
            type="text"
            size="small"
            icon={<UnorderedListOutlined />}
            className={styles.secondaryBtn}
          />
        </div>
      </div>
    </div>
  );
};

export default MiniPlayer;
