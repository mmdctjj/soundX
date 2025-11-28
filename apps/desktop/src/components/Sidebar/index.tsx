import {
  AppstoreOutlined,
  CompassOutlined,
  CustomerServiceOutlined,
  HeartOutlined,
  PlusOutlined,
  SoundOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Typography, theme } from "antd";
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./index.module.less";

const { Text, Title } = Typography;

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div
      className={styles.sidebar}
      style={{ color: token.colorText, borderRightColor: token.colorBorder }}
    >
      <div className={styles.header}>
        <Title level={4} style={{ margin: 0, color: token.colorText }}>
          Sond X
        </Title>
      </div>

      <div className={styles.menuGroup}>
        <MenuItem
          icon={<CompassOutlined />}
          text="推荐"
          onClick={() => navigate("/recommended")}
          active={isActive("/recommended")}
        />
        <MenuItem
          icon={<AppstoreOutlined />}
          text="分类"
          onClick={() => navigate("/category")}
          active={isActive("/category")}
        />
        <MenuItem
          icon={<TeamOutlined />}
          text="艺术家"
          onClick={() => navigate("/artists")}
          active={isActive("/artists")}
        />
      </div>

      <div className={styles.playlistHeader}>
        <Title level={5} style={{ margin: 0, color: token.colorText }}>
          播放列表
        </Title>
        <CustomerServiceOutlined style={{ color: token.colorTextSecondary }} />
      </div>

      <div className={styles.playlistGroup}>
        <MenuItem
          icon={<HeartOutlined />}
          text="收藏"
          onClick={() => navigate("/favorites")}
          active={isActive("/favorites")}
        />
        <MenuItem
          icon={<SoundOutlined />}
          text="听过"
          onClick={() => navigate("/listened")}
          active={isActive("/listened")}
        />

        <div
          className={styles.addPlaylist}
          style={{ color: token.colorTextSecondary }}
        >
          <div
            className={styles.addIcon}
            style={{ backgroundColor: token.colorFillTertiary }}
          >
            <PlusOutlined style={{ fontSize: "14px" }} />
          </div>
          <Text style={{ color: "inherit" }}>添加播放列表</Text>
        </div>
      </div>
    </div>
  );
};

const MenuItem = ({
  icon,
  text,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  text: string;
  active?: boolean;
  onClick?: () => void;
}) => {
  const { token } = theme.useToken();

  return (
    <div
      onClick={onClick}
      className={`${styles.menuItem} ${active ? styles.active : ""}`}
      style={{
        color: active ? token.colorText : token.colorTextSecondary,
        backgroundColor: active ? token.colorFillTertiary : "transparent",
      }}
    >
      <span style={{ fontSize: "20px" }}>{icon}</span>
      <Text style={{ color: "inherit" }}>{text}</Text>
    </div>
  );
};

export default Sidebar;
