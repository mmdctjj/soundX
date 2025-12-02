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
import {
  Flex,
  Form,
  Input,
  message,
  Modal,
  Popover,
  theme,
  Tooltip,
} from "antd";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { TrackType } from "../../models";
import {
  createImportTask,
  getImportTask,
  TaskStatus,
} from "../../services/import";
import {
  searchAll,
  type SearchResults as SearchResultsType,
} from "../../services/search";
import { useAuthStore } from "../../store/auth";
import { isWindows } from "../../utils/platform";
import { usePlayMode } from "../../utils/playMode";
import SearchResults from "../SearchResults";
import styles from "./index.module.less";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { mode, toggleTheme } = useTheme();
  const { token } = theme.useToken();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const pollTimerRef = useRef<number | null>(null);

  // Search state
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultsType | null>(
    null
  );
  const [showResults, setShowResults] = useState(false);
  const searchTimerRef = useRef<number | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Mode state: 'music' | 'audiobook'
  const { mode: playMode, setMode: setPlayMode } = usePlayMode();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    message.success("已退出登录");
    // Optionally reload to reset app state
    window.location.reload();
  };

  // ... inside component
  const togglePlayMode = () => {
    const newMode =
      playMode === TrackType.MUSIC ? TrackType.AUDIOBOOK : TrackType.MUSIC;
    setPlayMode(newMode);
    // Reload to apply changes globally if needed, though usePlayMode handles reactivity
    // window.location.reload(); // Removed reload as we now have reactive state
  };

  const iconStyle = { color: token.colorTextSecondary };
  const actionIconStyle = { color: token.colorText };

  const handleImportClick = () => {
    setIsModalOpen(true);
    // Load saved paths from localStorage
    const savedPaths = localStorage.getItem("importPaths");
    if (savedPaths) {
      try {
        const paths = JSON.parse(savedPaths);
        form.setFieldsValue(paths);
      } catch (e) {
        console.error("Failed to load saved paths:", e);
      }
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    // Don't reset fields to keep the values
  };

  const pollTaskStatus = async (taskId: string) => {
    try {
      // Get serverAddress from localStorage
      const savedPaths = localStorage.getItem("importPaths");
      let serverAddress: string | undefined;
      if (savedPaths) {
        try {
          const paths = JSON.parse(savedPaths);
          serverAddress = paths.serverAddress;
        } catch (e) {
          console.error("Failed to parse saved paths:", e);
        }
      }

      const res = await getImportTask(taskId, serverAddress);
      if (res.code === 200 && res.data) {
        const { status, message: taskMsg, total } = res.data;
        if (status === TaskStatus.SUCCESS) {
          message.success(`导入成功！共导入 ${total} 首歌曲`);
          setLoading(false);
          setIsModalOpen(false);
          // Don't reset fields to keep the saved paths
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

        // Save paths to localStorage
        localStorage.setItem("importPaths", JSON.stringify(values));

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

  // Search handlers
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchKeyword(value);

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    if (value.trim()) {
      searchTimerRef.current = setTimeout(async () => {
        try {
          const type = playMode;
          const results = await searchAll(value.trim(), type);
          setSearchResults(results);
          setShowResults(true);
        } catch (error) {
          console.error("Search error:", error);
        }
      }, 300);
    } else {
      setSearchResults(null);
      setShowResults(false);
    }
  };

  const handleCloseSearch = () => {
    setShowResults(false);
  };

  // Click outside to close search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
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
      <div className={styles.searchBar} ref={searchContainerRef}>
        <Input
          prefix={
            <SearchOutlined style={{ color: token.colorTextSecondary }} />
          }
          placeholder="搜索单曲、艺术家、专辑"
          bordered={false}
          className={styles.searchInput}
          style={{ color: token.colorText }}
          value={searchKeyword}
          onChange={handleSearchChange}
          onFocus={() => {
            if (searchResults) {
              setShowResults(true);
            }
          }}
        />
        {showResults && searchResults && (
          <SearchResults results={searchResults} onClose={handleCloseSearch} />
        )}
      </div>

      {/* User Actions */}
      <div className={styles.userActions}>
        <Tooltip
          title={
            playMode === TrackType.MUSIC ? "切换至有声书模式" : "切换至音乐模式"
          }
        >
          <div
            onClick={togglePlayMode}
            className={styles.actionIcon}
            style={actionIconStyle}
          >
            {playMode === TrackType.MUSIC ? (
              <CustomerServiceOutlined />
            ) : (
              <ReadOutlined />
            )}
          </div>
        </Tooltip>
        <Tooltip title="mini播放器">
          <ImportOutlined
            className={styles.actionIcon}
            style={actionIconStyle}
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
                style={{
                  cursor: "pointer",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  backgroundColor: "transparent",
                }}
                onClick={handleImportClick}
              >
                数据源设置
              </div>
              <div
                style={{
                  cursor: "pointer",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  backgroundColor: "transparent",
                }}
              >
                清空缓存文件
              </div>
              <div
                style={{
                  cursor: "pointer",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  backgroundColor: "transparent",
                }}
                onClick={handleLogout}
              >
                退出登陆
              </div>
            </div>
          }
        >
          <Flex
            gap={12}
            align="center"
            style={{ paddingRight: isWindows() ? "140px" : "0" }}
          >
            <div className={styles.avatar}>
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          </Flex>
        </Popover>
      </div>

      <Modal
        title="数据源设置"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="serverAddress"
            label="服务端地址"
            rules={[
              { required: true, message: "请输入服务端地址" },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  if (
                    value.startsWith("http://") ||
                    value.startsWith("https://")
                  ) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("服务端地址必须以 http:// 或 https:// 开头")
                  );
                },
              },
            ]}
          >
            <Input placeholder="http://localhost:3000" />
          </Form.Item>
          <Form.Item
            name="musicPath"
            label="音乐目录 (绝对路径)"
            rules={[{ required: true, message: "请输入音乐目录路径" }]}
          >
            <Input placeholder="/Users/username/Music" />
          </Form.Item>
          <Form.Item
            name="audiobookPath"
            label="有声书目录 (绝对路径)"
            rules={[{ required: true, message: "请输入有声书目录路径" }]}
          >
            <Input placeholder="/Users/username/Audiobooks" />
          </Form.Item>
          <Form.Item
            name="cachePath"
            label="缓存目录 (绝对路径)"
            rules={[{ required: true, message: "请输入缓存目录路径" }]}
          >
            <Input placeholder="/Users/username/.soundx/cache" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Header;
