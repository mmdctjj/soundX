import { SyncOutlined } from "@ant-design/icons";
import type { Album } from "@soundx/db";
import { useInfiniteScroll } from "ahooks";
import { Button, Col, Row, Skeleton, Timeline, Typography } from "antd";
import React, { useRef, useState } from "react";
import Cover from "../../components/Cover/index";
import type { TimelineItem } from "../../models";
import { cacheUtils } from "../../utils/cache";
import { formatTimeLabel } from "../../utils/timeFormat";
import styles from "./index.module.less";

const { Title } = Typography;

const CACHE_KEY = "favorites_timeline";

// Function to generate mock timeline items
const generateMockTimelineItem = (page: number): TimelineItem => {
  const baseTime = Date.now() - page * 7 * 24 * 60 * 60 * 1000; // Each page is 1 week earlier
  const albums: Album[] = [];

  for (let i = 0; i < 4; i++) {
    const id = page * 4 + i + 1;
    albums.push({
      id,
      name: `Favorite Album ${id}`,
      artist: `Artist ${id}`,
      cover: `https://picsum.photos/seed/${id}/300/300`,
      year: "2023",
    });
  }

  return {
    id: `timeline-${page}`,
    time: baseTime,
    items: albums,
  };
};

interface Result {
  list: TimelineItem[];
  hasMore: boolean;
}

const Favorites: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadMoreFavorites = async (d: Result | undefined): Promise<Result> => {
    const currentPage = d ? d.list.length : 0;

    // Try cache first for initial load
    if (currentPage === 0) {
      const cached = cacheUtils.get<TimelineItem[]>(CACHE_KEY);
      if (cached && cached.length > 0) {
        return {
          list: cached,
          hasMore: cached.length < 10,
        };
      }
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newItem = generateMockTimelineItem(currentPage);
    const newList = d ? [...d.list, newItem] : [newItem];

    // Cache the data
    cacheUtils.set(CACHE_KEY, newList);

    return {
      list: newList,
      hasMore: newList.length < 10, // Limit to 10 timeline items
    };
  };

  const { data, loading, loadingMore, reload } = useInfiniteScroll(
    loadMoreFavorites,
    {
      target: scrollRef,
      isNoMore: (d) => !d?.hasMore,
    }
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    cacheUtils.clear(CACHE_KEY);
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
          <Row gutter={[24, 24]} className={styles.grid}>
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
          收藏
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

export default Favorites;
