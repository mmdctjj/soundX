import type { Album } from '@soundx/db';
import { useInfiniteScroll } from 'ahooks';
import { Skeleton, Timeline, Typography } from 'antd';
import React, { useRef } from 'react';
import Cover from '../components/Cover';
import type { TimelineItem } from '../models';
import { formatTimeLabel } from '../utils/timeFormat';

const { Title } = Typography;

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
      cover: `https://picsum.photos/seed/fav${id}/300/300`,
      year: '2023',
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

  const loadMoreFavorites = async (d: Result | undefined): Promise<Result> => {
    const currentPage = d ? d.list.length : 0;

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newItem = generateMockTimelineItem(currentPage);
    const newList = d ? [...d.list, newItem] : [newItem];

    return {
      list: newList,
      hasMore: newList.length < 10, // Limit to 10 timeline items
    };
  };

  const { data, loading, loadingMore } = useInfiniteScroll(
    loadMoreFavorites,
    {
      target: scrollRef,
      isNoMore: (d) => !d?.hasMore,
    }
  );

  const timelineItems = data?.list.map((item) => ({
    children: (
      <div>
        <Title level={4} style={{ color: 'white', marginBottom: '20px' }}>
          {formatTimeLabel(item.time)}
        </Title>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '30px',
            marginBottom: '40px',
          }}
        >
          {item.items.map((album) => (
            <Cover key={album.id} item={album} />
          ))}
        </div>
      </div>
    ),
  })) || [];

  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        backgroundColor: 'var(--glass-bg)',
        backdropFilter: 'blur(100px)',
        WebkitBackdropFilter: 'blur(100px)',
        padding: '30px',
      }}
    >
      <Title level={2} style={{ color: 'white', marginBottom: '30px' }}>
        收藏
      </Title>

      <Timeline
        mode="left"
        items={timelineItems}
        style={{
          marginTop: '20px',
        }}
      />

      {(loading || loadingMore) && (
        <div style={{ marginLeft: '30px', marginTop: '20px' }}>
          <Skeleton
            active
            title={{ width: '100px' }}
            paragraph={false}
            style={{ marginBottom: '20px' }}
          />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '30px',
              marginBottom: '40px',
            }}
          >
            {Array.from({ length: 4 }).map((_, index) => (
              <Cover.Skeleton key={`skeleton-${index}`} />
            ))}
          </div>
        </div>
      )}

      {data && !data.hasMore && data.list.length > 0 && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: 'var(--text-secondary)',
        }}>
          没有更多了
        </div>
      )}

      <style>{`
        .ant-timeline-item-head {
          background-color: var(--accent-color) !important;
          border-color: var(--accent-color) !important;
        }
        .ant-timeline-item-tail {
          border-left: 2px solid rgba(255, 255, 255, 0.2) !important;
        }
        .ant-timeline-item-content {
          margin-left: 30px;
        }
      `}</style>
    </div>
  );
};

export default Favorites;
