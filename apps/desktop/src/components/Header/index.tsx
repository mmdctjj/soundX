import {
  CustomerServiceOutlined,
  DeleteOutlined,
  GithubOutlined,
  ImportOutlined,
  LeftOutlined,
  LogoutOutlined,
  MoonOutlined,
  ReadOutlined,
  ReloadOutlined,
  RetweetOutlined,
  RightOutlined,
  RollbackOutlined,
  SearchOutlined,
  SettingOutlined,
  SkinOutlined,
  SunOutlined,
} from "@ant-design/icons";
import { Flex, Input, Modal, Popover, theme, Tooltip } from "antd";
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMessage } from "../../context/MessageContext";
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
  const message = useMessage();
  const navigate = useNavigate();
  const location = useLocation();
  const { themeSetting, toggleTheme } = useTheme();
  const { token } = theme.useToken();
  const pollTimerRef = useRef<number | null>(null);
  const [modal, contextHolder] = Modal.useModal();

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
  const { logout, user } = useAuthStore();

  const handleLogout = () => {
    logout();
    message.success("已退出登录");
    // Optionally reload to reset app state
    window.location.reload();
  };

  // ... inside component
  const togglePlayMode = () => {
    document.body.style.transition = "transform 0.25s ease";
    document.body.style.transform = "scaleX(-1)"; // 开启
    setTimeout(() => {
      // 1. Save current path for the current mode
      const currentPath = location.pathname + location.search + location.hash;
      localStorage.setItem(`route_history_${playMode}`, currentPath);

      // 2. Determine new mode
      const newMode =
        playMode === TrackType.MUSIC ? TrackType.AUDIOBOOK : TrackType.MUSIC;

      // 3. Restore path for the new mode
      const savedPath = localStorage.getItem(`route_history_${newMode}`);
      // Default to root if no history, or maybe we want specific defaults per mode
      const targetPath = savedPath || "/";

      navigate(targetPath);
      setPlayMode(newMode);

      document.body.style.transform = ""; // 关闭
    }, 250);

    // Reload to apply changes globally if needed, though usePlayMode handles reactivity
    // window.location.reload(); // Removed reload as we now have reactive state
  };

  const iconStyle = { color: token.colorTextSecondary };
  const actionIconStyle = { color: token.colorText };

  const handleUpdateLibrary = async (mode: "incremental" | "full") => {
    message.loading(
      `${mode === "incremental" ? "增量" : "全量"}更新任务创建中...`
    );

    try {
      const res = await createImportTask({ mode });
      if (res.code === 200 && res.data) {
        const taskId = res.data.id;
        message.success("任务创建成功，开始更新...");

        // Clear previous timer if any
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);

        pollTimerRef.current = setInterval(() => {
          pollTaskStatus(taskId);
        }, 2000);
      } else {
        message.error(res.message || "任务创建失败");
      }
    } catch (error) {
      console.error("Task creation error:", error);
      message.error("创建任务失败，请检查网络或后端服务");
    }
  };

  const pollTaskStatus = async (taskId: string) => {
    try {
      const res = await getImportTask(taskId);
      if (res.code === 200 && res.data) {
        const { status, message: taskMsg, total } = res.data;
        if (status === TaskStatus.SUCCESS) {
          message.success(`导入成功！共导入 ${total} 首歌曲`);
          // Don't reset fields to keep the saved paths
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        } else if (status === TaskStatus.FAILED) {
          message.error(`导入失败: ${taskMsg}`);
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
        <Tooltip
          title={
            themeSetting === "dark"
              ? "切换至亮色模式"
              : themeSetting === "light"
                ? "切换至跟随系统"
                : "切换至暗色模式"
          }
        >
          <div
            className={styles.actionIcon}
            style={actionIconStyle}
            onClick={toggleTheme}
          >
            {themeSetting === "dark" ? (
              <MoonOutlined />
            ) : themeSetting === "light" ? (
              <SunOutlined />
            ) : (
              <span style={{ fontSize: "12px", fontWeight: "bold" }}>Auto</span>
            )}
          </div>
        </Tooltip>
        <Popover
          content={
            <div className={styles.userMenu}>
              <div className={styles.userMenuItem}>
                嗨！{user?.username || "未知"}
              </div>
              <div
                className={styles.userMenuItem}
                onClick={() => {
                  if (window.ipcRenderer) {
                    window.ipcRenderer?.openExternal(
                      "https://github.com/mmdctjj/AudioDock"
                    );
                  } else {
                    window.open(
                      "https://github.com/mmdctjj/AudioDock",
                      "_blank"
                    );
                  }
                }}
              >
                <GithubOutlined />求 Star！！！
              </div>
              <div
                className={styles.userMenuItem}
                onClick={() => {
                  modal.confirm({
                    title: "确认增量更新？",
                    content: "增量更新只增加新数据，不删除旧数据",
                    okText: "确认更新",
                    cancelText: "取消",
                    onOk: () => handleUpdateLibrary("incremental"),
                  });
                }}
              >
                <RollbackOutlined />
                增量更新音频文件
              </div>
              <div
                className={styles.userMenuItem}
                onClick={() => {
                  modal.confirm({
                    title: "确认全量更新？",
                    content:
                      "全量更新将清空所有歌曲、专辑、艺术家、播放列表以及您的播放历史和收藏记录！此操作不可恢复。",
                    okText: "确认清空并更新",
                    cancelText: "取消",
                    onOk: () => handleUpdateLibrary("full"),
                  });
                }}
              >
                <RetweetOutlined />
                全量更新音频文件
              </div>
              <div className={styles.userMenuItem}>
                <DeleteOutlined />
                清空缓存文件
              </div>

              <div
                className={styles.userMenuItem}
                onClick={() => navigate("/settings")}
              >
                <SettingOutlined className={styles.actionIcon} />
                设置
              </div>

              <div className={styles.userMenuItem} onClick={handleLogout}>
                <LogoutOutlined />
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
                alt="avatar"
              />
            </div>
          </Flex>
        </Popover>
      </div>
      {contextHolder}
    </div>
  );
};

export default Header;
