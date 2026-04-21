import { Spin, theme, Typography, Button } from "antd";
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getMvById, getMvByTrackId } from "@soundx/services";
import type { Mv } from "@soundx/services";
import styles from "./index.module.less";
import { usePlayerStore } from "../../store/player";
import { resolveArtworkUri } from "../../services/trackResolver";
import { getBaseURL } from "../../https";

const { Title, Text } = Typography;

const MvDetail: React.FC = () => {
  const { token } = theme.useToken();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const trackId = queryParams.get('trackId');
  
  const [mv, setMv] = useState<Mv | null>(null);
  const [loading, setLoading] = useState(true);
  const { pause } = usePlayerStore();

  useEffect(() => {
    // Pause audio player when opening an MV
    pause();
    
    const loadData = async () => {
      setLoading(true);
      try {
        let res;
        if (trackId) {
          res = await getMvByTrackId(Number(trackId));
        } else if (id) {
          res = await getMvById(Number(id));
        }
        
        if (res) {
          setMv(res);
        } else {
          // fallback or handle error
        }
      } catch (error) {
        console.error("Failed to load mv detail", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, trackId]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    );
  }

  if (!mv) {
    return (
      <div className={styles.errorContainer} style={{ color: token.colorText }}>
        <Title level={4}>MV Not Found</Title>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const videoUrl = mv.path?.startsWith('http') ? mv.path : `${getBaseURL()}${mv.path}`;

  return (
    <div className={styles.container}>
      <div className={styles.videoWrapper}>
        <video 
          className={styles.video} 
          src={videoUrl} 
          controls 
          autoPlay 
          poster={resolveArtworkUri(mv as any)}
        />
      </div>

      <div className={styles.info}>
        <Title level={3} style={{ margin: '0 0 8px 0', color: token.colorText }}>
          {mv.name}
        </Title>
        {mv.artist && (
          <Text style={{ color: token.colorTextSecondary, fontSize: 16 }}>
            {mv.artist}
          </Text>
        )}
      </div>
    </div>
  );
};

export default MvDetail;
