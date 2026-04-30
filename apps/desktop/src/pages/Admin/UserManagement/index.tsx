import { LeftOutlined, PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import {
    createAdminUser,
    deleteAdminUser,
    getAdminUsers,
    setAdminUserExpiration,
    type User,
} from "@soundx/services";
import {
    Button,
    Checkbox,
    Flex,
    Form,
    Input,
    message,
    Modal,
    Space,
    Table,
    Tag,
    Typography,
} from "antd";
import dayjs from "dayjs";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./index.module.less";

const { Title } = Typography;

const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [expirationModalVisible, setExpirationModalVisible] = useState(false);

  const [createModalVisible, setCreateModalVisible] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [expirationDays, setExpirationDays] = useState<number | null>(null);
  const [modal, contextHolder] = Modal.useModal();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getAdminUsers();
      if (res.code === 200) {
        setUsers(res.data);
      } else {
        message.error(res.message);
      }
    } catch (error) {
      message.error(t("adminUserManagement.fetchUsersFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteUser = async (id: number) => {
    modal.confirm({
      title: t("adminUserManagement.deleteConfirmTitle"),
      content: t("adminUserManagement.deleteConfirmContent"),
      okText: t("common.confirm"),
      cancelText: t("common.cancel"),
      onOk: async () => {
        const res = await deleteAdminUser(id);
        if (res.code === 200) {
          messageApi.success(t("adminUserManagement.deleteSuccess"));
          fetchUsers();
        } else {
          messageApi.error(res.message);
        }
      },
    });
  };

  const handleSetExpiration = async () => {
    if (selectedUserId === null) return;
    const res = await setAdminUserExpiration(selectedUserId, expirationDays);
    if (res.code === 200) {
      messageApi.success(t("adminUserManagement.setSuccess"));
      setExpirationModalVisible(false);
      fetchUsers();
    } else {
      messageApi.error(res.message);
    }
  };

  const handleCreateUser = async () => {
    try {
      const values = await form.validateFields();
      const res = await createAdminUser(values);
      if (res.code === 200) {
        messageApi.success(t("adminUserManagement.createSuccess"));
        setCreateModalVisible(false);
        form.resetFields();
        fetchUsers();
      } else {
        messageApi.error(res.message);
      }
    } catch (error) {
      // form validation failed
    }
  };

  const columns = [
    {
      title: t("adminUserManagement.id"),
      dataIndex: "id",
      key: "id",
      width: 60,
    },
    {
      title: t("adminUserManagement.username"),
      dataIndex: "username",
      key: "username",
    },
    {
      title: t("adminUserManagement.isAdmin"),
      dataIndex: "is_admin",
      key: "is_admin",
      render: (val: boolean) =>
        val ? (
          <Tag color="gold">{t("adminUserManagement.adminUser")}</Tag>
        ) : (
          <Tag>{t("adminUserManagement.normalUser")}</Tag>
        ),
    },
    {
      title: t("adminUserManagement.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (val: string) =>
        val ? dayjs(val).format("YYYY-MM-DD HH:mm") : "-",
    },
    {
      title: t("adminUserManagement.expiresAt"),
      dataIndex: "expiresAt",
      key: "expiresAt",
      render: (val: string) => {
        if (!val) return <Tag color="green">{t("adminUserManagement.permanent")}</Tag>;
        const date = dayjs(val);
        const isExpired = date.isBefore(dayjs());
        return (
          <Tag color={isExpired ? "red" : "blue"}>
            {date.format("YYYY-MM-DD")}
          </Tag>
        );
      },
    },
    {
      title: t("adminUserManagement.actions"),
      key: "action",
      render: (_: any, record: User) => (
        <Space>
          {!record.is_admin && (
            <>
              <Button
                size="small"
                onClick={() => {
                  setSelectedUserId(record.id as number);
                  setExpirationDays(null);
                  setExpirationModalVisible(true);
                }}
              >
                {t("adminUserManagement.setExpiration")}
              </Button>
              <Button
                size="small"
                danger
                onClick={() => handleDeleteUser(record.id as number)}
              >
                {t("common.delete")}
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div
      style={{ padding: 24, height: "100%", overflow: "auto" }}
      className={styles.trackListContainer}
    >
      <Flex justify="space-between">
        <Space style={{ marginBottom: 16 }}>
          <Button
            type="text"
            icon={<LeftOutlined />}
            onClick={() => navigate(-1)}
          >
            {t("header.back")}
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            {t("adminUserManagement.title")}
          </Title>
        </Space>
        <div style={{ marginTop: 16 }}>
          <Space style={{ marginBottom: 16 }}>
            <Button onClick={fetchUsers}>{t("common.refresh")}</Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              {t("adminUserManagement.createUser")}
            </Button>
          </Space>
        </div>
      </Flex>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {contextHolder}
      {messageContextHolder}

      <Modal
        title={t("adminUserManagement.createUserTitle")}
        open={createModalVisible}
        onOk={handleCreateUser}
        onCancel={() => setCreateModalVisible(false)}
        okText={t("common.confirm")}
        cancelText={t("common.cancel")}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="username"
            label={t("adminUserManagement.usernameLabel")}
            rules={[{ required: true, message: t("adminUserManagement.usernameRequired") }]}
          >
            <Input placeholder={t("adminUserManagement.usernamePlaceholder")} />
          </Form.Item>
          <Form.Item
            name="password"
            label={t("adminUserManagement.passwordLabel")}
            rules={[{ required: true, message: t("adminUserManagement.passwordRequired") }]}
          >
            <Input.Password placeholder={t("adminUserManagement.passwordPlaceholder")} />
          </Form.Item>
          <Form.Item name="is_admin" valuePropName="checked">
            <Checkbox>{t("adminUserManagement.setAsAdmin")}</Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t("adminUserManagement.setExpirationTitle")}
        open={expirationModalVisible}
        onOk={handleSetExpiration}
        onCancel={() => setExpirationModalVisible(false)}
        okText={t("common.confirm")}
        cancelText={t("common.cancel")}
      >
        <div style={{ padding: "20px 0" }}>
          <p>{t("adminUserManagement.setExpirationHint")}</p>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Space>
              <Button
                type={expirationDays === 7 ? "primary" : "default"}
                onClick={() => setExpirationDays(7)}
              >
                {t("adminUserManagement.sevenDays")}
              </Button>
              <Button
                type={expirationDays === 30 ? "primary" : "default"}
                onClick={() => setExpirationDays(30)}
              >
                {t("adminUserManagement.thirtyDays")}
              </Button>
              <Button
                type={expirationDays === 365 ? "primary" : "default"}
                onClick={() => setExpirationDays(365)}
              >
                {t("adminUserManagement.oneYear")}
              </Button>
              <Button
                type={expirationDays === null ? "primary" : "default"}
                onClick={() => setExpirationDays(null)}
              >
                {t("adminUserManagement.permanent")}
              </Button>
            </Space>
          </Space>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;
