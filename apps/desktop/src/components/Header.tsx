import {
  ImportOutlined,
  LeftOutlined,
  MoonOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
  SkinOutlined,
  SunOutlined,
} from "@ant-design/icons";
import { Input, theme } from "antd";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import styles from "./Header.module.less";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { mode, toggleTheme } = useTheme();
  const { token } = theme.useToken();

  const iconStyle = { color: token.colorTextSecondary };
  const actionIconStyle = { color: token.colorText };

  return (
    <div className={styles.header}>
      {/* Navigation Controls */}
      <div className={styles.navControls}>
        <div
          className={styles.navGroup}
          style={{ backgroundColor: token.colorFillTertiary }}
        >
          <LeftOutlined
            onClick={() => navigate(-1)}
            className={styles.navIcon}
            style={iconStyle}
          />
          <RightOutlined
            onClick={() => navigate(1)}
            className={styles.navIcon}
            style={iconStyle}
          />
          <ReloadOutlined
            onClick={() => window.location.reload()}
            className={styles.navIcon}
            style={iconStyle}
          />
        </div>
      </div>

      {/* Search Bar */}
      <div
        className={styles.searchBar}
        style={{ backgroundColor: token.colorFillTertiary }}
      >
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
        <ImportOutlined className={styles.actionIcon} style={actionIconStyle} />
        <SkinOutlined className={styles.actionIcon} style={actionIconStyle} />
        <div
          onClick={toggleTheme}
          className={styles.actionIcon}
          style={actionIconStyle}
        >
          {mode === "dark" ? <SunOutlined /> : <MoonOutlined />}
        </div>
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
