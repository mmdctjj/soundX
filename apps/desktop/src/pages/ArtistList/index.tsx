import { useInfiniteScroll } from "ahooks";
import { Avatar, Col, Empty, Flex, Row, Skeleton, Typography } from "antd";
import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { type Artist } from "../../models";
import { getArtistList } from "../../services/artist";
import { usePlayMode } from "../../utils/playMode";
import styles from "./index.module.less";

const { Text } = Typography;

interface Result {
  list: Artist[];
  hasMore: boolean;
  total: number;
}

const ArtistList: React.FC = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { mode } = usePlayMode();

  const loadMoreArtists = async (d: Result | undefined): Promise<Result> => {
    const current = d ? Math.ceil(d.list.length / 20) + 1 : 0;
    const pageSize = 20;

    try {
      // TODO: Update getArtistList to support pagination and type filtering
      // For now, we might need to fetch all or use existing API
      // Assuming we will update the service to support these params
      const res = await getArtistList(pageSize, current, mode);

      if (res.code === 200 && res.data) {
        const { list, total } = res.data;
        const newList = d ? [...d.list, ...list] : list;
        return {
          list: newList as any,
          hasMore: newList.length < total,
          total,
        };
      }
    } catch (error) {
      console.error("Failed to fetch artists:", error);
    }

    return {
      list: d?.list || [],
      hasMore: false,
      total: d?.total || 0,
    };
  };

  const { data, loading, loadingMore } = useInfiniteScroll(loadMoreArtists, {
    target: scrollRef,
    isNoMore: (d) => !d?.hasMore,
  });

  return (
    <div ref={scrollRef} className={styles.container}>
      <div className={styles.content}>
        <Row gutter={[24, 24]}>
          {data?.list.map((artist) => (
            <Col key={artist.id}>
              <Flex
                vertical
                align="center"
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/artist/${artist.id}`)}
              >
                <div className={styles.coverContainer}>
                  <Avatar
                    src={
                      artist.avatar
                        ? `http://localhost:3000${artist.avatar}`
                        : `https://picsum.photos/seed/${artist.id}/300/300`
                    }
                    size={120}
                    shape="circle"
                    className={styles.avatar}
                    icon={!artist.avatar && artist.name[0]}
                  />
                </div>
                <Flex vertical>
                  <Text strong className={styles.artistName}>
                    {artist.name}
                  </Text>
                </Flex>
              </Flex>
            </Col>
          ))}
        </Row>

        {(loading || loadingMore) && (
          <Row gutter={[24, 24]}>
            {Array.from({ length: 6 }).map((_, index) => (
              <Col
                key={`skeleton-${index}`}
                xs={12}
                sm={8}
                md={6}
                lg={4}
                xl={4}
              >
                <Flex vertical align="center">
                  <Skeleton.Avatar active size={120} shape="circle" />
                  <Skeleton.Input active />
                </Flex>
              </Col>
            ))}
          </Row>
        )}

        {data && !data.hasMore && data.list.length > 0 && (
          <div className={styles.noMore}>没有更多了</div>
        )}

        {!loading && !loadingMore && (!data || data.list.length === 0) && (
          <Empty description="暂无艺术家" />
        )}
      </div>
    </div>
  );
};

export default ArtistList;
