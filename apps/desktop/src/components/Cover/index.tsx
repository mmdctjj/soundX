import type { Album } from "@soundx/db";
import { Skeleton, Typography } from "antd";
import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./index.module.less";

const { Title, Text } = Typography;

interface CoverComponent extends React.FC<{ item: Album }> {
  Skeleton: React.FC;
}

const Cover: CoverComponent = ({ item }) => {
  const navigate = useNavigate();

  return (
    <div className={styles.coverContainer} onClick={() => navigate("/detail")}>
      <div className={styles.imageWrapper}>
        <img src={item.cover ?? ""} alt={item.name} className={styles.image} />
      </div>
      <Title level={5} className={styles.title}>
        {item.name}
      </Title>
      <Text type="secondary" className={styles.artist}>
        {item.artist}
      </Text>
    </div>
  );
};

Cover.Skeleton = () => {
  return (
    <div>
      <div className={styles.skeletonWrapper}>
        <Skeleton.Node active className={styles.skeletonNode}>
          <div style={{ width: "100%", height: "100%" }} />
        </Skeleton.Node>
      </div>
      <Skeleton
        active
        title={{ width: "80%", style: { height: "20px", marginBottom: "8px" } }}
        paragraph={{ rows: 1, width: "60%" }}
      />
    </div>
  );
};

export default Cover;
