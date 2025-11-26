import { SyncOutlined } from "@ant-design/icons";
import type { Album } from "@soundx/db";
import { useInfiniteScroll } from "ahooks";
import { Button, Skeleton, Timeline, Typography } from "antd";
import React, { useRef, useState } from "react";
import Cover from "../../components/Cover/index";
import type { TimelineItem } from "../../models";
import { cacheUtils } from "../../utils/cache";
import { formatTimeLabel } from "../../utils/timeFormat";
import styles from "./index.module.less";

const { Title } = Typography;

const CACHE_KEY = "listened_timeline";

// Function to generate mock timeline items
const generateMockTimelineItem = (page: number): TimelineItem => {
  const baseTime = Date.now() - page * 5 * 24 * 60 * 60 * 1000; // Each page is 5 days earlier
  const albums: Album[] = [];

  const itemCount = Math.floor(Math.random() * 3) + 2; // 2-4 items per timeline
  for (let i = 0; i < itemCount; i++) {
    const id = page * 4 + i + 1;
    albums.push({
      id,
      name: `Listened Album ${id}`,
      artist: `Artist ${id}`,
      cover: `https://picsum.photos/seed/listen${id}/300/300`,
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

const Listened: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadMoreListened = async (d: Result | undefined): Promise<Result> => {
    const currentPage = d ? d.list.length : 0;

    // Try cache first for initial load
    if (currentPage === 0) {
      const cached = cacheUtils.get<TimelineItem[]>(CACHE_KEY);
      if (cached && cached.length > 0) {
        return {
          list: cached,
          hasMore: cached.length < 12,
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
      hasMore: newList.length < 12, // Limit to 12 timeline items
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
          <div className={styles.grid}>
            {item.items.map((album) => (
              <Cover key={album.id} item={album} />
            ))}
          </div>
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
          <div className={styles.grid}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Cover.Skeleton key={`skeleton-${index}`} />
            ))}
          </div>
        </div>
      )}

      {data && !data.hasMore && data.list.length > 0 && (
        <div className={styles.noMore}>没有更多了</div>
      )}
    </div>
  );
};

export default Listened;
