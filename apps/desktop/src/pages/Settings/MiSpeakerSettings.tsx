import {
  Button,
  Flex,
  Image,
  Input,
  List,
  Popconfirm,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getMiAuthStatus,
  getMiQRCode,
  getMiQRCodeStatus,
  logoutMiAccount,
  getMiKeywords,
  addMiKeyword,
  updateMiKeyword,
  deleteMiKeyword,
  getMiConversations,
  getMiCasts,
  type MiKeyword,
  type MiConversation,
  type MiCastRecord,
  type MiPagedResponse,
} from "@soundx/services";

const { Text } = Typography;

// ===================== 登录状态 Tab =====================

interface LoginTabProps {
  onAuthChange: (loggedIn: boolean) => void;
}

const LoginTab: React.FC<LoginTabProps> = ({ onAuthChange }) => {
  const { t } = useTranslation();
  // 父组件已检查登录态才传入；这里不再重复请求，仅维护自身扫码状态 + 同步登录结果给父组件。
  const [loggedIn, setLoggedIn] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    return stopPolling;
  }, [stopPolling]);

  // 扫码成功 → 父组件切到 3-tab 视图并卸载本组件
  useEffect(() => {
    if (loggedIn) onAuthChange(true);
  }, [loggedIn, onAuthChange]);

  const handleGetQRCode = async () => {
    setLoading(true);
    stopPolling();
    try {
      const res = await getMiQRCode();
      if (res.already_logged_in) {
        setLoggedIn(true);
        setQrCodeUrl(null);
        message.success(t("miManage.loginSuccess"));
        return;
      }
      if (res.qrcode_url) {
        setQrCodeUrl(res.qrcode_url);
        if (res.status_url) {
          pollingRef.current = setInterval(async () => {
            try {
              const statusRes = await getMiQRCodeStatus(res.status_url!);
              if (statusRes.status === "success") {
                stopPolling();
                setLoggedIn(true);
                setQrCodeUrl(null);
                message.success(t("miManage.loginSuccess"));
              } else if (statusRes.status === "expired" || statusRes.status === "error") {
                stopPolling();
                setQrCodeUrl(null);
                message.warning(t("miManage.qrCodeExpired"));
              }
            } catch {
              // ignore polling errors
            }
          }, 3000);
        }
      }
    } catch (e: any) {
      message.error(e?.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutMiAccount();
      setLoggedIn(false);
      setQrCodeUrl(null);
      message.success(t("miManage.logout"));
    } catch (e: any) {
      message.error(e?.message || t("common.error"));
    }
  };

  if (loggedIn === null) {
    return <Spin />;
  }

  return (
    <Flex vertical gap="middle" align="center" style={{ padding: "24px 0" }}>
      {loggedIn ? (
        <>
          <Text strong style={{ fontSize: 16 }}>
            ✅ {t("miManage.loggedIn")}
          </Text>
          <Popconfirm
            title={t("miManage.logoutConfirm")}
            onConfirm={handleLogout}
            okText={t("common.confirm")}
            cancelText={t("common.cancel")}
          >
            <Button danger>{t("miManage.logout")}</Button>
          </Popconfirm>
        </>
      ) : (
        <>
          <Text type="secondary">{t("miManage.notLoggedIn")}</Text>
          {qrCodeUrl ? (
            <Flex vertical align="center" gap="small">
              <Image src={qrCodeUrl} width={200} preview={false} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("miManage.scanQRCode")}
              </Text>
            </Flex>
          ) : (
            <Button type="primary" loading={loading} onClick={handleGetQRCode}>
              {t("miManage.getQRCode")}
            </Button>
          )}
        </>
      )}
    </Flex>
  );
};

// ===================== 唤醒关键字 Tab =====================

