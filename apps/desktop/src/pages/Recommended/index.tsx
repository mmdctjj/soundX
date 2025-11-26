import { SyncOutlined } from "@ant-design/icons";
import { Button, Skeleton, Typography } from "antd";
import React, { useEffect, useState } from "react";
import Cover from "../../components/Cover/index";
import { getRecommendedSections } from "../../services/recommended";
import styles from "./index.module.less";

const { Title } = Typography;

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

  const loadSections = async () => {
    try {
      setLoading(true);
      const data = await getRecommendedSections();
      setSections(data);
    } catch (error) {
      console.error("Failed to load recommended sections:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshSection = async (sectionId: string) => {
    try {
      setRefreshing(sectionId);
      // Reload all sections (in real app, you might refresh just one section)
      const data = await getRecommendedSections();
      setSections(data);
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
              <Skeleton.Input />
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
