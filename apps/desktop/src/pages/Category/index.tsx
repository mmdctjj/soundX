import { useInfiniteScroll } from "ahooks";
import { Col, Row, theme } from "antd";
import React, { useEffect, useRef } from "react";
import Cover from "../../components/Cover/index";
import type { Album } from "../../models";
import { loadMoreAlbum } from "../../services/album";
import { usePlayMode } from "../../utils/playMode";
import styles from "./index.module.less";

interface Result {
  list: Album[];
  hasMore: boolean;
  total: number;
  loadCount: number;
}

const Category: React.FC = () => {
  // const [activeTab, setActiveTab] = useState<string>("1");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { mode } = usePlayMode();
  const { token } = theme.useToken();

  const loadMoreAlbums = async (d: Result | undefined): Promise<Result> => {
    const pageSize = 12;
    const loadCount = d?.loadCount || d?.loadCount === 0 ? d?.loadCount + 1 : 0; // 当前已经加载的页数
    try {
      const res = await loadMoreAlbum({
        pageSize,
        loadCount: loadCount, // 使用 nextPage，不用试图从已有数据推算
        type: mode,
      });

      if (res.code === 200 && res.data) {
        const { list, total } = res.data;
        return {
          list,
          hasMore: (d?.list?.length || 0) < Number(total),
          total,
          loadCount: res?.data?.loadCount, // 关键：正确更新 loadCount
        };
      }
    } catch (err) {}

    return { list: [], hasMore: false, total: 0, loadCount: 0 };
  };

  const { data, loading, loadingMore, reload } = useInfiniteScroll(
    loadMoreAlbums,
    {
      target: scrollRef,
      isNoMore: (d) => !d?.hasMore,
      reloadDeps: [mode],
      direction: "bottom",
      threshold: 100,
      manual: true,
    }
  );

  useEffect(() => {
    let timeId = setTimeout(() => {
      reload();
    });
    return () => clearTimeout(timeId);
  }, []);

  // const tabItems = categoryTabs.map((tab) => ({
  //   key: String(tab.value),
  //   label: tab.label,
  // }));

  return (
    <div className={styles.container} ref={scrollRef}>
      {/* Tabs */}
      <div>
        {/* <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          tabBarStyle={{
            marginBottom: "30px",
            borderBottom: "none",
          }}
        /> */}
      </div>

      {/* Cover Grid with Infinite Scroll */}
      <div className={styles.grid}>
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
          <div
            className={styles.noMore}
            style={{ color: token.colorTextSecondary }}
          >
            没有更多了
          </div>
        )}
      </div>
    </div>
  );
};

export default Category;
