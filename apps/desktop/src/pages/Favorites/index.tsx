import {
  AppstoreOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  SyncOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { useInfiniteScroll } from "ahooks";
import {
  Button,
  Col,
  Empty,
  Flex,
  Row,
  Segmented,
  Skeleton,
  Table,
  Timeline,
  Typography,
  theme,
} from "antd";
import React, { useRef, useState } from "react";
import Cover from "../../components/Cover/index";
import type { TimelineItem } from "../../models";
import { type Album, type Track } from "../../models";
import { getFavoriteAlbums, getFavoriteTracks } from "../../services/user";
import { usePlayerStore } from "../../store/player";
import { formatDuration } from "../../utils/formatDuration";
import { usePlayMode } from "../../utils/playMode";
import { formatTimeLabel } from "../../utils/timeFormat";
import styles from "./index.module.less";

const { Title, Text } = Typography;

interface Result {
  list: TimelineItem[];
  hasMore: boolean;
  nextId?: number;
}

const Favorites: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"album" | "track">("album");
  const { token } = theme.useToken();
  const { play, setPlaylist, currentTrack, isPlaying } = usePlayerStore();

  const { mode } = usePlayMode();
  const type = mode;

  const loadMoreFavorites = async (d: Result | undefined): Promise<Result> => {
    const currentLoadCount = d?.nextId || 0;

    try {
      if (viewMode === "album") {
        const res = await getFavoriteAlbums(currentLoadCount, 20);
        if (res.code === 200 && res.data) {
          const { list } = res.data;

          // Group by date
          const timelineMap = new Map<string, Album[]>();
          list.forEach((item: any) => {
            const dateKey = new Date(item.createdAt).toDateString();
            if (!timelineMap.has(dateKey)) {
              timelineMap.set(dateKey, []);
            }
            if (item.album) {
              timelineMap.get(dateKey)!.push(item.album);
            }
          });

          const newItems: TimelineItem[] = Array.from(
            timelineMap.entries()
          ).map(([date, albums]) => ({
            id: date,
            time: new Date(date).getTime(),
            items: albums?.filter((album) => album.type === type),
          }));

          // Merge with existing items if date matches
          let mergedList = d ? [...d.list] : [];
          newItems.forEach((newItem) => {
            const existingItemIndex = mergedList.findIndex(
              (item) => item.id === newItem.id
            );
            if (existingItemIndex > -1) {
              mergedList[existingItemIndex].items = [
                ...mergedList[existingItemIndex].items,
                ...newItem.items,
              ];
            } else {
              mergedList.push(newItem);
            }
          });

          if (!d) mergedList = newItems;

          return {
            list: mergedList,
            hasMore: list.length === 20,
            nextId: currentLoadCount + 1,
          };
        }
      } else {
        // Track mode
        const res = await getFavoriteTracks(currentLoadCount, 20);
        if (res.code === 200 && res.data) {
          const { list, total: _total } = res.data;

          const timelineMap = new Map<string, Track[]>();
          list.forEach((item: any) => {
            const dateKey = new Date(item.createdAt).toDateString();
            if (!timelineMap.has(dateKey)) {
              timelineMap.set(dateKey, []);
            }
            if (item.track) {
              timelineMap.get(dateKey)!.push(item.track);
            }
          });

          const newItems: TimelineItem[] = Array.from(
            timelineMap.entries()
          ).map(([date, tracks]) => ({
            id: date,
            time: new Date(date).getTime(),
            items: tracks?.filter((track) => track.type === type),
          }));

          // Merge with existing items if date matches
          let mergedList = d ? [...d.list] : [];
          newItems.forEach((newItem) => {
            const existingItemIndex = mergedList.findIndex(
              (item) => item.id === newItem.id
            );
            if (existingItemIndex > -1) {
              mergedList[existingItemIndex].items = [
                ...mergedList[existingItemIndex].items,
                ...newItem.items,
              ];
            } else {
              mergedList.push(newItem);
            }
          });

          if (!d) mergedList = newItems;

          return {
            list: mergedList,
            hasMore: list.length === 20,
            nextId: currentLoadCount + 1,
          };
        }
      }
    } catch (error) {
      console.error("Failed to fetch favorites:", error);
    }

    return {
      list: d?.list || [],
      hasMore: false,
    };
  };

  const { data, loading, loadingMore, reload } = useInfiniteScroll(
    loadMoreFavorites,
    {
      target: scrollRef,
      isNoMore: (d) => !d?.hasMore,
      reloadDeps: [viewMode, type],
    }
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const handlePlayTrack = (track: Track, tracks: Track[]) => {
    setPlaylist(tracks);
    play(track, -1);
  };

  const columns = [
    {
      title: " ",
      key: "play",
      width: 50,
      render: (_: any, record: Track) => {
        const isCurrent = currentTrack?.id === record.id;
        return (
          <div
            onClick={(e) => {
              e.stopPropagation();
              // Find the list this track belongs to
              const group = data?.list.find((item) =>
                item.items.some((t) => t.id === record.id)
              );
              if (group) {
                handlePlayTrack(record, group.items as Track[]);
              }
            }}
            style={{ cursor: "pointer" }}
          >
            {isCurrent && isPlaying ? (
              <PauseCircleOutlined style={{ color: token.colorPrimary }} />
            ) : (
              <PlayCircleOutlined />
            )}
          </div>
        );
      },
    },
    {
      title: "标题",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: Track) => (
        <Text
          strong={currentTrack?.id === record.id}
          style={{
            color:
              currentTrack?.id === record.id ? token.colorPrimary : undefined,
          }}
        >
          {text}
        </Text>
      ),
    },
    {
      title: "艺术家",
      dataIndex: "artist",
      key: "artist",
      render: (text: string) => <Text type="secondary">{text}</Text>,
    },
    {
      title: "专辑",
      dataIndex: ["album", "name"],
      key: "album",
      render: (text: string) => <Text type="secondary">{text}</Text>,
    },
    {
      title: "时长",
      dataIndex: "duration",
      key: "duration",
      width: 100,
      render: (duration: number) => (
        <Text type="secondary">{formatDuration(duration)}</Text>
      ),
    },
  ];

  const timelineItems =
    data?.list.map((item) => ({
      children: (
        <div>
          <Title level={4} className={styles.timelineTitle}>
            {formatTimeLabel(item.time)}
          </Title>
          {viewMode === "album" ? (
            <Row gutter={16}>
              {item.items.map((album) => (
                <Col key={album.id}>
                  <Cover item={album as Album} />
                </Col>
              ))}
            </Row>
          ) : (
            <Table
              dataSource={item.items as Track[]}
              columns={columns}
              pagination={false}
              rowKey="id"
              showHeader={false}
              size="small"
              onRow={(record) => ({
                onDoubleClick: () => {
                  handlePlayTrack(record, item.items as Track[]);
                },
              })}
            />
          )}
        </div>
      ),
    })) || [];

  return (
    <div ref={scrollRef} className={styles.container}>
      <div className={styles.pageHeader}>
        <Title level={2} className={styles.title}>
          收藏
        </Title>
        <Flex gap={8} align="center">
          {type === "MUSIC" && (
            <Segmented
              options={[
                { value: "album", icon: <AppstoreOutlined />, label: "专辑" },
                {
                  value: "track",
                  icon: <UnorderedListOutlined />,
                  label: "歌曲",
                },
              ]}
              value={viewMode}
              onChange={(value) => setViewMode(value as "album" | "track")}
            />
          )}
          <Button
            type="text"
            icon={<SyncOutlined spin={refreshing} />}
            onClick={handleRefresh}
            loading={refreshing}
            className={styles.refreshButton}
          >
            刷新
          </Button>
        </Flex>
      </div>

      <Timeline mode="left" items={timelineItems} className={styles.timeline} />

      {(loading || loadingMore) && (
        <div className={styles.loadingContainer}>
          <Skeleton
            active
            title={{ width: "100px" }}
            paragraph={false}
            className={styles.skeletonTitle}
          />
          <Row gutter={[24, 24]}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Col key={`skeleton-${index}`}>
                <Cover.Skeleton />
              </Col>
            ))}
          </Row>
        </div>
      )}

      {data && !data.hasMore && data.list.length > 0 && (
        <div className={styles.noMore}>没有更多了</div>
      )}

      {data?.list.length === 0 && !loading && (
        <div
          className={styles.noData}
          style={{ color: token.colorTextSecondary }}
        >
          <Empty description="暂无收藏" />
        </div>
      )}
    </div>
  );
};

export default Favorites;
