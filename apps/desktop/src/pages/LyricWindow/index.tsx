import {
  PauseCircleFilled,
  PlayCircleFilled,
  StepBackwardOutlined,
  StepForwardOutlined
} from "@ant-design/icons";
import { Button, Space } from "antd";
import React, { useEffect, useState } from "react";
import { useSettingsStore } from "../../store/settings";
import styles from "./index.module.less";

const LyricWindow: React.FC = () => {
  const [currentLyric, setCurrentLyric] = useState("等待播放...");
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackInfo, setTrackInfo] = useState({ name: "", artist: "" });
  
  const { fontSize, fontColor, lockPosition, shadow } = useSettingsStore(
    (state) => state.desktopLyric
  );

  useEffect(() => {
    if (!window.ipcRenderer) return;

    const handleLyricUpdate = (_event: any, payload: { currentLyric: string }) => {
      setCurrentLyric(payload.currentLyric || "SoundX 听见你的声音");
    };

    const handlePlayerUpdate = (
      _event: any,
      payload: { isPlaying: boolean; track: { name: string; artist: string } }
    ) => {
      setIsPlaying(payload.isPlaying);
      if (payload.track) {
        setTrackInfo(payload.track);
      }
    };

    window.ipcRenderer.on("lyric:update", handleLyricUpdate);
    window.ipcRenderer.on("player:update", handlePlayerUpdate);

    return () => {
      window.ipcRenderer.off("lyric:update", handleLyricUpdate);
      window.ipcRenderer.off("player:update", handlePlayerUpdate);
    };
  }, []);

  const togglePlay = () => window.ipcRenderer?.send("player:toggle");
  const next = () => window.ipcRenderer?.send("player:next");
  const prev = () => window.ipcRenderer?.send("player:prev");
  // const toggleLock = () => {
  //   const newLock = !lockPosition;
  //   useSettingsStore.getState().updateDesktopLyric("lockPosition", newLock);
  //   window.ipcRenderer?.send("lyric:set-mouse-ignore", newLock);
  // };

  return (
    <div className={styles.container} style={{ "--font-color": fontColor } as any}>
      <div className={styles.dragArea} />
      
      <div className={styles.content}>
        <div 
          className={styles.lyricText} 
          style={{ 
            fontSize: `${fontSize}px`,
            textShadow: shadow ? "0 2px 4px rgba(0,0,0,0.5)" : "none"
          }}
        >
          {currentLyric}
        </div>
      </div>

      <div className={styles.controls}>
        <Space size="large">
          <Button 
            type="text" 
            icon={<StepBackwardOutlined />} 
            onClick={prev} 
            className={styles.controlBtn}
          />
          <Button 
            type="text" 
            icon={isPlaying ? <PauseCircleFilled /> : <PlayCircleFilled />} 
            onClick={togglePlay} 
            className={styles.controlBtn}
            style={{ fontSize: 24 }}
          />
          <Button 
            type="text" 
            icon={<StepForwardOutlined />} 
            onClick={next} 
            className={styles.controlBtn}
          />
          {/* <Button 
            type="text" 
            icon={lockPosition ? <LockOutlined /> : <UnlockOutlined />} 
            onClick={toggleLock} 
            className={styles.controlBtn}
          /> */}
        </Space>
      </div>
    </div>
  );
};

export default LyricWindow;
