import {
    AppstoreOutlined,
    SyncOutlined,
    UnorderedListOutlined,
} from "@ant-design/icons";
import { getAlbumHistory, getTrackHistory } from "@soundx/services";
import { useInfiniteScroll } from "ahooks";
import {
    Button,
    Col,
    Empty,
    Flex,
    Row,
    Segmented,
    Skeleton,
    Timeline,
    Typography,
    theme,
} from "antd";
import React, { useRef, useState } from "react";
import Cover from "../../components/Cover/index";
import TrackList from "../../components/TrackList";
import type { Album, TimelineItem, Track } from "../../models";
import { useAuthStore } from "../../store/auth";
import { usePlayerStore } from "../../store/player";
import { usePlayMode } from "../../utils/playMode";
import { useTranslation } from "react-i18next";
import { formatTimeLabel } from "../../utils/timeFormat";
import styles from "./index.module.less";

const { Title } = Typography;

interface Result {
  list: TimelineItem[];
  hasMore: boolean;
  nextId?: number;
}

const Listened: React.FC = () => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"album" | "track">("album");
  const { token } = theme.useToken();
  const { play, setPlaylist } = usePlayerStore();
  const { user } = useAuthStore();

  const { mode } = usePlayMode();
  const type = mode;

  const loadMoreListened = async (d: Result | undefined): Promise<Result> => {
    const currentLoadCount = d?.nextId || 0;

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
          user?.id || 0,
          currentLoadCount,
          20
        );

        if (response.code === 200 && response.data) {
          const { list } = response.data;

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

          return {
            list: newItems,
            hasMore: list.length === 20,
            nextId: currentLoadCount + 1,
          };
        }
      } else {
        // Track mode
        const res = await getTrackHistory(user?.id || 0, currentLoadCount, 20);
        if (res.code === 200 && res.data) {
          const { list, total: _total } = res.data;

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
            nextId: currentLoadCount + 1,
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
      reloadDeps: [viewMode, type],
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
          {viewMode === "album" ? (
            <Row gutter={[24, 24]}>
              {item.items.map((album) => (
                <Col key={album.id}>
                  <Cover item={album as Album} isHistory={true} />
                </Col>
              ))}
            </Row>
          ) : (
            <TrackList
              tracks={item.items as Track[]}
              showIndex={false}
              showCover={false} // Original 'play' column replaced cover? No, original first column was play icon, no cover displayed? Original code had "play" column with icon. No cover column.
              // Wait, previous code Step 1274 columns:
              // 1. Play icon width 50
              // 2. Title
              // 3. Artist
              // 4. Album
              // 5. Duration
              // It DID NOT show cover.
              // I will set showCover={false} to match.
              // But TrackList shows Play icon over cover if showCover=true.
              // If showCover=false, TrackList doesn't play on row click? Yes it does: onRow click handlePlayTrack.
              // I should probably Keep showCover={true} for aesthetics?
              // User said "Based on Album Detail list". Album Detail HAS cover.
              // So I will enable cover. It looks better.
              showArtist={true}
              showAlbum={true}
              onPlay={(track, tracks) => {
                setPlaylist(tracks);
                play(track, -1);
              }}
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
                { value: "album", icon: <AppstoreOutlined />, label: t("listened.album") },
                {
                  value: "track",
                  icon: <UnorderedListOutlined />,
                  label: t("listened.songs"),
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
        <div
          className={styles.noMore}
          style={{ color: token.colorTextSecondary }}
        >
          没有更多了
        </div>
      )}

      {data?.list.length === 0 && !loading && (
        <div className={styles.noData}>
          <Empty description={t("listened.noListened")} />
        </div>
      )}
    </div>
  );
};

export default Listened;
