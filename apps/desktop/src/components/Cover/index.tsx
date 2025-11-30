import {
  HeartFilled,
  HeartOutlined,
  MoreOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import type { Album, Track } from "@soundx/db";
import type { MenuProps } from "antd";
import { Dropdown, message, Skeleton, Typography } from "antd";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAlbumById, getAlbumTracks } from "../../services/album";
import { toggleAlbumLike, unlikeAlbum } from "../../services/user";
import { usePlayerStore } from "../../store/player";
import styles from "./index.module.less";

const { Title, Text } = Typography;

interface CoverComponent
  extends React.FC<{ item: Album | Track; size?: number; isTrack?: boolean }> {
  Skeleton: React.FC;
}

const Cover: CoverComponent = ({ item, size, isTrack = false }) => {
  const navigate = useNavigate();
  const { play, setPlaylist } = usePlayerStore();
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    // Check if album is liked
    if (!isTrack && (item as Album).id) {
      checkIfLiked((item as Album).id);
    }
  }, [item, isTrack]);

  const checkIfLiked = async (albumId: number) => {
    try {
      const res = await getAlbumById(albumId);
      if (res.code === 200) {
        // @ts-ignore - likedByUsers is included in response
        const likedByUsers = res.data.likedByUsers || [];
        const isLikedByCurrentUser = likedByUsers.some(
          (like: any) => like.userId === 1
        );
        setIsLiked(isLikedByCurrentUser);
      }
    } catch (error) {
      console.error("Failed to check like status:", error);
    }
  };

  const handleClick = () => {
    if (isTrack) {
      // For tracks, play directly
      play(item as Track);
      setPlaylist([item as Track]);
    } else {
      // For albums, navigate to detail page
      navigate(`/detail?id=${item.id}`);
    }
  };

  const handlePlayAlbum = async () => {
    if (isTrack) {
      play(item as Track);
      setPlaylist([item as Track]);
    } else {
      try {
        const res = await getAlbumTracks((item as Album).id, 100, 0);
        if (res.code === 200 && res.data.list.length > 0) {
          setPlaylist(res.data.list);
          play(res.data.list[0], (item as Album).id);
          message.success("开始播放");
        }
      } catch (error) {
        message.error("播放失败");
      }
    }
  };

  const handleToggleLike = async () => {
    if (isTrack) return;

    try {
      if (isLiked) {
        const res = await unlikeAlbum((item as Album).id);
        if (res.code === 200) {
          setIsLiked(false);
          message.success("已取消收藏");
        }
      } else {
        const res = await toggleAlbumLike((item as Album).id);
        if (res.code === 200) {
          setIsLiked(true);
          message.success("收藏成功");
        }
      }
    } catch (error) {
      message.error("操作失败");
    }
  };

  const menuItems: MenuProps["items"] = [
    {
      key: "play",
      label: "播放",
      icon: <PlayCircleOutlined />,
      onClick: handlePlayAlbum,
    },
    {
      key: "like",
      label: isLiked ? "取消收藏" : "收藏",
      icon: isLiked ? (
        <HeartFilled style={{ color: "#ff4d4f" }} />
      ) : (
        <HeartOutlined />
      ),
      onClick: handleToggleLike,
    },
  ];

  return (
    <div
      className={styles.coverContainer}
      onClick={handleClick}
      style={size ? { width: size } : undefined}
    >
      <div className={styles.imageWrapper}>
        <img
          src={
            item.cover
              ? `http://localhost:3000${item.cover}`
              : `https://picsum.photos/seed/${item.id}/300/300`
          }
          alt={item.name}
          className={styles.image}
        />
        {!isTrack && (
          <div className={styles.moreButton}>
            <Dropdown
              menu={{ items: menuItems }}
              trigger={["click"]}
              placement="bottomRight"
            >
              <MoreOutlined
                onClick={(e) => e.stopPropagation()}
                style={{ fontSize: "20px", cursor: "pointer" }}
              />
            </Dropdown>
          </div>
        )}
      </div>
      <Title level={5} className={styles.title}>
        {item.name}
      </Title>
      <Text type="secondary" className={styles.artist}>
        {item.artist}
      </Text>
    </div>
  );
};

Cover.Skeleton = () => {
  return (
    <div>
      <div className={styles.skeletonWrapper}>
        <Skeleton.Node active className={styles.skeletonNode}>
          <div style={{ width: "100%", height: "100%" }} />
        </Skeleton.Node>
      </div>
      <Skeleton
        active
        title={{ width: "80%", style: { height: "20px", marginBottom: "8px" } }}
        paragraph={{ rows: 1, width: "60%" }}
      />
    </div>
  );
};

export default Cover;
