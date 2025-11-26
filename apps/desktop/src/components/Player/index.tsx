import {
  ClockCircleOutlined,
  DeliveredProcedureOutlined,
  DownOutlined,
  OrderedListOutlined,
  PlayCircleFilled,
  SoundOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import {
  Drawer,
  Flex,
  List,
  Popover,
  Slider,
  Tooltip,
  Typography,
  theme,
} from "antd";
import React from "react";
import { useTheme } from "../../context/ThemeContext";
import styles from "./index.module.less";

const { Text, Title } = Typography;

const playlists = [
  {
    title: "Woh Pehli Dafa",
    artist: "DZ Messili",
    image: "https://picsum.photos/seed/1/300/300",
  },
  {
    title: "Hollywood",
    artist: "Babbu Maan",
    image: "https://picsum.photos/seed/2/300/300",
  },
  {
    title: "The Egyptian",
    artist: "Apple Music Dance",
    image: "https://picsum.photos/seed/3/300/300",
  },
  {
    title: "Lucky You",
    artist: "Chance Music",
    image: "https://picsum.photos/seed/4/300/300",
  },
  {
    title: "No Love",
    artist: "Mark Dohnewr",
    image: "https://picsum.photos/seed/5/300/300",
  },
  {
    title: "If You",
    artist: "Mayorkun",
    image: "https://picsum.photos/seed/6/300/300",
  },
  {
    title: "Elevated",
    artist: "Shubh",
    image: "https://picsum.photos/seed/7/300/300",
  },
  {
    title: "Brown Munde",
    artist: "Ap Dhillon",
    image: "https://picsum.photos/seed/8/300/300",
  },
];

const Player: React.FC = () => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration] = React.useState(221); // 03:41
  const [volume, setVolume] = React.useState(70);
  const [playOrder, setPlayOrder] = React.useState<
    "sequential" | "random" | "loop"
  >("sequential");
  const [skipStart, setSkipStart] = React.useState(0);
  const [skipEnd, setSkipEnd] = React.useState(0);
  const [isPlaylistOpen, setIsPlaylistOpen] = React.useState(false);
  const [isFullPlayerVisible, setIsFullPlayerVisible] = React.useState(false);

  const { token } = theme.useToken();
  const { mode } = useTheme();

  const drawerBgImage =
    mode === "dark"
      ? "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')"
      : "url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2564&auto=format&fit=crop')";

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const togglePlay = () => setIsPlaying(!isPlaying);

  return (
    <div
      className={styles.player}
      style={{ color: token.colorText, borderRightColor: token.colorBorder }}
    >
      {/* Song Info */}
      <div
        className={styles.songInfo}
        onClick={() => setIsFullPlayerVisible(true)}
      >
        <div className={styles.coverWrapper}>
          <img
            src="https://picsum.photos/seed/1/300/300"
            alt="cover"
            className={styles.coverImage}
          />
        </div>
        <div className={styles.songDetails}>
          <Text strong>How to make your partner...</Text>
          <Text type="secondary" style={{ fontSize: "12px" }}>
            Ken Adams
          </Text>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.controlButtons}>
          <StepBackwardOutlined className={styles.controlIcon} />
          <div onClick={togglePlay} style={{ cursor: "pointer" }}>
            <PlayCircleFilled
              className={styles.playIcon}
              style={{ color: token.colorPrimary }}
            />
          </div>
          <StepForwardOutlined className={styles.controlIcon} />
        </div>
        <div className={styles.progressWrapper}>
          <Text type="secondary" style={{ fontSize: "10px" }}>
            {formatTime(currentTime)}
          </Text>
          <Slider
            value={currentTime}
            max={duration}
            onChange={setCurrentTime}
            tooltip={{ open: false }}
            style={{ flex: 1, margin: 0 }}
            trackStyle={{ backgroundColor: token.colorText }}
            railStyle={{ backgroundColor: token.colorBorder }}
            handleStyle={{ display: "none" }}
          />
          <Text type="secondary" style={{ fontSize: "10px" }}>
            {formatTime(duration)}
          </Text>
        </div>
      </div>

      {/* Volume & Settings */}
      <div className={styles.settings}>
        {/* Play Order */}
        <Popover
          content={
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                padding: "0px",
              }}
            >
              <div
                onClick={() => setPlayOrder("sequential")}
                style={{
                  cursor: "pointer",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  backgroundColor:
                    playOrder === "sequential"
                      ? token.colorFillTertiary
                      : "transparent",
                }}
              >
                顺序播放
              </div>
              <div
                onClick={() => setPlayOrder("random")}
                style={{
                  cursor: "pointer",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  backgroundColor:
                    playOrder === "random"
                      ? token.colorFillTertiary
                      : "transparent",
                }}
              >
                随机播放
              </div>
              <div
                onClick={() => setPlayOrder("loop")}
                style={{
                  cursor: "pointer",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  backgroundColor:
                    playOrder === "loop"
                      ? token.colorFillTertiary
                      : "transparent",
                }}
              >
                单曲循环
              </div>
            </div>
          }
          trigger="click"
          placement="top"
        >
          <Tooltip title="播放顺序">
            <SwapOutlined className={styles.settingIcon} />
          </Tooltip>
        </Popover>

        {/* Volume */}
        <Popover
          content={
            <Flex vertical justify="center">
              <Text style={{ fontSize: "12px" }}>{volume} 分钟后自动关闭</Text>
              <Slider
                style={{ width: "200px" }}
                value={volume}
                max={100}
                step={5}
                onChange={setVolume}
              />
            </Flex>
          }
          trigger="click"
          placement="top"
        >
          <Tooltip title="定时关闭">
            <ClockCircleOutlined className={styles.settingIcon} />
          </Tooltip>
        </Popover>

        {/* Skip Intro */}
        <Popover
          content={
            <div style={{ width: "250px", padding: "10px" }}>
              <div style={{ marginBottom: "15px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "5px",
                  }}
                >
                  <span>跳过片头</span>
                </div>
                <Slider
                  value={skipStart}
                  onChange={setSkipStart}
                  max={90}
                  tooltip={{ formatter: (value) => `${value}s` }}
                />
              </div>
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "5px",
                  }}
                >
                  <span>跳过片尾</span>
                </div>
                <Slider
                  value={skipEnd}
                  onChange={setSkipEnd}
                  max={90}
                  tooltip={{ formatter: (value) => `${value}s` }}
                />
              </div>
            </div>
          }
          trigger="click"
          placement="top"
        >
          <Tooltip title="跳过片头/片尾">
            <DeliveredProcedureOutlined className={styles.settingIcon} />
          </Tooltip>
        </Popover>

        <Popover
          content={
            <Flex
              vertical
              justify="center"
              style={{ height: "150px", padding: "10px 0" }}
            >
              <Text style={{ marginBottom: "5px", textAlign: "center" }}>
                {volume}
              </Text>
              <Slider vertical value={volume} onChange={setVolume} />
            </Flex>
          }
          trigger="click"
          placement="top"
        >
          <Tooltip title="音量">
            <SoundOutlined className={styles.settingIcon} />
          </Tooltip>
        </Popover>

        {/* Playlist */}
        <Tooltip title="播放列表">
          <OrderedListOutlined
            onClick={() => setIsPlaylistOpen(true)}
            className={styles.settingIcon}
          />
        </Tooltip>
      </div>

      {/* Full Screen Player */}
      <Drawer
        placement="bottom"
        height="100%"
        open={isFullPlayerVisible}
        onClose={() => setIsFullPlayerVisible(false)}
        classNames={{ body: styles.fullPlayerBody }}
        styles={{
          body: {
            backgroundImage: drawerBgImage,
          },
          header: { display: "none" },
        }}
        closeIcon={null}
      >
        {/* Close Button */}
        <div className={styles.fullPlayerClose}>
          <DownOutlined
            onClick={() => setIsFullPlayerVisible(false)}
            className={styles.fullPlayerCloseIcon}
          />
        </div>

        {/* Left Side - Cover (1/3) */}
        <div className={styles.fullPlayerLeft}>
          {/* Background Blur Effect */}
          <div
            className={styles.fullPlayerBackground}
            style={{ backgroundImage: drawerBgImage }}
          />

          <img
            src="https://picsum.photos/seed/1/300/300"
            alt="Current Cover"
            className={styles.fullPlayerCover}
          />
        </div>

        {/* Right Side - Info & Playlist (2/3) */}
        <div className={styles.fullPlayerRight}>
          {/* Top: Title */}
          <div style={{ marginBottom: "40px" }}>
            <Title level={1} style={{ margin: "0 0 10px 0" }}>
              How to make your partner...
            </Title>
            <Text style={{ fontSize: "20px" }} type="secondary">
              Ken Adams
            </Text>
          </div>

          {/* Bottom: Playlist */}
          <div style={{ flex: 1, overflowY: "auto", paddingRight: "10px" }}>
            <Title level={4} style={{ marginBottom: "20px" }}>
              播放列表
            </Title>
            <List
              itemLayout="horizontal"
              dataSource={playlists}
              renderItem={(item) => (
                <List.Item className={styles.playlistItem}>
                  <List.Item.Meta
                    avatar={
                      <img
                        src={item.image}
                        alt={item.title}
                        style={{
                          width: "50px",
                          height: "50px",
                          objectFit: "cover",
                          borderRadius: "8px",
                        }}
                      />
                    }
                    title={
                      <Text style={{ fontSize: "16px" }}>{item.title}</Text>
                    }
                    description={<Text type="secondary">{item.artist}</Text>}
                  />
                </List.Item>
              )}
            />
          </div>
        </div>
      </Drawer>

      <Drawer
        title="播放列表"
        placement="right"
        open={isPlaylistOpen}
        onClose={() => setIsPlaylistOpen(false)}
      >
        <List
          style={{ width: "100%" }}
          itemLayout="horizontal"
          dataSource={playlists}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <img
                    src={item.image}
                    alt={item.title}
                    style={{
                      width: "25px",
                      height: "25px",
                      objectFit: "cover",
                    }}
                  />
                }
                description={item.artist}
              />
            </List.Item>
          )}
        />
      </Drawer>
    </div>
  );
};

export default Player;
