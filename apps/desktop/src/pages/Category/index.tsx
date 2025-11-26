import type { Album } from '@soundx/db';
import { useInfiniteScroll } from 'ahooks';
import { Tabs } from 'antd';
import React, { useRef, useState } from 'react';
import Cover from '../components/Cover';

interface CategoryTab {
  value: number;
  label: string;
}

const categoryTabs: CategoryTab[] = [
  { value: 1, label: '全部' },
  { value: 2, label: '流行' },
  { value: 3, label: '摇滚' },
  { value: 4, label: '电子' },
  { value: 5, label: '古典' },
  { value: 6, label: '爵士' },
  { value: 7, label: '嘻哈' },
  { value: 8, label: '民谣' },
  { value: 9, label: 'R&B' },
  { value: 10, label: '乡村' },
];

// Function to generate mock albums
const generateMockAlbums = (page: number, pageSize: number): Album[] => {
  const albums: Album[] = [];
  const startId = page * pageSize;

  for (let i = 0; i < pageSize; i++) {
    const id = startId + i + 1;
    albums.push({
      id,
      name: `Album ${id}`,
      artist: `Artist ${id}`,
      cover: `https://picsum.photos/seed/cat${id}/300/300`,
      year: '2023',
    });
  }

  return albums;
};

interface Result {
  list: Album[];
  hasMore: boolean;
}

const Category: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('1');
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMoreAlbums = async (d: Result | undefined): Promise<Result> => {
    const currentPage = d ? Math.floor(d.list.length / 12) : 0;

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newAlbums = generateMockAlbums(currentPage, 12);
    const newList = d ? [...d.list, ...newAlbums] : newAlbums;

    return {
      list: newList,
      hasMore: newList.length < 60, // Limit to 60 items for demo
    };
  };

  const { data, loading, loadingMore } = useInfiniteScroll(
    loadMoreAlbums,
    {
      target: scrollRef,
      isNoMore: (d) => !d?.hasMore,
    }
  );

  const tabItems = categoryTabs.map((tab) => ({
    key: String(tab.value),
    label: tab.label,
  }));

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        backgroundColor: 'var(--glass-bg)',
        backdropFilter: 'blur(100px)',
        WebkitBackdropFilter: 'blur(100px)',
        padding: '0 30px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Tabs */}
      <div>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          tabBarStyle={{
            marginBottom: '30px',
            borderBottom: 'none',
          }}
        />
      </div>

      {/* Cover Grid with Infinite Scroll */}
      <div
        ref={scrollRef}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '30px',
          paddingTop: '20px',
          overflowY: 'auto',
          height: 'calc(100vh - 205px)',
          paddingBottom: '30px',
        }}
      >
        {data?.list.map((album) => (
          <Cover key={album.id} item={album} />
        ))}

        {(loading || loadingMore) && (
          <>
            {Array.from({ length: 8 }).map((_, index) => (
              <Cover.Skeleton key={`skeleton-${index}`} />
            ))}
          </>
        )}

        {data && !data.hasMore && data.list.length > 0 && (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '20px',
            color: 'var(--text-secondary)',
          }}>
            没有更多了
          </div>
        )}
      </div>

      <style>{`
        .ant-tabs-tab {
          color: var(--text-secondary) !important;
          padding: 12px 20px !important;
        }
        .ant-tabs-tab:hover {
          color: var(--text-primary) !important;
        }
        .ant-tabs-tab-active {
          color: var(--text-primary) !important;
        }
        .ant-tabs-ink-bar {
          background: var(--accent-color) !important;
        }
        .ant-tabs-nav {
          margin-bottom: 0 !important;
        }
        .ant-tabs-nav-wrap {
          overflow-x: auto !important;
          overflow-y: hidden !important;
        }
        .ant-tabs-nav-wrap::-webkit-scrollbar {
          height: 4px;
        }
        .ant-tabs-nav-wrap::-webkit-scrollbar-track {
          background: transparent;
        }
        .ant-tabs-nav-wrap::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
        }
        .ant-tabs-nav-wrap::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
};

export default Category;

