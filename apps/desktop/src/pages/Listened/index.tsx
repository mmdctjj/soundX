import { SyncOutlined } from "@ant-design/icons";
import type { Album } from "@soundx/db";
import { useInfiniteScroll } from "ahooks";
import { Button, Col, Row, Skeleton, Timeline, Typography } from "antd";
import React, { useRef, useState } from "react";
import Cover from "../../components/Cover/index";
import type { TimelineItem } from "../../models";
import { getAlbumHistory } from "../../services/user";
import { formatTimeLabel } from "../../utils/timeFormat";
import styles from "./index.module.less";

const { Title } = Typography;

interface Result {
  list: TimelineItem[];
  hasMore: boolean;
}

const Listened: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [refreshing, setRefreshing] = useState(false);

  const type =
    localStorage.getItem("playMode") === "music" ? "MUSIC" : "AUDIOBOOK";

  const loadMoreListened = async (d: Result | undefined): Promise<Result> => {
    const currentPage = d ? d.list.length : 0;

    try {
      // Fetch real data from API
      const response = await getAlbumHistory(20, currentPage);

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
        const newItems: TimelineItem[] = Array.from(timelineMap.entries()).map(
          ([date, albums]) => ({
            id: date,
            time: new Date(date).getTime(),
            items: albums?.filter((album) => album.type === type),
          })
        );

        const newList = d ? [...d.list, ...newItems] : newItems;

        return {
          list: newList,
          hasMore: newList.length < total,
        };
      }
    } catch (error) {
      console.error("Failed to load album history:", error);
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
    }
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const timelineItems =
    data?.list.map((item) => ({
      children: (
        <div>
          <Title level={4} className={styles.timelineTitle}>
            {formatTimeLabel(item.time)}
          </Title>
          <Row gutter={[24, 24]}>
            {item.items.map((album) => (
              <Col key={album.id}>
                <Cover item={album} />
              </Col>
            ))}
          </Row>
        </div>
      ),
    })) || [];

  return (
    <div ref={scrollRef} className={styles.container}>
      <div className={styles.pageHeader}>
        <Title level={2} className={styles.title}>
          听过
        </Title>
        <Button
          type="text"
          icon={<SyncOutlined spin={refreshing} />}
          onClick={handleRefresh}
          loading={refreshing}
          className={styles.refreshButton}
        >
          刷新
        </Button>
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
    </div>
  );
};

export default Listened;
