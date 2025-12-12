import {
  HeartFilled,
  HeartOutlined,
  MoreOutlined,
  PauseCircleFilled,
  PlayCircleFilled,
  PlayCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Dropdown, List, theme, Typography } from "antd";
import React from "react";
import { getBaseURL } from "../../https";
import { TrackType, type Track } from "../../models";
import styles from "./index.module.less";

const { Text } = Typography;

interface QueueListProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlay: (track: Track) => void;
  onToggleLike: (
    e: React.MouseEvent,
    track: Track,
    type: "like" | "unlike"
  ) => void;
  onAddToPlaylist: (e: React.MouseEvent, track: Track) => void;
  className?: string;
  style?: React.CSSProperties;
}

const getCoverUrl = (path?: string | null) => {
  return path
    ? `${getBaseURL()}${path}`
    : "https://picsum.photos/seed/music/300/300";
};

export const QueueList: React.FC<QueueListProps> = ({
  tracks,
  currentTrack,
  isPlaying,
  onPlay,
  onToggleLike,
  onAddToPlaylist,
  className,
  style,
}) => {
  const { token } = theme.useToken();

  return (
    <List
      className={className}
      style={style}
      itemLayout="horizontal"
      dataSource={tracks}
      renderItem={(item: Track) => {
        const isCurrent = currentTrack?.id === item.id;
        // @ts-ignore
        const isLiked = item.likedByUsers?.some(
          (like: any) => like.userId === 1
        );

        return (
          <List.Item
            className={styles.playlistItem}
            onClick={() => onPlay(item)}
            style={{
              cursor: "pointer",
              backgroundColor: isCurrent
                ? token.colorFillTertiary
                : "transparent", // Use token for consistency
            }}
            actions={[
              <Dropdown
                key="more"
                trigger={["click"]}
                menu={{
                  items: [
                    {
                      key: "play",
                      label: "播放",
                      icon: <PlayCircleOutlined />,
                      onClick: (info) => {
                        info.domEvent.stopPropagation();
                        onPlay(item);
                      },
                    },
                    {
                      key: "like",
                      label: isLiked ? "取消收藏" : "收藏",
                      icon: isLiked ? (
                        <HeartFilled style={{ color: "#ff4d4f" }} />
                      ) : (
                        <HeartOutlined />
                      ),
                      onClick: (info) => {
                        info.domEvent.stopPropagation();
                        onToggleLike(
                          info.domEvent as any,
                          item,
                          isLiked ? "unlike" : "like"
                        );
                      },
                    },
                    {
                      key: "add",
                      label: "添加到播放列表",
                      icon: <PlusOutlined />,
                      onClick: (info) => {
                        info.domEvent.stopPropagation();
                        onAddToPlaylist(info.domEvent as any, item);
                      },
                    },
                  ],
                }}
              >
                <MoreOutlined
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    color: token.colorTextSecondary,
                    cursor: "pointer",
                    fontSize: "20px",
                  }}
                />
              </Dropdown>,
            ]}
          >
            <List.Item.Meta
              className={styles.listCover}
              avatar={
                <div style={{ position: "relative" }}>
                  <img
                    src={getCoverUrl(item.cover)}
                    alt={item.name}
                    style={{
                      width: "50px",
                      height: "50px",
                      objectFit: "cover",
                      borderRadius: "4px",
                    }}
                  />
                  <div className={styles.playIconOverlay}>
                    {isCurrent && isPlaying ? (
                      <PauseCircleFilled className={styles.listPlayIcon} />
                    ) : (
                      <PlayCircleFilled className={styles.listPlayIcon} />
                    )}
                  </div>
                </div>
              }
              title={
                <Text
                  style={{
                    fontSize: "16px",
                    color: isCurrent ? token.colorPrimary : undefined,
                  }}
                  type={
                    item?.type === TrackType.AUDIOBOOK
                      ? Number(item?.progress) > 0
                        ? "secondary"
                        : undefined
                      : undefined
                  }
                  strong={currentTrack?.id === item.id}
                  ellipsis
                >
                  {item.name}
                </Text>
              }
              description={
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text type="secondary" ellipsis>
                    {item.artist}
                  </Text>
                  {item.type === "AUDIOBOOK" &&
                    item.progress &&
                    item.progress > 0 && (
                      <Text type="secondary" style={{ fontSize: "12px" }}>
                        {Math.round(
                          (item.progress / (item.duration || 1)) * 100
                        )}
                        %
                      </Text>
                    )}
                </div>
              }
            />
          </List.Item>
        );
      }}
    />
  );
};
