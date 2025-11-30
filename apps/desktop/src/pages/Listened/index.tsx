import {
  AppstoreOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  SyncOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import type { Album, Track } from "@soundx/db";
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
import { getAlbumHistory, getTrackHistory } from "../../services/user";
import { usePlayerStore } from "../../store/player";
import { formatDuration } from "../../utils/formatDuration";
import { formatTimeLabel } from "../../utils/timeFormat";
import styles from "./index.module.less";

const { Title, Text } = Typography;

interface Result {
  list: TimelineItem[];
  hasMore: boolean;
  nextId?: number;
}

const Listened: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"album" | "track">("album");
  const { token } = theme.useToken();
  const { play, setPlaylist, currentTrack, isPlaying } = usePlayerStore();

  const type =
    localStorage.getItem("playMode") === "music" ? "MUSIC" : "AUDIOBOOK";

  const loadMoreListened = async (d: Result | undefined): Promise<Result> => {
    const currentLoadCount = d?.nextId || 0;
    const isFirstLoad = !d;

    try {
      if (viewMode === "album") {
        if (d?.hasMore === false) {
          return {
            list: d?.list || [],
            hasMore: false,
          };
        }
        // Fetch real data from API
        const response = await getAlbumHistory(
          20,
          isFirstLoad ? 0 : d.list.length
        );

        if (response.code === 200 && response.data) {
          const { list, total } = response.data;

          // Group albums by date
          const timelineMap = new Map<string, Album[]>();

          list.forEach((historyItem: any) => {
            const dateKey = new Date(historyItem.listenedAt).toDateString();
            if (!timelineMap.has(dateKey)) {
              timelineMap.set(dateKey, []);
            }
            // Assuming historyItem has album data
            if (historyItem.album) {
              timelineMap.get(dateKey)!.push(historyItem.album);
            }
          });

          // Convert map to timeline items
          const newItems: TimelineItem[] = Array.from(
            timelineMap.entries()
          ).map(([date, albums]) => ({
            id: date,
            time: new Date(date).getTime(),
            items: albums?.filter((album) => album.type === type),
          }));

          const newList = d ? [...d.list, ...newItems] : newItems;

          return {
            list: newList,
            hasMore: newList.length < total,
            nextId: 0,
          };
        }
      } else {
        // Track mode
        const res = await getTrackHistory(currentLoadCount, 20);
        if (res.code === 200 && res.data) {
          const { list, total: _total, loadCount } = res.data;

          const timelineMap = new Map<string, Track[]>();
          list.forEach((item: any) => {
            const dateKey = new Date(item.listenedAt).toDateString();
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
            hasMore: list.length === 20, // Simple check
            nextId: loadCount,
          };
        }
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    }

    // Fallback to empty result
    return {
      list: d?.list || [],
      hasMore: false,
    };
  };

  const { data, loading, loadingMore, reload } = useInfiniteScroll(
    loadMoreListened,
    {
      target: scrollRef,
      isNoMore: (d) => !d?.hasMore,
      reloadDeps: [viewMode],
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
              const group = data?.list.find((item) =>
                item.items.some((t: Track) => t.id === record.id)
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
            <Row gutter={[24, 24]}>
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
          听过
        </Title>
        <Flex gap={8} align="center">
          {type === "MUSIC" && (
            <Segmented
              options={[
                { value: "album", icon: <AppstoreOutlined /> },
                { value: "track", icon: <UnorderedListOutlined /> },
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
        <div className={styles.noData}>
          <Empty description="暂无记录" />
        </div>
      )}
    </div>
  );
};

export default Listened;