const KeywordsTab: React.FC = () => {
  const { t } = useTranslation();
  const [keywords, setKeywords] = useState<MiKeyword[]>([]);
  const [loading, setLoading] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [adding, setAdding] = useState(false);

  const loadKeywords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMiKeywords();
      setKeywords(res.keywords);
    } catch (e: any) {
      message.error(e?.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadKeywords();
  }, [loadKeywords]);

  const handleAdd = async () => {
    const kw = newKeyword.trim();
    if (!kw) return;
    setAdding(true);
    try {
      await addMiKeyword(kw);
      setNewKeyword("");
      message.success(t("common.success"));
      loadKeywords();
    } catch (e: any) {
      if (e?.response?.status === 409) {
        message.warning(t("miManage.keywordExists"));
      } else {
        message.error(e?.message || t("common.error"));
      }
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (kw: MiKeyword) => {
    try {
      await updateMiKeyword(kw.id, { enabled: !kw.enabled });
      loadKeywords();
    } catch (e: any) {
      message.error(e?.message || t("common.error"));
    }
  };

  const handleDelete = async (kw: MiKeyword) => {
    try {
      await deleteMiKeyword(kw.id);
      message.success(t("common.success"));
      loadKeywords();
    } catch (e: any) {
      message.error(e?.message || t("common.error"));
    }
  };

  return (
    <Flex vertical gap="middle">
      <Space.Compact style={{ width: "100%" }}>
        <Input
          placeholder={t("miManage.keywordPlaceholder")}
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onPressEnter={handleAdd}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          loading={adding}
          onClick={handleAdd}
        >
          {t("miManage.keywordAdd")}
        </Button>
      </Space.Compact>

      <List
        loading={loading}
        dataSource={keywords}
        locale={{ emptyText: t("miManage.keywordEmpty") }}
        renderItem={(kw) => (
          <List.Item
            actions={[
              <Switch
                key="toggle"
                checked={kw.enabled}
                onChange={() => handleToggle(kw)}
                checkedChildren={t("miManage.keywordEnabled")}
                unCheckedChildren={t("miManage.keywordDisabled")}
              />,
              <Popconfirm
                key="delete"
                title={t("miManage.keywordDeleteConfirm", { keyword: kw.keyword })}
                onConfirm={() => handleDelete(kw)}
                okText={t("common.confirm")}
                cancelText={t("common.cancel")}
              >
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>,
            ]}
          >
            <Text strong={kw.enabled} delete={!kw.enabled}>
              {kw.keyword}
            </Text>
          </List.Item>
        )}
      />
    </Flex>
  );
};

// ===================== 对话历史 Tab =====================

const ConversationsTab: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<MiPagedResponse<MiConversation> | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const loadData = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const res = await getMiConversations({ page: p, size: 20 });
        setData(res);
        setPage(p);
      } catch (e: any) {
        message.error(e?.message || t("common.error"));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  const columns = [
    {
      title: t("miManage.time"),
      dataIndex: "timestamp_ms",
      key: "time",
      width: 180,
      render: (ts: number) => new Date(ts).toLocaleString(),
    },
    {
      title: t("miManage.device"),
      dataIndex: "device_name",
      key: "device",
      width: 120,
      render: (v: string) => v || "-",
    },
    {
      title: t("miManage.query"),
      dataIndex: "query",
      key: "query",
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: t("miManage.answer"),
      dataIndex: "answer",
      key: "answer",
      ellipsis: true,
      render: (v: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {v || "-"}
        </Text>
      ),
    },
  ];

  return (
    <Flex vertical gap="middle">
      <Flex justify="end">
        <Button icon={<ReloadOutlined />} onClick={() => loadData(1)}>
          {t("common.refresh")}
        </Button>
      </Flex>
      <Table
        columns={columns}
        dataSource={data?.items ?? []}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          total: data?.total ?? 0,
          pageSize: 20,
          onChange: loadData,
          showTotal: (total) => `${total}`,
        }}
        locale={{ emptyText: t("miManage.historyEmpty") }}
        size="small"
      />
    </Flex>
  );
};

// ===================== 投放历史 Tab =====================

