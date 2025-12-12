import { PauseCircleFilled, PlayCircleFilled } from "@ant-design/icons";
import {
  Avatar,
  Col,
  Empty,
  Flex,
  Row,
  Skeleton,
  Table,
  Typography,
} from "antd";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Cover from "../../components/Cover";
import { getCoverUrl } from "../../components/Detail";
import { useMessage } from "../../context/MessageContext";
import { getBaseURL } from "../../https";
import { type Album, type Artist, type Track, TrackType } from "../../models";
import { getAlbumsByArtist } from "../../services/album";
import { getArtistById } from "../../services/artist";
import { getTracksByArtist } from "../../services/track";
import { usePlayerStore } from "../../store/player";
import { formatDuration } from "../../utils/formatDuration";
import styles from "./index.module.less";

const { Title, Text } = Typography;

const ArtistDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const message = useMessage();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const { play, setPlaylist, currentTrack } = usePlayerStore();

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const artistRes = await getArtistById(parseInt(id));
        if (artistRes.code === 200 && artistRes.data) {
          setArtist(artistRes.data);
          // Fetch albums using artist name
          const albumsRes = await getAlbumsByArtist(artistRes.data.name);
          if (albumsRes.code === 200 && albumsRes.data) {
            setAlbums(albumsRes.data);
          }
          // Fetch tracks using artist name
          const tracksRes = await getTracksByArtist(artistRes.data.name);
          if (tracksRes.code === 200 && tracksRes.data) {
            setTracks(tracksRes.data);
          }
        } else {
          message.error("Failed to load artist details");
        }
      } catch (error) {
        console.error("Error fetching artist details:", error);
        message.error("Error fetching artist details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handlePlayTrack = (track: Track) => {
    setPlaylist(tracks);
    const shouldResume =
      track.type === TrackType.AUDIOBOOK &&
      track.progress &&
      track.progress > 0;
    play(track, undefined, shouldResume ? track.progress : 0);
  };

  if (loading) {
    return (
      <Flex vertical gap={24} className={styles.container}>
        <Flex vertical align="center" gap={34}>
          <Skeleton.Avatar active size={200} />
          <Skeleton.Input active />
        </Flex>
        <Skeleton.Input active />
        <Flex gap={24}>
          <Flex vertical gap={24}>
            <Skeleton.Node style={{ width: 200, height: 200 }} active />
            <Skeleton.Input active />
            <Skeleton.Input active />
          </Flex>
          <Flex vertical gap={24}>
            <Skeleton.Node style={{ width: 200, height: 200 }} active />
            <Skeleton.Input active />
            <Skeleton.Input active />
          </Flex>
          <Flex vertical gap={24}>
            <Skeleton.Node style={{ width: 200, height: 200 }} active />
            <Skeleton.Input active />
            <Skeleton.Input active />
          </Flex>
          <Flex vertical gap={24}>
            <Skeleton.Node style={{ width: 200, height: 200 }} active />
            <Skeleton.Input active />
            <Skeleton.Input active />
          </Flex>
        </Flex>
      </Flex>
    );
  }

  if (!artist) {
    return (
      <div className={styles.container}>
        <Empty description="Artist not found" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Avatar
          src={
            artist.avatar
              ? `${getBaseURL()}${artist.avatar}`
              : `https://picsum.photos/seed/${artist.id}/300/300`
          }
          size={200}
          shape="circle"
          className={styles.avatar}
          icon={!artist.avatar && artist.name[0]}
        />
        <Title level={2} className={styles.artistName}>
          {artist.name}
        </Title>
      </div>

      <div className={styles.content}>
        <Title level={4} className={styles.sectionTitle}>
          所有专辑 ({albums.length})
        </Title>
        <Row gutter={[24, 24]}>
          {albums.map((album) => (
            <Col key={album.id}>
              <Cover item={album} />
            </Col>
          ))}
        </Row>
        {albums.length === 0 && <Empty description="暂无专辑" />}
      </div>

      <div style={{ marginTop: "48px" }}>
        <Title level={4} className={styles.sectionTitle}>
          所有单曲 ({tracks.length})
        </Title>
        <Table
          columns={[
            {
              title: "#",
              key: "index",
              width: 80,
              render: (_: number, __: Track, idx: number) => {
                return <Text>{idx + 1}</Text>;
              },
            },
            {
              title: "封面",
              key: "cover",
              width: 80,
              render: (_: number, record: Track) => {
                return (
                  <div
                    style={{ position: "relative" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayTrack(record);
                    }}
                  >
                    <img
                      src={getCoverUrl(record.cover)}
                      alt={record.name}
                      style={{
                        width: "30px",
                        height: "30px",
                        objectFit: "cover",
                      }}
                    />
                    {currentTrack?.id === record.id ? (
                      <PauseCircleFilled className={styles.listPlayIcon} />
                    ) : (
                      <PlayCircleFilled className={styles.listPlayIcon} />
                    )}
                  </div>
                );
              },
            },
            {
              title: "标题",
              dataIndex: "name",
              key: "name",
              ellipsis: true,
            },
            ...(artist?.type === TrackType.AUDIOBOOK
              ? [
                  {
                    title: "进度",
                    dataIndex: "progress",
                    key: "progress",
                    width: 100,
                    render: (progress: number | undefined, record: Track) => {
                      if (!progress) return <Text type="secondary">-</Text>;
                      const percentage =
                        record.duration && record.duration > 0
                          ? Math.round((progress / record.duration) * 100)
                          : 0;
                      return (
                        <Text type="secondary" style={{ fontSize: "10px" }}>
                          {percentage}%
                        </Text>
                      );
                    },
                  } as unknown as any,
                ]
              : []),
            {
              title: "时长",
              dataIndex: "duration",
              key: "duration",
              width: 100,
              render: (duration: number) => (
                <Text type="secondary">{formatDuration(duration)}</Text>
              ),
            },
          ]}
          dataSource={tracks}
          pagination={false}
          onRow={(record) => ({
            onClick: () => handlePlayTrack(record),
            style: { cursor: "pointer" },
          })}
          rowClassName={(record) =>
            currentTrack?.id === record.id ? styles.listCover : styles.listCover
          }
        />
      </div>
    </div>
  );
};

export default ArtistDetail;
