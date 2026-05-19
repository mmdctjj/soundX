import {
    CloseOutlined,
    ExportOutlined,
    PauseCircleFilled,
    PlayCircleFilled,
    StepBackwardOutlined,
    StepForwardOutlined
} from "@ant-design/icons";
import { Button, Space } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import { compileForDesktop } from "@soundx/plugin-runtime";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../../store/settings";
import styles from "./index.module.less";

const LyricWindow: React.FC = () => {
  const { t } = useTranslation();
  const [currentLyric, setCurrentLyric] = useState(t('lyricWindow.waitingForPlayback'));
  const [isPlaying, setIsPlaying] = useState(false);
  
  const settings = useSettingsStore((state) => state.desktopLyric);
  const visualPlugin = useSettingsStore((state) => state.visualPlugin);
  const [config, setConfig] = useState(settings);

  const [trackInfo, setTrackInfo] = useState<{ name: string; artist: string } | null>(null);

  const pluginConfig = useMemo(() => {
    if (!visualPlugin.enabled || !visualPlugin.tokens) return null;
    return compileForDesktop(visualPlugin.tokens);
  }, [visualPlugin]);

  useEffect(() => {
    if (!window.ipcRenderer) return;

    const handleSettingsUpdate = (_event: any, payload: any) => {
      setConfig((prev) => ({ ...prev, ...payload }));
    };

    const handleLyricUpdate = (_event: any, payload: { currentLyric: string }) => {
      setCurrentLyric(payload.currentLyric || t('lyricWindow.defaultLyric'));
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

    const fetchInitialState = async () => {
      const state = await window.ipcRenderer.invoke("player:get-state");
      if (state) {
        setIsPlaying(state.isPlaying);
        if (state.track) {
          setTrackInfo(state.track);
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

  return (
    <div 
      className={styles.container} 
      style={{ 
        "--font-color": pluginConfig?.desktopLyricOverride.fontColor || config.fontColor,
        "--stroke-color": config.strokeColor,
        "--stroke-width": `${config.strokeWidth}px`,
        ...(pluginConfig?.cssVariables || {})
      } as any}
    >
      <div className={styles.header}>
         <div className={styles.trackInfo}>
            {trackInfo ? `${trackInfo.name} - ${trackInfo.artist}` : t('lyricWindow.appName')}
         </div>
      </div>
      
      <div className={styles.content}>
        <div 
          className={styles.lyricText} 
          style={{
            fontSize: `${config.fontSize}px`,
            fontWeight: pluginConfig?.desktopLyricOverride.fontWeight ?? config.fontWeight,
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
            icon={<CloseOutlined />} 
            onClick={() => useSettingsStore.getState().updateDesktopLyric('enable', false)}
            className={styles.controlBtn}
            title={t('lyricWindow.close')}
          />
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
          <Button 
            type="text" 
            icon={<ExportOutlined />} 
            onClick={() => window.ipcRenderer?.send("app:show-main")} 
            className={styles.controlBtn}
            title={t('lyricWindow.openPlayer')}
          />
        </Space>
      </div>
    </div>
  );
};

export default LyricWindow;
