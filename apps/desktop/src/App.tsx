import { ConfigProvider, Flex, message, Skeleton } from "antd";
import zhCN from "antd/locale/zh_CN";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Cover from "./components/Cover";
import Header from "./components/Header/index";
import LoginModal from "./components/LoginModal";
import Player from "./components/Player/index";
import Sidebar from "./components/Sidebar/index";
import { getThemeConfig } from "./config/themeConfig";
import { MessageProvider } from "./context/MessageContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import LyricWindow from "./pages/LyricWindow";
import Recommended from "./pages/Recommended";

const ArtistDetail = lazy(() => import("./pages/ArtistDetail"));
const ArtistList = lazy(() => import("./pages/ArtistList"));
const Category = lazy(() => import("./pages/Category"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Listened = lazy(() => import("./pages/Listened"));
const PlaylistDetail = lazy(() => import("./pages/PlaylistDetail"));
const Detail = lazy(() => import("./components/Detail/index"));
const Settings = lazy(() => import("./pages/Settings/index"));

import { useEffect } from "react";
import InviteListener from "./components/InviteListener";
import { socketService } from "./services/socket";
import { useAuthStore } from "./store/auth";
import { useSettingsStore, type SettingsState } from "./store/settings";

// ... existing imports

const AppContent = () => {
  const { mode } = useTheme();
  const themeConfig = getThemeConfig(mode);
  const [messageApi, contextHolder] = message.useMessage();
  const { token, user } = useAuthStore();

  useEffect(() => {
    if (token && user) {
      socketService.connect();
    } else {
      socketService.disconnect();
    }
  }, [token, user]);

  // Sync settings on startup
  const settings = useSettingsStore((state: SettingsState) => state);
  const { autoLaunch, minimizeToTray } = settings.general;

  useEffect(() => {
    if ((window as any).ipcRenderer) {
      (window as any).ipcRenderer.invoke('set-auto-launch', autoLaunch);
      (window as any).ipcRenderer.send('settings:update-minimize-to-tray', minimizeToTray);
    }
  }, []);

  const isLyricWindow = window.location.hash.includes("/lyric");

  if (isLyricWindow) {
    return (
      <ConfigProvider theme={themeConfig} locale={zhCN}>
        <LyricWindow />
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider theme={themeConfig} locale={zhCN}>
      {contextHolder}
      <MessageProvider messageApi={messageApi}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            width: "100vw",
            backgroundColor: mode !== "light" ? "#000" : "transparent", // Transparent background
            color: themeConfig.token?.colorText,
          }}
        >
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            <Sidebar />
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <Header />
              <Suspense
                fallback={
                  <Flex vertical style={{ width: "100%" }} gap={16}>
                    {[1, 2, 3].map((sectionIndex) => (
                      <Flex
                        vertical
                        style={{ width: "100%" }}
                        key={sectionIndex}
                      >
                        <div>
                          <Skeleton.Node />
                        </div>
                        <div>
                          {Array.from({ length: 8 }).map((_, index) => (
                            <Cover.Skeleton
                              key={`skeleton-${sectionIndex}-${index}`}
                            />
                          ))}
                        </div>
                      </Flex>
                    ))}
                  </Flex>
                }
              >
                <Routes>
                  <Route
                    path="/"
                    element={<Navigate to="/recommended" replace />}
                  />
                  <Route path="/recommended" element={<Recommended />} />
                  <Route path="/detail" element={<Detail />} />
                  <Route path="/artist/:id" element={<ArtistDetail />} />
                  <Route path="/category" element={<Category />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/listened" element={<Listened />} />
                  <Route path="/artists" element={<ArtistList />} />
                  <Route path="/playlist/:id" element={<PlaylistDetail />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </Suspense>
            </div>
          </div>
          <Player />
        </div>
        <LoginModal />
        <InviteListener />
      </MessageProvider>
    </ConfigProvider>
  );
};

// ... existing imports

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
