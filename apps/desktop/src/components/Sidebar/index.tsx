import {
  AppstoreOutlined,
  AppstoreAddOutlined,
  AudioOutlined,
  CloudDownloadOutlined,
  CompassOutlined,
  CustomerServiceOutlined,
  HeartOutlined,
  PlusOutlined,
  SoundOutlined,
  TeamOutlined,
  VideoCameraOutlined
} from "@ant-design/icons";
import { createPlaylist, TrackType } from "@soundx/services";
import { Form, Input, Modal, theme, Typography } from "antd";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useMessage } from "../../context/MessageContext";
import { useAuthStore } from "../../store/auth";
import { usePlaylistStore } from "../../store/playlist";
import { isEmbySource, isSubsonicSource } from "../../utils";
import { isWeb } from "../../utils/platform";
import { usePlayMode } from "../../utils/playMode";
import styles from "./index.module.less";

const { Text, Title } = Typography;

const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const message = useMessage();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const { playlists, fetchPlaylists } = usePlaylistStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const { mode } = usePlayMode();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.id) {
      fetchPlaylists(mode, user.id);
    }
  }, [mode, user?.id]);

  const isActive = (path: string) => location.pathname === path;

  const handleCreatePlaylist = async () => {
    try {
      const values = await form.validateFields();
      if (!user?.id) return;
      setLoading(true);
      const res = await createPlaylist(values.name, mode, user.id);

      if (res.code === 200) {
        message.success(t("playlist.createSuccess"));
        setIsModalOpen(false);
        form.resetFields();
        fetchPlaylists(mode, user.id);
      } else {
        message.error(t("playlist.createFailed"));
      }
    } catch (error) {
      console.error("Create playlist error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={styles.sidebar}
      style={{ color: token.colorText, borderRightColor: token.colorBorder }}
      data-tauri-drag-region
    >
      <div className={styles.header}>
        <Title level={4} style={{ margin: 0, color: token.colorText }}>
          AudioDock
        </Title>
      </div>

      <div className={styles.menuGroup} data-tauri-no-drag>
        <MenuItem
          icon={<CompassOutlined />}
          text={t("nav.recommended")}
          onClick={() => navigate("/recommended")}
          active={isActive("/recommended")}
        />
        <MenuItem
          icon={<AppstoreOutlined />}
          text={t("nav.albums")}
          onClick={() => navigate("/category")}
          active={isActive("/category")}
        />
        {mode === TrackType.AUDIOBOOK && (
          <MenuItem
            icon={<AppstoreAddOutlined />}
            text={t("nav.collections")}
            onClick={() => navigate("/collections")}
            active={isActive("/collections")}
          />
        )}
        <MenuItem
          icon={<TeamOutlined />}
          text={t("nav.artists")}
          onClick={() => navigate("/artists")}
          active={isActive("/artists")}
        />
        {
          mode === TrackType.MUSIC && (
            <>
              <MenuItem
                icon={<AudioOutlined />}
                text={t("nav.tracks")}
                onClick={() => navigate("/songs")}
                active={isActive("/songs")}
              />
              <MenuItem
                icon={<VideoCameraOutlined />}
                text="MV"
                onClick={() => navigate("/mvs")}
                active={isActive("/mvs")}
              />
            </>
          )
        }
      </div>

      <div className={styles.playlistHeader} data-tauri-no-drag>
        <Title level={5} style={{ margin: 0, color: token.colorText }}>
          {t("nav.playlists")}
        </Title>
        <CustomerServiceOutlined style={{ color: token.colorTextSecondary }} />
      </div>

      <div className={styles.playlistGroup} data-tauri-no-drag>
        {!isWeb() && (
          <MenuItem
            icon={<CloudDownloadOutlined />}
            text={t("nav.downloads")}
            onClick={() => navigate("/downloads")}
            active={isActive("/downloads")}
          />
        )}
        <MenuItem
          icon={<HeartOutlined />}
          text={t("nav.favorites")}
          onClick={() => navigate("/favorites")}
          active={isActive("/favorites")}
        />
        {!isSubsonicSource() && !isEmbySource() && (
          <MenuItem
            icon={<SoundOutlined />}
            text={t("nav.listened")}
            onClick={() => navigate("/listened")}
            active={isActive("/listened")}
          />
        )}

        {/* Dynamic Playlists */}
        {playlists.map((playlist) => (
          <MenuItem
            key={playlist.id}
            icon={<></>}
            text={playlist.name}
            onClick={() => navigate(`/playlist/${playlist.id}`)}
            active={isActive(`/playlist/${playlist.id}`)}
          />
        ))}

        <div
          className={styles.addPlaylist}
          style={{ color: token.colorTextSecondary, cursor: "pointer" }}
          onClick={() => setIsModalOpen(true)}
        >
          <div
            className={styles.addIcon}
            style={{ backgroundColor: token.colorFillTertiary }}
          >
            <PlusOutlined style={{ fontSize: "14px" }} />
          </div>
          <Text style={{ color: "inherit" }}>{t("nav.addPlaylist")}</Text>
        </div>
      </div>

      <Modal
        title={t("playlist.newPlaylist")}
        open={isModalOpen}
        onOk={handleCreatePlaylist}
        onCancel={() => setIsModalOpen(false)}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={t("playlist.playlistName")}
            rules={[{ required: true, message: t("playlist.playlistNamePlaceholder") }]}
          >
            <Input placeholder={t("playlist.playlistNamePlaceholder")} />
          </Form.Item>
        </Form>
      </Modal>
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
      style={
        active
          ? {
              color: token.colorTextLightSolid,
              backgroundColor: token.colorPrimary,
            }
          : { color: token.colorTextSecondary }
      }
    >
      <span style={{ fontSize: "20px" }}>{icon}</span>
      <Text style={{ color: "inherit" }} ellipsis>
        {text}
      </Text>
    </div>
  );
};

export default Sidebar;
