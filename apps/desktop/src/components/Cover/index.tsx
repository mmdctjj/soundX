import type { Album, Track } from "@soundx/db";
import { Skeleton, Typography } from "antd";
import React from "react";
import { useNavigate } from "react-router-dom";
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
