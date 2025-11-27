import {
  CaretRightOutlined,
  CheckCircleFilled,
  CloudDownloadOutlined,
  HeartOutlined,
  MoreOutlined,
  SearchOutlined,
  ShareAltOutlined,
  SortAscendingOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Col,
  Row,
  Spin,
  Table,
  Typography,
  message,
  theme,
} from "antd";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Album } from "../../models";
import { getAlbumById, getAlbumTracks } from "../../services/album";
import styles from "./index.module.less";

const { Title, Text } = Typography;

const Detail: React.FC = () => {
  const { token } = theme.useToken();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    console.log("id", id);
    if (id) {
      fetchAlbumDetails(Number(id));
      fetchTracks(Number(id), 0);
    }
  }, [id]);

  const fetchAlbumDetails = async (albumId: number) => {
    try {
      console.log("albumId", albumId);
      const res = await getAlbumById(albumId);
      if (res.code === 200) {
        setAlbum(res.data);
      } else {
        message.error(res.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTracks = async (albumId: number, currentPage: number) => {
    console.log("albumId", albumId);
    if (loading) return;
    setLoading(true);
    try {
      const res = await getAlbumTracks(
        albumId,
        pageSize,
        currentPage * pageSize
      );
      if (res.code === 200) {
        const newTracks = res.data.list;
        setTracks((prev) =>
          currentPage === 0 ? newTracks : [...prev, ...newTracks]
        );
        setHasMore(tracks.length + newTracks.length < res.data.total);
        setPage(currentPage + 1);
      } else {
        message.error(res.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (
      target.scrollTop + target.offsetHeight === target.scrollHeight &&
      hasMore &&
      !loading &&
      id
    ) {
      fetchTracks(Number(id), page);
    }
  };

  const columns = [
    {
      title: "#",
      dataIndex: "index",
      key: "index",
      width: 50,
      render: (_: any, __: any, index: number) => (
        <Text type="secondary">{index + 1}</Text>
      ),
    },
    {
      title: "Title",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Duration",
      dataIndex: "duration",
      key: "duration",
      width: 100,
      render: (duration: number) => (
        <Text type="secondary">
          {duration
            ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")}`
            : "-"}
        </Text>
      ),
    },
    {
      title: "",
      key: "action",
      width: 50,
      render: () => (
        <MoreOutlined
          style={{
            cursor: "pointer",
            fontSize: "18px",
            opacity: 0.7,
          }}
        />
      ),
    },
  ];

  if (!album && !loading) {
    return <div className={styles.detailContainer}>Loading...</div>;
  }

  return (
    <div
      className={styles.detailContainer}
      onScroll={handleScroll}
      style={{ overflowY: "auto", height: "100%" }}
    >
      {/* Header Banner */}
      <div
        className={styles.banner}
        style={{
          backgroundImage: `url(${album?.cover ? `http://localhost:3000${album.cover}` : "https://picsum.photos/seed/podcast/1200/400"})`,
        }}
      >
        <div className={styles.bannerOverlay}></div>

        <div className={styles.bannerContent}>
          <div>
            <div className={styles.titleGroup}>
              <Title level={1} style={{ color: "white", margin: 0 }}>
                {album?.name || "Unknown Album"}
              </Title>
              <CheckCircleFilled
                style={{ color: "#1890ff", fontSize: "24px" }}
              />
            </div>
            <span className={styles.statsText}>
              {album?.year || "Unknown Year"}
            </span>
          </div>

          <div className={styles.userInfo}>
            <Avatar
              size={50}
              src={
                album?.cover
                  ? `http://localhost:3000${album.cover}`
                  : "https://api.dicebear.com/7.x/avataaars/svg?seed=Ken"
              }
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <Text
                style={{ color: "white", fontWeight: 600, fontSize: "16px" }}
              >
                {album?.artist || "Unknown Artist"}
              </Text>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.contentPadding} style={{ color: token.colorText }}>
        <Row gutter={40}>
          {/* Main Content */}
          <Col span={24}>
            {/* Controls */}
            <div className={styles.controlsRow}>
              <div className={styles.mainControls}>
                <div
                  className={styles.playButton}
                  style={{ backgroundColor: token.colorPrimary }}
                >
                  <CaretRightOutlined
                    style={{ color: "white", fontSize: "30px" }}
                  />
                </div>
                <div className={styles.actionGroup}>
                  <HeartOutlined className={styles.actionIcon} />
                  <ShareAltOutlined className={styles.actionIcon} />
                  <CloudDownloadOutlined className={styles.actionIcon} />
                </div>
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "15px" }}
              >
                <SearchOutlined
                  className={styles.actionIcon}
                  style={{ fontSize: "18px" }}
                />
                <SortAscendingOutlined
                  className={styles.actionIcon}
                  style={{ fontSize: "18px" }}
                />
              </div>
            </div>

            {/* Track List */}
            <Table
              dataSource={tracks}
              columns={columns}
              pagination={false}
              rowKey="id"
              loading={loading}
              rowClassName="episode-row"
              onRow={() => ({
                style: { cursor: "pointer" },
              })}
            />
            {loading && (
              <div style={{ textAlign: "center", padding: "10px" }}>
                <Spin />
              </div>
            )}
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Detail;
