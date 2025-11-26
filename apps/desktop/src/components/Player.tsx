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
import { Drawer, Flex, List, Popover, Slider, Tooltip, Typography } from "antd";
import React from "react";

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
      style={{
        height: "90px",
        backgroundColor: "var(--player-bg)",
        borderTop: "1px solid var(--border-color)",
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        justifyContent: "space-between",
      }}
    >
      {/* Song Info */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "15px",
          width: "250px",
          cursor: "pointer",
        }}
        onClick={() => setIsFullPlayerVisible(true)}
      >
        <div
          style={{
            width: "50px",
            height: "50px",
            backgroundColor: "#333",
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          <img
            src="https://picsum.photos/seed/1/300/300"
            alt="cover"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Text style={{ color: "var(--text-primary)" }}>
            How to make your partner...
          </Text>
          <Text style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
            Ken Adams
          </Text>
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          gap: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "5px",
          }}
        >
          <StepBackwardOutlined
            style={{
              color: "var(--text-primary)",
              fontSize: "20px",
              cursor: "pointer",
            }}
          />
          <div onClick={togglePlay} style={{ cursor: "pointer" }}>
            {isPlaying ? (
              <PlayCircleFilled
                style={{ color: "var(--accent-color)", fontSize: "40px" }}
              /> // Ideally PauseCircleFilled
            ) : (
              <PlayCircleFilled
                style={{ color: "var(--accent-color)", fontSize: "40px" }}
              />
            )}
          </div>
          <StepForwardOutlined
            style={{
              color: "var(--text-primary)",
              fontSize: "20px",
              cursor: "pointer",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            width: "60%",
          }}
        >
          <Text style={{ color: "var(--text-secondary)", fontSize: "10px" }}>
            {formatTime(currentTime)}
          </Text>
          <Slider
            value={currentTime}
            max={duration}
            onChange={setCurrentTime}
            tooltip={{ open: false }}
            style={{ flex: 1, margin: 0 }}
            trackStyle={{ backgroundColor: "var(--text-primary)" }}
            railStyle={{ backgroundColor: "#333" }}
            handleStyle={{ display: "none" }}
          />
          <Text style={{ color: "var(--text-secondary)", fontSize: "10px" }}>
            {formatTime(duration)}
          </Text>
        </div>
      </div>

      {/* Volume & Settings */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "15px",
          width: "150px",
          justifyContent: "flex-end",
        }}
      >
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
                      ? "rgba(0,0,0,0.1)"
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
                    playOrder === "random" ? "rgba(0,0,0,0.1)" : "transparent",
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
                    playOrder === "loop" ? "rgba(0,0,0,0.1)" : "transparent",
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
            <SwapOutlined
              style={{
                color: "var(--text-primary)",
                fontSize: "18px",
                cursor: "pointer",
              }}
            />
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
            <ClockCircleOutlined
              style={{
                color: "var(--text-primary)",
                fontSize: "18px",
                cursor: "pointer",
              }}
            />
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
            <DeliveredProcedureOutlined
              style={{
                color: "var(--text-primary)",
                fontSize: "18px",
                cursor: "pointer",
              }}
            />
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
            <SoundOutlined
              style={{
                color: "var(--text-primary)",
                fontSize: "18px",
                cursor: "pointer",
              }}
            />
          </Tooltip>
        </Popover>

        {/* Playlist */}
        <Tooltip title="播放列表">
          <OrderedListOutlined
            onClick={() => setIsPlaylistOpen(true)}
            style={{
              color: "var(--text-primary)",
              fontSize: "18px",
              cursor: "pointer",
            }}
          />
        </Tooltip>
      </div>

      {/* Full Screen Player */}
      <Drawer
        placement="bottom"
        height="100%"
        open={isFullPlayerVisible}
        onClose={() => setIsFullPlayerVisible(false)}
        styles={{
          body: {
            padding: 0,
            backgroundColor: "var(--bg-color)",
            backgroundImage:
              "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')",
            display: "flex",
            overflow: "hidden",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          },
          header: { display: "none" },
        }}
        closeIcon={null}
      >
        <div style={{}}></div>
        {/* Close Button */}
        <div style={{ position: "absolute", top: 30, right: 30, zIndex: 10 }}>
          <DownOutlined
            onClick={() => setIsFullPlayerVisible(false)}
            style={{
              fontSize: 24,
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          />
        </div>

        {/* Left Side - Cover (1/3) */}
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            position: "relative",
          }}
        >
          {/* Background Blur Effect */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 0,
            }}
          />

          <img
            src="https://picsum.photos/seed/1/300/300"
            alt="Current Cover"
            style={{
              width: "50vh",
              height: "50vh",
              objectFit: "cover",
              borderRadius: "20px",
              zIndex: 1,
              boxShadow: "10px 10px 20px rgba(255, 255, 255, 0.5)",
            }}
          />
        </div>

        {/* Right Side - Info & Playlist (2/3) */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "60px 40px",
          }}
        >
          {/* Top: Title */}
          <div style={{ marginBottom: "40px" }}>
            <Title
              level={1}
              style={{ color: "var(--text-primary)", margin: "0 0 10px 0" }}
            >
              How to make your partner...
            </Title>
            <Text style={{ color: "var(--text-secondary)", fontSize: "20px" }}>
              Ken Adams
            </Text>
          </div>

          {/* Bottom: Playlist */}
          <div style={{ flex: 1, overflowY: "auto", paddingRight: "10px" }}>
            <Title
              level={4}
              style={{ color: "var(--text-primary)", marginBottom: "20px" }}
            >
              播放列表
            </Title>
            <List
              itemLayout="horizontal"
              dataSource={playlists}
              renderItem={(item) => (
                <List.Item
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    padding: "15px 0",
                    cursor: "pointer",
                    transition: "all 0.3s",
                  }}
                  className="playlist-item"
                >
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
                      <Text
                        style={{
                          color: "var(--text-primary)",
                          fontSize: "16px",
                        }}
                      >
                        {item.title}
                      </Text>
                    }
                    description={
                      <Text style={{ color: "var(--text-secondary)" }}>
                        {item.artist}
                      </Text>
                    }
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