const CastsTab: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<MiPagedResponse<MiCastRecord> | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const loadData = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const res = await getMiCasts({ page: p, size: 20 });
        setData(res);
        setPage(p);
      } catch (e: any) {
        message.error(e?.message || t("common.error"));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  const sourceLabels: Record<string, string> = {
    play_by_url: t("miManage.castSource_play_by_url"),
    play_playlist: t("miManage.castSource_play_playlist"),
    voice: t("miManage.castSource_voice"),
  };

  const columns = [
    {
      title: t("miManage.time"),
      dataIndex: "created_at",
      key: "time",
      width: 180,
      render: (ts: number) => new Date(ts).toLocaleString(),
    },
    {
      title: t("miManage.device"),
      dataIndex: "device_name",
      key: "device",
      width: 120,
      render: (v: string) => v || "-",
    },
    {
      title: t("miManage.title"),
      dataIndex: "title",
      key: "title",
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: t("miManage.source"),
      dataIndex: "source",
      key: "source",
      width: 100,
      render: (v: string) => <Tag>{sourceLabels[v] || v}</Tag>,
    },
    {
      title: t("miManage.tracksCount", { count: 0 }),
      dataIndex: "tracks_count",
      key: "tracks_count",
      width: 80,
      render: (v: number) => (v > 1 ? t("miManage.tracksCount", { count: v }) : "-"),
    },
  ];

  return (
    <Flex vertical gap="middle">
      <Flex justify="end">
        <Button icon={<ReloadOutlined />} onClick={() => loadData(1)}>
          {t("common.refresh")}
        </Button>
      </Flex>
      <Table
        columns={columns}
        dataSource={data?.items ?? []}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          total: data?.total ?? 0,
          pageSize: 20,
          onChange: loadData,
          showTotal: (total) => `${total}`,
        }}
        locale={{ emptyText: t("miManage.historyEmpty") }}
        size="small"
      />
    </Flex>
  );
};

// ===================== 主组件 =====================

const MiSpeakerSettings: React.FC = () => {
  const { t } = useTranslation();
  // 未登录时整个页面只展示 LoginTab（不显示 tabBar）；登录后展示 keywords/conversations/casts 三个 tab。
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  // 父组件主动发起登录态检查 —— 否则 `loggedIn` 永远停留在 `null`，Spin 一直转。
  const checkAuth = useCallback(async () => {
    try {
      const res = await getMiAuthStatus();
      setLoggedIn(res.logged_in);
    } catch {
      setLoggedIn(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleAuthChange = useCallback((v: boolean) => setLoggedIn(v), []);

  const handleLogout = useCallback(async () => {
    try {
      await logoutMiAccount();
      message.success(t("miManage.logout"));
      setLoggedIn(false);
    } catch (e: any) {
      message.error(e?.message || t("common.error"));
    }
  }, [t]);

  if (loggedIn === null) {
    return <Spin />;
  }

  if (!loggedIn) {
    return <LoginTab onAuthChange={handleAuthChange} />;
  }

  const tabItems = [
    {
      key: "keywords",
      label: t("miManage.tabKeywords"),
      children: <KeywordsTab />,
    },
    {
      key: "conversations",
      label: t("miManage.tabConversations"),
      children: <ConversationsTab />,
    },
    {
      key: "casts",
      label: t("miManage.tabCasts"),
      children: <CastsTab />,
    },
  ];

  return (
    <>
      <Tabs items={tabItems} destroyInactiveTabPane={false} />
      <div style={{ marginTop: 12, textAlign: "right" }}>
        <Popconfirm
          title={t("miManage.logoutConfirm")}
          onConfirm={handleLogout}
          okText={t("common.confirm")}
          cancelText={t("common.cancel")}
        >
          <Button size="small" type="link">
            {t("miManage.logout")}
          </Button>
        </Popconfirm>
      </div>
    </>
  );
};

export default MiSpeakerSettings;
