import { ConfigProvider } from "antd";
import { Navigate, Route, Routes } from "react-router-dom";
import Detail from "./components/Detail/index";
import Header from "./components/Header/index";
import Player from "./components/Player/index";
import Sidebar from "./components/Sidebar/index";
import { getThemeConfig } from "./config/themeConfig";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import Category from "./pages/Category/index";
import Favorites from "./pages/Favorites/index";
import Listened from "./pages/Listened/index";
import Recommended from "./pages/Recommended/index";

const AppContent = () => {
  const { mode } = useTheme();
  const themeConfig = getThemeConfig(mode);

  return (
    <ConfigProvider theme={themeConfig}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          width: "100vw",
          backgroundColor: "transparent", // Transparent background
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
            <Routes>
              <Route
                path="/"
                element={<Navigate to="/recommended" replace />}
              />
              <Route path="/recommended" element={<Recommended />} />
              <Route path="/detail" element={<Detail />} />
              <Route path="/category" element={<Category />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/listened" element={<Listened />} />
            </Routes>
          </div>
        </div>
        <Player />
      </div>
    </ConfigProvider>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
