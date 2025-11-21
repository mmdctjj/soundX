import Player from './components/Player'
import PodcastList from './components/PodcastList'
import Sidebar from './components/Sidebar'

function App() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      width: '100vw',
      backgroundColor: 'var(--bg-color)' 
    }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <PodcastList />
      </div>
      <Player />
    </div>
  )
}

export default App
