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
import { Avatar, Col, Row, Table, Typography, theme } from "antd";
import React from "react";
import styles from "./Detail.module.less";

const { Title, Text } = Typography;

const episodes = [
  {
    key: "1",
    title: "Find topic that tou love",
    artist: "Ken Adams",
    playlist: "How to Start Podcast",
    plays: "2,412",
    duration: "08:12",
    image: "https://picsum.photos/seed/10/100/100",
  },
  {
    key: "2",
    title: "Invite your friends instead",
    artist: "Ken Adams",
    playlist: "How to Start Podcast",
    plays: "2,341",
    duration: "18:11",
    image: "https://picsum.photos/seed/11/100/100",
  },
  {
    key: "3",
    title: "How to make your partner talk more",
    artist: "Ken Adams",
    playlist: "How to Start Podcast",
    plays: "1,212",
    duration: "12:11",
    image: "https://picsum.photos/seed/12/100/100",
  },
  {
    key: "4",
    title: "Invest in podcast tools",
    artist: "Ken Adams",
    playlist: "How to Start Podcast",
    plays: "3,123",
    duration: "18:31",
    image: "https://picsum.photos/seed/13/100/100",
  },
];

const Detail: React.FC = () => {
  const { token } = theme.useToken();

  const columns = [
    {
      title: "#",
      dataIndex: "key",
      key: "key",
      width: 50,
      render: (text: string) => <Text type="secondary">{text}</Text>,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 60,
      render: (text: string, record: any) => (
        <img
          src={record.image}
          alt={text}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "4px",
            objectFit: "cover",
          }}
        />
      ),
    },
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Playlist",
      dataIndex: "playlist",
      key: "playlist",
      render: (text: string) => <Text type="secondary">{text}</Text>,
    },
    {
      title: "时长",
      dataIndex: "duration",
      key: "duration",
      render: (text: string) => <Text type="secondary">{text}</Text>,
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

  return (
    <div className={styles.detailContainer}>
      {/* Header Banner */}
      <div
        className={styles.banner}
        style={{
          backgroundImage: "url(https://picsum.photos/seed/podcast/1200/400)",
        }}
      >
        <div className={styles.bannerOverlay}></div>

        <div className={styles.bannerContent}>
          <div>
            <div className={styles.titleGroup}>
              <Title level={1} style={{ color: "white", margin: 0 }}>
                How to start podcast
              </Title>
              <CheckCircleFilled
                style={{ color: "#1890ff", fontSize: "24px" }}
              />
            </div>
            <span className={styles.statsText}>40,142 Monthly Listeners</span>
          </div>

          <div className={styles.userInfo}>
            <Avatar
              size={50}
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Ken"
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <Text
                style={{ color: "white", fontWeight: 600, fontSize: "16px" }}
              >
                Ken Adam
              </Text>
              <Text
                style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px" }}
              >
                51k Followers
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

            {/* Episode List */}
            <Table
              dataSource={episodes}
              columns={columns}
              pagination={false}
              rowClassName="episode-row"
              onRow={() => ({
                style: { cursor: "pointer" },
              })}
            />
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Detail;
