import { SyncOutlined } from "@ant-design/icons";
import { Button, Typography } from "antd";
import React from "react";
import Cover from "../components/Cover";
import type { RecommendedItem } from "../models";
import styles from "./Recommended.module.less";

const { Title } = Typography;

const recommendedData: RecommendedItem[] = [
  {
    id: "1",
    title: "New Releases",
    items: [
      {
        id: 1,
        name: "Woh Pehli Dafa",
        artist: "DZ Messili",
        cover: "https://picsum.photos/seed/1/300/300",
        year: "2023",
      },
      {
        id: 2,
        name: "Hollywood",
        artist: "Babbu Maan",
        cover: "https://picsum.photos/seed/2/300/300",
        year: "2023",
      },
      {
        id: 3,
        name: "The Egyptian",
        artist: "Apple Music Dance",
        cover: "https://picsum.photos/seed/3/300/300",
        year: "2023",
      },
      {
        id: 4,
        name: "Lucky You",
        artist: "Chance Music",
        cover: "https://picsum.photos/seed/4/300/300",
        year: "2023",
      },
      {
        id: 5,
        name: "No Love",
        artist: "Mark Dohnewr",
        cover: "https://picsum.photos/seed/5/300/300",
        year: "2023",
      },
      {
        id: 11,
        name: "Starlight",
        artist: "Luna Ray",
        cover: "https://picsum.photos/seed/11/300/300",
        year: "2023",
      },
      {
        id: 12,
        name: "Midnight Dreams",
        artist: "Echo Valley",
        cover: "https://picsum.photos/seed/12/300/300",
        year: "2023",
      },
      {
        id: 13,
        name: "Summer Vibes",
        artist: "The Waves",
        cover: "https://picsum.photos/seed/13/300/300",
        year: "2023",
      },
    ],
  },
  {
    id: "2",
    title: "Top Charts",
    items: [
      {
        id: 6,
        name: "If You",
        artist: "Mayorkun",
        cover: "https://picsum.photos/seed/6/300/300",
        year: "2023",
      },
      {
        id: 7,
        name: "Elevated",
        artist: "Shubh",
        cover: "https://picsum.photos/seed/7/300/300",
        year: "2023",
      },
      {
        id: 8,
        name: "Brown Munde",
        artist: "Ap Dhillon",
        cover: "https://picsum.photos/seed/8/300/300",
        year: "2023",
      },
      {
        id: 9,
        name: "Excuses",
        artist: "Ap Dhillon",
        cover: "https://picsum.photos/seed/9/300/300",
        year: "2023",
      },
      {
        id: 10,
        name: "Insane",
        artist: "Ap Dhillon",
        cover: "https://picsum.photos/seed/10/300/300",
        year: "2023",
      },
      {
        id: 14,
        name: "Golden Hour",
        artist: "Sunset Boulevard",
        cover: "https://picsum.photos/seed/14/300/300",
        year: "2023",
      },
      {
        id: 15,
        name: "Neon Lights",
        artist: "City Nights",
        cover: "https://picsum.photos/seed/15/300/300",
        year: "2023",
      },
      {
        id: 16,
        name: "Ocean Drive",
        artist: "Coastal Dreams",
        cover: "https://picsum.photos/seed/16/300/300",
        year: "2023",
      },
    ],
  },
];

const Recommended: React.FC = () => {
  return (
    <div className={styles.container}>
      {recommendedData.map((section) => (
        <div key={section.id} className={styles.section}>
          <div className={styles.sectionHeader}>
            <Title level={3} className={styles.sectionTitle}>
              {section.title}
            </Title>
            <Button type="text" className={styles.refreshButton}>
              换一批 <SyncOutlined />
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
