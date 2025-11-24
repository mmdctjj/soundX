import { Navigate, Route, Routes } from 'react-router-dom'
import Detail from './components/Detail'
import Header from './components/Header'
import Player from './components/Player'
import Sidebar from './components/Sidebar'
import Category from './pages/Category'
import Favorites from './pages/Favorites'
import Listened from './pages/Listened'
import Recommended from './pages/Recommended'

function App() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      // Background is handled by body in global.css
    }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Header />
          <Routes>
            <Route path="/" element={<Navigate to="/recommended" replace />} />
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
  )
}

export default App
