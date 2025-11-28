import { type Album, type Artist } from "@soundx/db";
import {
  Avatar,
  Col,
  Empty,
  Flex,
  Row,
  Skeleton,
  Typography,
  message,
} from "antd";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Cover from "../../components/Cover";
import { getAlbumsByArtist } from "../../services/album";
import { getArtistById } from "../../services/artist";
import styles from "./index.module.less";

const { Title } = Typography;

const ArtistDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

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
              ? `http://localhost:3000${artist.avatar}`
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
          专辑 ({albums.length})
        </Title>
        <Row gutter={[24, 24]}>
          {albums.map((album) => (
            <Col key={album.id} xs={12} sm={8} md={6} lg={4} xl={4}>
              <Cover item={album} />
            </Col>
          ))}
        </Row>
        {albums.length === 0 && <Empty description="暂无专辑" />}
      </div>
    </div>
  );
};

export default ArtistDetail;
