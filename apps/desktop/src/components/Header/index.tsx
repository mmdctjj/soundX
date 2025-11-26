import {
  CustomerServiceOutlined,
  ImportOutlined,
  LeftOutlined,
  MoonOutlined,
  ReadOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
  SkinOutlined,
  SunOutlined,
} from "@ant-design/icons";
import { Form, Input, message, Modal, theme, Tooltip } from "antd";
import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import {
  createImportTask,
  getImportTask,
  TaskStatus,
} from "../../services/import";
import styles from "./index.module.less";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { mode, toggleTheme } = useTheme();
  const { token } = theme.useToken();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const pollTimerRef = useRef<number | null>(null);

  // Mode state: 'music' | 'audiobook'
  const [playMode, setPlayMode] = React.useState<"music" | "audiobook">(() => {
    return (
      (localStorage.getItem("playMode") as "music" | "audiobook") || "music"
    );
  });

  const togglePlayMode = () => {
    const newMode = playMode === "music" ? "audiobook" : "music";
    setPlayMode(newMode);
    localStorage.setItem("playMode", newMode);
  };

  const iconStyle = { color: token.colorTextSecondary };
  const actionIconStyle = { color: token.colorText };

  const handleImportClick = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  const pollTaskStatus = async (taskId: string) => {
    try {
      const res = await getImportTask(taskId);
      if (res.code === 200 && res.data) {
        const { status, message: taskMsg, total } = res.data;
        if (status === TaskStatus.SUCCESS) {
          message.success(`导入成功！共导入 ${total} 首歌曲`);
          setLoading(false);
          setIsModalOpen(false);
          form.resetFields();
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        } else if (status === TaskStatus.FAILED) {
          message.error(`导入失败: ${taskMsg}`);
          setLoading(false);
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        } else {
          // Continue polling
          // Optional: Update loading message with progress
          // message.loading(`正在导入... ${current}/${total}`, 1);
        }
      }
    } catch (error) {
      console.error("Poll error:", error);
      // Don't stop polling on transient network errors, but maybe limit retries?
      // For simplicity, we just log.
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const res = await createImportTask(values);
      if (res.code === 200 && res.data) {
        const taskId = res.data.id;
        message.success("任务创建成功，开始导入...");

        // Start polling
        pollTimerRef.current = setInterval(() => {
          pollTaskStatus(taskId);
        }, 2000);
      } else {
        message.error(res.message || "任务创建失败");
        setLoading(false);
      }
    } catch (error) {
      console.error("Submit error:", error);
      setLoading(false);
    }
  };

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  return (
    <div className={styles.header}>
      {/* Navigation Controls */}
      <div className={styles.navControls}>
        <div className={styles.navGroup}>
          <Tooltip title="后退">
            <LeftOutlined
              onClick={() => navigate(-1)}
              className={styles.navIcon}
              style={iconStyle}
            />
          </Tooltip>
          <Tooltip title="前进">
            <RightOutlined
              onClick={() => navigate(1)}
              className={styles.navIcon}
              style={iconStyle}
            />
          </Tooltip>
          <Tooltip title="刷新">
            <ReloadOutlined
              onClick={() => window.location.reload()}
              className={styles.navIcon}
              style={iconStyle}
            />
          </Tooltip>
        </div>
      </div>

      {/* Search Bar */}
      <div className={styles.searchBar}>
        <Input
          prefix={
            <SearchOutlined style={{ color: token.colorTextSecondary }} />
          }
          placeholder="HLE官宣Gumayusi加盟"
          bordered={false}
          className={styles.searchInput}
          style={{ color: token.colorText }}
        />
      </div>

      {/* User Actions */}
      <div className={styles.userActions}>
        <Tooltip
          title={playMode === "music" ? "切换至有声书模式" : "切换至音乐模式"}
        >
          <div
            onClick={togglePlayMode}
            className={styles.actionIcon}
            style={actionIconStyle}
          >
            {playMode === "music" ? (
              <CustomerServiceOutlined />
            ) : (
              <ReadOutlined />
            )}
          </div>
        </Tooltip>
        <Tooltip title="导入">
          <ImportOutlined
            className={styles.actionIcon}
            style={actionIconStyle}
            onClick={handleImportClick}
          />
        </Tooltip>
        <Tooltip title="主题">
          <SkinOutlined className={styles.actionIcon} style={actionIconStyle} />
        </Tooltip>
        <Tooltip title={mode === "dark" ? "切换至亮色模式" : "切换至暗色模式"}>
          <div
            onClick={toggleTheme}
            className={styles.actionIcon}
            style={actionIconStyle}
          >
            {mode === "dark" ? <SunOutlined /> : <MoonOutlined />}
          </div>
        </Tooltip>
        <div className={styles.avatar}>
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
            alt="avatar"
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </div>

      <Modal
        title="导入音乐 (WebDAV)"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="webdavUrl"
            label="WebDAV 地址"
            rules={[{ required: true, message: "请输入 WebDAV 地址" }]}
          >
            <Input placeholder="http://example.com/webdav" />
          </Form.Item>
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input placeholder="Username" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password placeholder="Password" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Header;
