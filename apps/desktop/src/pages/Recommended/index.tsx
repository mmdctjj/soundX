import { SyncOutlined } from "@ant-design/icons";
import { Button, Typography } from "antd";
import React, { useEffect, useState } from "react";
import Cover from "../../components/Cover/index";
import { getRecommendedSections } from "../../services/recommended";
import { cacheUtils } from "../../utils/cache";
import styles from "./index.module.less";

const { Title } = Typography;

const CACHE_KEY = "recommended_sections";

interface RecommendedSection {
  id: string;
  title: string;
  items: any[];
}

const Recommended: React.FC = () => {
  const [sections, setSections] = useState<RecommendedSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async (forceRefresh = false) => {
    try {
      setLoading(true);

      // Try to get from cache first
      if (!forceRefresh) {
        const cached = cacheUtils.get<RecommendedSection[]>(CACHE_KEY);
        if (cached) {
          setSections(cached);
          setLoading(false);
          return;
        }
      }

      // Fetch from API
      const data = await getRecommendedSections();
      setSections(data);

      // Save to cache
      cacheUtils.set(CACHE_KEY, data);
    } catch (error) {
      console.error("Failed to load recommended sections:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshSection = async (sectionId: string) => {
    try {
      setRefreshing(sectionId);
      // Force refresh from API
      await loadSections(true);
    } catch (error) {
      console.error("Failed to refresh section:", error);
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
                {sectionIndex === 1 ? "New Releases" : "Top Charts"}
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
