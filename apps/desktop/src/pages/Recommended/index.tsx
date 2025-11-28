import { SyncOutlined } from "@ant-design/icons";
import type { Album, Artist, Track } from "@soundx/db";
import { Avatar, Button, Col, Row, Typography } from "antd";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Cover from "../../components/Cover/index";
import { getRecentAlbums, getRecommendedAlbums } from "../../services/album";
import { getLatestArtists } from "../../services/artist";
import { getLatestTracks } from "../../services/track";
import { cacheUtils } from "../../utils/cache";
import styles from "./index.module.less";

const { Title } = Typography;

const CACHE_KEY_RECOMMENDED = "recommended_albums";
const CACHE_KEY_RECENT = "recent_albums";
const CACHE_KEY_ARTISTS = "latest_artists";
const CACHE_KEY_TRACKS = "latest_tracks";

interface RecommendedSection {
  id: string;
  title: string;
  items: (Album | Artist | Track)[];
  type: "album" | "artist" | "track";
}

const Recommended: React.FC = () => {
  const navigate = useNavigate();
  const [sections, setSections] = useState<RecommendedSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  // Get current play mode from localStorage
  const [playMode, setPlayMode] = useState<"music" | "audiobook">(() => {
    return (
      (localStorage.getItem("playMode") as "music" | "audiobook") || "music"
    );
  });

  // Listen for playMode changes
  useEffect(() => {
    const handleStorageChange = () => {
      const newMode =
        (localStorage.getItem("playMode") as "music" | "audiobook") || "music";
      if (newMode !== playMode) {
        setPlayMode(newMode);
        loadSections(true); // Reload data when mode changes
      }
    };

    window.addEventListener("storage", handleStorageChange);
    // Also check periodically in case localStorage changed in same window
    const interval = setInterval(handleStorageChange, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [playMode]);

  // Load initial data
  useEffect(() => {
    loadSections();
  }, []);

  const getCacheKey = (base: string) => `${base}_${playMode}`;

  const loadSections = async (forceRefresh = false) => {
    try {
      setLoading(true);

      let recommendedAlbums: Album[] = [];
      let recentAlbums: Album[] = [];
      let latestArtists: Artist[] = [];
      let latestTracks: Track[] = [];

      // Try to get from cache first
      if (!forceRefresh) {
        const cachedRecommended = cacheUtils.get<Album[]>(
          getCacheKey(CACHE_KEY_RECOMMENDED)
        );
        const cachedRecent = cacheUtils.get<Album[]>(
          getCacheKey(CACHE_KEY_RECENT)
        );
        const cachedArtists = cacheUtils.get<Artist[]>(
          getCacheKey(CACHE_KEY_ARTISTS)
        );
        const cachedTracks = cacheUtils.get<Track[]>(
          getCacheKey(CACHE_KEY_TRACKS)
        );

        if (cachedRecommended && cachedRecent && cachedArtists) {
          recommendedAlbums = cachedRecommended;
          recentAlbums = cachedRecent;
          latestArtists = cachedArtists;
          if (playMode === "music" && cachedTracks) {
            latestTracks = cachedTracks;
          }

          const newSections: RecommendedSection[] = [
            {
              id: "recommended",
              title: "为你推荐",
              items: recommendedAlbums,
              type: "album",
            },
            {
              id: "recent",
              title: "最近上新",
              items: recentAlbums,
              type: "album",
            },
            {
              id: "artists",
              title: "艺术家",
              items: latestArtists,
              type: "artist",
            },
          ];

          if (playMode === "music") {
            newSections.push({
              id: "tracks",
              title: "上新单曲",
              items: latestTracks,
              type: "track",
            });
          }

          setSections(newSections);
          setLoading(false);
          return;
        }
      }

      // Fetch from API with type parameter
      const type = playMode === "music" ? "MUSIC" : "AUDIOBOOK";
      const promises: Promise<any>[] = [
        getRecommendedAlbums(type),
        getRecentAlbums(type),
        getLatestArtists(type),
      ];

      if (playMode === "music") {
        promises.push(getLatestTracks("MUSIC"));
      }

      const results = await Promise.all(promises);
      const recommendedRes = results[0];
      const recentRes = results[1];
      const artistsRes = results[2];
      const tracksRes = playMode === "music" ? results[3] : null;

      recommendedAlbums = recommendedRes.data || [];
      recentAlbums = recentRes.data || [];
      latestArtists = artistsRes.data || [];
      latestTracks = tracksRes?.data || [];

      const newSections: RecommendedSection[] = [
        {
          id: "recommended",
          title: "为你推荐",
          items: recommendedAlbums,
          type: "album",
        },
        { id: "recent", title: "最近上新", items: recentAlbums, type: "album" },
        {
          id: "artists",
          title: "艺术家",
          items: latestArtists,
          type: "artist",
        },
      ];

      if (playMode === "music") {
        newSections.push({
          id: "tracks",
          title: "上新单曲",
          items: latestTracks,
          type: "track",
        });
      }

      setSections(newSections);

      // Save to cache with type-specific keys
      cacheUtils.set(getCacheKey(CACHE_KEY_RECOMMENDED), recommendedAlbums);
      cacheUtils.set(getCacheKey(CACHE_KEY_RECENT), recentAlbums);
      cacheUtils.set(getCacheKey(CACHE_KEY_ARTISTS), latestArtists);
      if (playMode === "music") {
        cacheUtils.set(getCacheKey(CACHE_KEY_TRACKS), latestTracks);
      }
    } catch (error) {
      console.error("Failed to load recommended sections:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshSection = async (sectionId: string) => {
    try {
      setRefreshing(sectionId);

      const type = playMode === "music" ? "MUSIC" : "AUDIOBOOK";

      if (sectionId === "recommended") {
        const res = await getRecommendedAlbums(type);
        const data = res.data || [];
        updateSection(sectionId, data);
        cacheUtils.set(getCacheKey(CACHE_KEY_RECOMMENDED), data);
      } else if (sectionId === "recent") {
        const res = await getRecentAlbums(type);
        const data = res.data || [];
        updateSection(sectionId, data);
        cacheUtils.set(getCacheKey(CACHE_KEY_RECENT), data);
      } else if (sectionId === "artists") {
        const res = await getLatestArtists(type);
        const data = res.data || [];
        updateSection(sectionId, data);
        cacheUtils.set(getCacheKey(CACHE_KEY_ARTISTS), data);
      } else if (sectionId === "tracks") {
        const res = await getLatestTracks("MUSIC");
        const data = res.data || [];
        updateSection(sectionId, data);
        cacheUtils.set(getCacheKey(CACHE_KEY_TRACKS), data);
      }
    } catch (error) {
      console.error(`Failed to refresh ${sectionId} section:`, error);
    } finally {
      setRefreshing(null);
    }
  };

  const updateSection = (sectionId: string, items: any[]) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, items } : section
      )
    );
  };

  const handleArtistClick = (artistId: number) => {
    navigate(`/artist/${artistId}`);
  };

  // Show skeleton loading on initial load
  if (loading) {
    return (
      <div className={styles.container}>
        {[1, 2, 3].map((sectionIndex) => (
          <div key={sectionIndex} className={styles.section}>
            <div className={styles.sectionHeader}>
              <Title level={3} className={styles.sectionTitle}>
                加载中...
              </Title>
            </div>
            <div className={styles.grid}>
              {Array.from({ length: 8 }).map((_, index) => (
                <Cover.Skeleton key={`skeleton-${sectionIndex}-${index}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {sections.map((section) => (
        <div key={section.id} className={styles.section}>
          <div className={styles.sectionHeader}>
            <Title level={3} className={styles.sectionTitle}>
              {section.title}
            </Title>
            <Button
              type="text"
              className={styles.refreshButton}
              onClick={() => refreshSection(section.id)}
              loading={refreshing === section.id}
            >
              换一批 <SyncOutlined spin={refreshing === section.id} />
            </Button>
          </div>

          <Row gutter={[24, 24]}>
            {section.items.map((item: any) => (
              <Col key={item.id}>
                {section.type === "artist" ? (
                  <div
                    className={styles.artistCard}
                    onClick={() => handleArtistClick(item.id)}
                    style={{ cursor: "pointer", textAlign: "center" }}
                  >
                    <Avatar
                      src={
                        item.avatar
                          ? `http://localhost:3000${item.avatar}`
                          : `https://picsum.photos/seed/${item.id}/200/200`
                      }
                      size={120}
                      icon={!item.avatar && item.name[0]}
                    />
                    <div style={{ marginTop: 8, fontWeight: 500 }}>
                      {item.name}
                    </div>
                  </div>
                ) : (
                  <Cover item={item} />
                )}
              </Col>
            ))}
          </Row>
        </div>
      ))}
    </div>
  );
};

export default Recommended;
