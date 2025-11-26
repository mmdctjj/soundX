import { ConfigProvider } from "antd";
import { Navigate, Route, Routes } from "react-router-dom";
import Detail from "./components/Detail";
import Header from "./components/Header";
import Player from "./components/Player";
import Sidebar from "./components/Sidebar";
import { getThemeConfig } from "./config/themeConfig";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import Category from "./pages/Category";
import Favorites from "./pages/Favorites";
import Listened from "./pages/Listened";
import Recommended from "./pages/Recommended";

const AppContent = () => {
  const { mode } = useTheme();
  const themeConfig = getThemeConfig(mode);

  const backgroundStyle =
    mode === "dark"
      ? {
          background: "linear-gradient(45deg, #4a4a5e, #2b2b3a)",
          backgroundImage:
            "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : {
          background: "#f0f2f5",
          backgroundImage:
            "url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2564&auto=format&fit=crop')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        };

  return (
    <ConfigProvider theme={themeConfig}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          width: "100vw",
          ...backgroundStyle,
          color: themeConfig.token?.colorText,
          transition: "background 0.3s ease",
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
