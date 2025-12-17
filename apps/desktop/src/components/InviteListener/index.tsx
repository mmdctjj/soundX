import { Button, notification, Space, Typography } from "antd";
import React, { useEffect } from "react";
import type { Track } from "../../models";
import { socketService } from "../../services/socket";
import { usePlayerStore } from "../../store/player";
import { getCoverUrl } from "../Detail";

const { Text } = Typography;

const InviteContent: React.FC<{
  fromUserId: number;
  currentTrack?: Track;
}> = ({ fromUserId, currentTrack }) => {
  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Text strong>用户 {fromUserId}</Text> 邀请你一同听歌
      </div>
      {currentTrack && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
            padding: 8,
            background: "rgba(255,255,255,0.05)",
            borderRadius: 4,
          }}
        >
          {currentTrack.cover && (
            <img
              src={`${getCoverUrl(currentTrack.cover)}`}
              alt="cover"
              style={{
                width: 40,
                height: 40,
                borderRadius: 4,
                objectFit: "cover",
              }}
            />
          )}
          <div style={{ overflow: "hidden" }}>
            <div
              style={{
                fontWeight: "bold",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {currentTrack.name}
            </div>
            <div
              style={{
                fontSize: 12,
                opacity: 0.7,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {currentTrack.artist}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InviteListener: React.FC = () => {
  const [api, contextHolder] = notification.useNotification();
  const { play, setPlaylist } = usePlayerStore();

  useEffect(() => {
    const handleInviteReceived = (payload: {
      fromUserId: number;
      currentTrack?: Track;
      playlist?: Track[];
      progress?: number;
    }) => {
      console.log("InviteListener", payload);
      const key = `invite-${payload.fromUserId}-${Date.now()}`;

      const handleRespond = (accept: boolean) => {
        socketService.emit("respond_invite", {
          fromUserId: payload.fromUserId,
          accept,
        });
        api.destroy(key);

        if (accept) {
          if (payload.currentTrack) {
            const onSessionStart = () => {
              play(payload.currentTrack, payload.currentTrack?.albumEntity?.id, payload.progress || 0);
              socketService.off("sync_session_started", onSessionStart);
            };
            socketService.on("sync_session_started", onSessionStart);
          }
          if (payload.playlist) {
            setPlaylist(payload.playlist);
          }
        }
      };

      const btn = (
        <Space>
          <Button size="small" onClick={() => handleRespond(false)}>
            拒绝
          </Button>
          <Button
            type="primary"
            size="small"
            onClick={() => handleRespond(true)}
          >
            接受
          </Button>
        </Space>
      );

      api.open({
        message: "来自好友的邀请",
        description: (
          <InviteContent
            fromUserId={payload.fromUserId}
            currentTrack={payload.currentTrack}
          />
        ),
        key,
        showProgress: true,
        pauseOnHover: false,
        duration: 60, // Keep open until user interacts or manually closed by timer
        btn,
        placement: "topRight",
      });
    };

    socketService.on("invite_received", handleInviteReceived);

    return () => {
      socketService.off("invite_received", handleInviteReceived);
    };
  }, [api, play]);

  return <>{contextHolder}</>;
};

export default InviteListener;
