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
  
  const settings = useSettingsStore((state) => state.desktopLyric);
  const [config, setConfig] = useState(settings);

  useEffect(() => {
    if (!window.ipcRenderer) return;

    const handleSettingsUpdate = (_event: any, payload: any) => {
      setConfig((prev) => ({ ...prev, ...payload }));
    };

    const handleLyricUpdate = (_event: any, payload: { currentLyric: string }) => {
      setCurrentLyric(payload.currentLyric || "AudioDock 听见你的声音");
    };

    const handlePlayerUpdate = (
      _event: any,
      payload: { isPlaying: boolean; track: { name: string; artist: string } }
    ) => {
      setIsPlaying(payload.isPlaying);
    };

    const fetchInitialState = async () => {
      const state = await window.ipcRenderer.invoke("player:get-state");
      if (state) {
        setIsPlaying(state.isPlaying);
        if (state.track) {
          setCurrentLyric(`${state.track.name} - ${state.track.artist}`);
        }
      }
    };

    fetchInitialState();

    window.ipcRenderer.on("lyric:update", handleLyricUpdate);
    window.ipcRenderer.on("player:update", handlePlayerUpdate);
    window.ipcRenderer.on("lyric:settings-update", handleSettingsUpdate);

    return () => {
      window.ipcRenderer.off("lyric:update", handleLyricUpdate);
      window.ipcRenderer.off("player:update", handlePlayerUpdate);
      window.ipcRenderer.off("lyric:settings-update", handleSettingsUpdate);
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
    <div 
      className={styles.container} 
      style={{ 
        "--font-color": config.fontColor,
        "--stroke-color": config.strokeColor,
        "--stroke-width": `${config.strokeWidth}px`
      } as any}
    >
      <div className={styles.dragArea} />
      
      <div className={styles.content}>
        <div 
          className={styles.lyricText} 
          style={{
            fontSize: `${config.fontSize}px`,
            textShadow: config.shadow ? "0 2px 4px rgba(0,0,0,0.5)" : "none"
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
