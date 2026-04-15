import { getUserList } from "@soundx/services";
import { Avatar, Checkbox, Col, Flex, Modal, Row, message, theme } from "antd";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { User } from "../../models";
import { socketService } from "../../services/socket";
import { trackEvent } from "../../services/tracking";
import { useAuthStore } from "../../store/auth";
import { usePlayerStore } from "../../store/player";
import { useSyncStore } from "../../store/sync";

interface UserSelectModalProps {
  visible: boolean;
  onCancel: () => void;
  onSessionStart: () => void;
}

const UserSelectModal: React.FC<UserSelectModalProps> = ({
  visible,
  onCancel,
  onSessionStart,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const currentUser = useAuthStore((state) => state.user);
  const device = useAuthStore((state) => state.device);
  const [messageApi, contextHolder] = message.useMessage();
  const { currentTrack, playlist, currentTime } = usePlayerStore();
  const [waitingUserIds, setWaitingUserIds] = useState<Set<number>>(new Set());
  const [inviteStatuses, setInviteStatuses] = useState<
    Map<number, "waiting" | "accepted" | "rejected" | "timeout">
  >(new Map());

  const { isSynced, sessionId } = useSyncStore();

  const { token } = theme.useToken();
  const { t } = useTranslation();

  useEffect(() => {
    if (visible) {
      fetchUsers();
      if (waitingUserIds.size === 0) {
        setWaitingUserIds(new Set());
        setInviteStatuses(new Map());
      }
    }
  }, [visible]);

  useEffect(() => {
    const handleSessionStarted = (payload: any) => {
      // payload: { sessionId, users: [id1, id2] }
      // The payload users are [senderId, receiverId].
      // We need to identify IF the session that started involves us and someone we invited.

      const otherUserId = payload.users.find(
        (id: number) => id !== currentUser?.id,
      );

      if (otherUserId && waitingUserIds.has(otherUserId)) {
        setInviteStatuses((prev) => new Map(prev).set(otherUserId, "accepted"));
        setWaitingUserIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(otherUserId);
          return newSet;
        });
        messageApi.success(t('userSelect.userAccepted', { userId: otherUserId }));

        // Close after short delay and start session
        setTimeout(() => {
          setSelectedUserIds([]);
          onSessionStart();
        }, 1000);
      }
    };

    const handleReject = (payload: any) => {
      // payload: { fromUserId }
      const id = payload.fromUserId;
      if (waitingUserIds.has(id)) {
        setInviteStatuses((prev) => new Map(prev).set(id, "rejected"));
        setWaitingUserIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        messageApi.error(t('userSelect.userRejected', { userId: id }));
      }
    };

    socketService.on("sync_session_started", handleSessionStarted);
    socketService.on("invite_rejected", handleReject);

    return () => {
      socketService.off("sync_session_started", handleSessionStarted);
      socketService.off("invite_rejected", handleReject);
    };
  }, [waitingUserIds, currentUser, onCancel, messageApi]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getUserList();
      if (res.data) {
        // Filter out current user
        setUsers(res.data.filter((u) => u.id !== currentUser?.id));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = () => {
    if (selectedUserIds.length === 0) {
      messageApi.warning(t('userSelect.selectAtLeastOne'));
      return;
    }

    console.log("Inviting users:", currentTime);

    // Determine Session ID: Reuse if synced, else create new unique one
    const currentSessionId =
      isSynced && sessionId
        ? sessionId
        : `sync_session_${currentUser?.id}_${Date.now()}`;

    socketService.emit("invite", {
      targetUserIds: selectedUserIds,
      currentTrack,
      playlist,
      progress: currentTime,
      sessionId: currentSessionId, // Send Session ID
    });

    trackEvent({
      feature: "sync",
      eventName: "sync_control_initiate",
      userId: currentUser?.id ? String(currentUser.id) : undefined,
      sessionId: currentSessionId,
      deviceId: device?.id ? String(device.id) : undefined,
      metadata: {
        targetUserCount: selectedUserIds.length,
      },
    });
    // messageApi.success("邀请已发送"); // Don't show success yet, wait for response

    // Set waiting state
    const newWaiting = new Set(selectedUserIds);
    setWaitingUserIds(newWaiting);
    const newStatuses = new Map();
    selectedUserIds.forEach((id) => newStatuses.set(id, "waiting"));
    setInviteStatuses(newStatuses);

    // Timeout logic (60s)
    setTimeout(() => {
      setWaitingUserIds((prev) => {
        if (prev.size === 0) return prev;

        const timedOut = Array.from(prev);
        if (timedOut.length > 0) {
          messageApi.error(t('userSelect.inviteTimeout'));
          setInviteStatuses((st) => {
            const next = new Map(st);
            timedOut.forEach((id) => next.set(id, "timeout"));
            return next;
          });
          // Close modal
          setSelectedUserIds([]);
          onCancel();
        }
        return new Set();
      });
    }, 60000);
  };

  const toggleSelect = (userId: number) => {
    if (waitingUserIds.has(userId)) return; // Prevent toggling if waiting

    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const getStatusText = (id: number) => {
    const status = inviteStatuses.get(id);
    switch (status) {
      case "waiting":
        return (
          <span style={{ fontSize: 12, color: "#faad14" }}>{t('userSelect.waiting')}</span>
        );
      case "accepted":
        return <span style={{ fontSize: 12, color: "#52c41a" }}>{t("sync.accepted")}</span>;
      case "rejected":
        return <span style={{ fontSize: 12, color: "#ff4d4f" }}>{t("sync.rejected")}</span>;
      case "timeout":
        return <span style={{ fontSize: 12, color: "#999" }}>{t("common.noResponse")}</span>;
      default:
        return null;
    }
  };

  return (
    <Modal
      title={t('userSelect.title')}
      open={visible}
      onCancel={() => {
        setSelectedUserIds([]);
        onCancel();
      }}
      onOk={handleInvite}
      confirmLoading={waitingUserIds.size > 0}
      okText={waitingUserIds.size > 0 ? t('userSelect.waitingResponse') : t('userSelect.sendInvite')}
      okButtonProps={{ loading }}
      cancelButtonProps={{ disabled: false }}
      closable={true}
      maskClosable={true}
      keyboard={true}
    >
      <Checkbox.Group style={{ width: "100%" }}>
        <Row gutter={[20, 20]}>
          {users.map((user) => (
            <Col span={24} key={user.id}>
              <Flex justify="space-between" align="center">
                <Checkbox
                  value={user.id}
                  checked={selectedUserIds.includes(user.id as number)}
                  onChange={() => toggleSelect(user.id as number)}
                  disabled={waitingUserIds.has(user.id as number)}
                >
                  <Flex gap={8} align="center">
                    <Avatar
                      size={30}
                      style={{ backgroundColor: token.colorPrimary }}
                    >
                      {user.username[0].toUpperCase()}
                    </Avatar>
                    {user.username}
                  </Flex>
                </Checkbox>
                {getStatusText(user.id as number)}
              </Flex>
            </Col>
          ))}
        </Row>
      </Checkbox.Group>
      {contextHolder}
    </Modal>
  );
};

export default UserSelectModal;
