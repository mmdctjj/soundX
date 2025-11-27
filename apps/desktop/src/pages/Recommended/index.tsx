import { SyncOutlined } from "@ant-design/icons";
import type { Album } from "@soundx/db";
import { Button, Typography } from "antd";
import React, { useEffect, useState } from "react";
import Cover from "../../components/Cover/index";
import { getRecentAlbums, getRecommendedAlbums } from "../../services/album";
import { cacheUtils } from "../../utils/cache";
import styles from "./index.module.less";

const { Title } = Typography;

const CACHE_KEY_RECOMMENDED = "recommended_albums";
const CACHE_KEY_RECENT = "recent_albums";

interface RecommendedSection {
  id: string;
  title: string;
  items: Album[];
}

const Recommended: React.FC = () => {
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

      // Try to get from cache first
      if (!forceRefresh) {
        const cachedRecommended = cacheUtils.get<Album[]>(
          getCacheKey(CACHE_KEY_RECOMMENDED)
        );
        const cachedRecent = cacheUtils.get<Album[]>(
          getCacheKey(CACHE_KEY_RECENT)
        );

        if (cachedRecommended && cachedRecent) {
          recommendedAlbums = cachedRecommended;
          recentAlbums = cachedRecent;
          setSections([
            { id: "recommended", title: "为你推荐", items: recommendedAlbums },
            { id: "recent", title: "最近上新", items: recentAlbums },
          ]);
          setLoading(false);
          return;
        }
      }

      // Fetch from API with type parameter
      const type = playMode === "music" ? "MUSIC" : "AUDIOBOOK";
      const [recommendedRes, recentRes] = await Promise.all([
        getRecommendedAlbums(type),
        getRecentAlbums(type),
      ]);

      recommendedAlbums = recommendedRes.data || [];
      recentAlbums = recentRes.data || [];

      setSections([
        { id: "recommended", title: "为你推荐", items: recommendedAlbums },
        { id: "recent", title: "最近上新", items: recentAlbums },
      ]);

      // Save to cache with type-specific keys
      cacheUtils.set(getCacheKey(CACHE_KEY_RECOMMENDED), recommendedAlbums);
      cacheUtils.set(getCacheKey(CACHE_KEY_RECENT), recentAlbums);
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

      // Refresh only the specific section
      if (sectionId === "recommended") {
        const res = await getRecommendedAlbums(type);
        const recommendedAlbums = res.data || [];

        // Update only the recommended section
        setSections((prev) =>
          prev.map((section) =>
            section.id === "recommended"
              ? { ...section, items: recommendedAlbums }
              : section
          )
        );

        // Update cache
        cacheUtils.set(getCacheKey(CACHE_KEY_RECOMMENDED), recommendedAlbums);
      } else if (sectionId === "recent") {
        const res = await getRecentAlbums(type);
        const recentAlbums = res.data || [];

        // Update only the recent section
        setSections((prev) =>
          prev.map((section) =>
            section.id === "recent"
              ? { ...section, items: recentAlbums }
              : section
          )
        );

        // Update cache
        cacheUtils.set(getCacheKey(CACHE_KEY_RECENT), recentAlbums);
      }
    } catch (error) {
      console.error(`Failed to refresh ${sectionId} section:`, error);
    } finally {
      setRefreshing(null);
    }
  };

  // Show skeleton loading on initial load
  if (loading) {
    return (
      <div className={styles.container}>
        {[1, 2].map((sectionIndex) => (
          <div key={sectionIndex} className={styles.section}>
            <div className={styles.sectionHeader}>
              <Title level={3} className={styles.sectionTitle}>
                {sectionIndex === 1 ? "为你推荐" : "最近上新"}
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

          <div className={styles.grid}>
            {section.items.map((item) => (
              <Cover key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Recommended;
