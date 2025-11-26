import {
  CustomerServiceOutlined,
  ImportOutlined,
  LeftOutlined,
  MoonOutlined,
  ReadOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
  SkinOutlined,
  SunOutlined,
} from "@ant-design/icons";
import { Input, theme, Tooltip } from "antd";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import styles from "./index.module.less";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { mode, toggleTheme } = useTheme();
  const { token } = theme.useToken();

  // Mode state: 'music' | 'audiobook'
  const [playMode, setPlayMode] = React.useState<"music" | "audiobook">(() => {
    return (
      (localStorage.getItem("playMode") as "music" | "audiobook") || "music"
    );
  });

  const togglePlayMode = () => {
    const newMode = playMode === "music" ? "audiobook" : "music";
    setPlayMode(newMode);
    localStorage.setItem("playMode", newMode);
  };

  const iconStyle = { color: token.colorTextSecondary };
  const actionIconStyle = { color: token.colorText };

  return (
    <div className={styles.header}>
      {/* Navigation Controls */}
      <div className={styles.navControls}>
        <div className={styles.navGroup}>
          <Tooltip title="后退">
            <LeftOutlined
              onClick={() => navigate(-1)}
              className={styles.navIcon}
              style={iconStyle}
            />
          </Tooltip>
          <Tooltip title="前进">
            <RightOutlined
              onClick={() => navigate(1)}
              className={styles.navIcon}
              style={iconStyle}
            />
          </Tooltip>
          <Tooltip title="刷新">
            <ReloadOutlined
              onClick={() => window.location.reload()}
              className={styles.navIcon}
              style={iconStyle}
            />
          </Tooltip>
        </div>
      </div>

      {/* Search Bar */}
      <div className={styles.searchBar}>
        <Input
          prefix={
            <SearchOutlined style={{ color: token.colorTextSecondary }} />
          }
          placeholder="HLE官宣Gumayusi加盟"
          bordered={false}
          className={styles.searchInput}
          style={{ color: token.colorText }}
        />
      </div>

      {/* User Actions */}
      <div className={styles.userActions}>
        <Tooltip
          title={playMode === "music" ? "切换至有声书模式" : "切换至音乐模式"}
        >
          <div
            onClick={togglePlayMode}
            className={styles.actionIcon}
            style={actionIconStyle}
          >
            {playMode === "music" ? (
              <CustomerServiceOutlined />
            ) : (
              <ReadOutlined />
            )}
          </div>
        </Tooltip>
        <Tooltip title="导入">
          <ImportOutlined
            className={styles.actionIcon}
            style={actionIconStyle}
          />
        </Tooltip>
        <Tooltip title="主题">
          <SkinOutlined className={styles.actionIcon} style={actionIconStyle} />
        </Tooltip>
        <Tooltip title={mode === "dark" ? "切换至亮色模式" : "切换至暗色模式"}>
          <div
            onClick={toggleTheme}
            className={styles.actionIcon}
            style={actionIconStyle}
          >
            {mode === "dark" ? <SunOutlined /> : <MoonOutlined />}
          </div>
        </Tooltip>
        <div className={styles.avatar}>
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
            alt="avatar"
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </div>
    </div>
  );
};

export default Header;
