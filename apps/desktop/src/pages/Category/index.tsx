import type { Album } from "@soundx/db";
import { useInfiniteScroll } from "ahooks";
import { Col, Row, Tabs } from "antd";
import React, { useRef, useState } from "react";
import Cover from "../../components/Cover/index";
import styles from "./index.module.less";

interface CategoryTab {
  value: number;
  label: string;
}

const categoryTabs: CategoryTab[] = [
  { value: 1, label: "全部" },
  { value: 2, label: "流行" },
  { value: 3, label: "摇滚" },
  { value: 4, label: "电子" },
  { value: 5, label: "古典" },
  { value: 6, label: "爵士" },
  { value: 7, label: "嘻哈" },
  { value: 8, label: "民谣" },
  { value: 9, label: "R&B" },
  { value: 10, label: "乡村" },
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
      year: "2023",
    });
  }

  return albums;
};

interface Result {
  list: Album[];
  hasMore: boolean;
}

const Category: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("1");
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

  const { data, loading, loadingMore } = useInfiniteScroll(loadMoreAlbums, {
    target: scrollRef,
    isNoMore: (d) => !d?.hasMore,
  });

  const tabItems = categoryTabs.map((tab) => ({
    key: String(tab.value),
    label: tab.label,
  }));

  return (
    <div className={styles.container}>
      {/* Tabs */}
      <div>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          tabBarStyle={{
            marginBottom: "30px",
            borderBottom: "none",
          }}
        />
      </div>

      {/* Cover Grid with Infinite Scroll */}
      <div ref={scrollRef} className={styles.grid}>
        <Row gutter={[24, 24]}>
          {data?.list?.map((item) => (
            <Col key={item.id}>
              <Cover item={item} />
            </Col>
          ))}
          {(loading || loadingMore) && (
            <>
              {Array.from({ length: 8 }).map((_, index) => (
                <Col key={`skeleton-${index}`}>
                  <Cover.Skeleton />
                </Col>
              ))}
            </>
          )}
        </Row>
        {data && !data.hasMore && data.list.length > 0 && (
          <div className={styles.noMore}>没有更多了</div>
        )}
      </div>
    </div>
  );
};

export default Category;
