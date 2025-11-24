import { Typography } from 'antd'
import React from 'react'

const { Title, Text } = Typography

const playlists = [
  { title: 'Woh Pehli Dafa', artist: 'DZ Messili', image: 'https://picsum.photos/seed/1/300/300' },
  { title: 'Hollywood', artist: 'Babbu Maan', image: 'https://picsum.photos/seed/2/300/300' },
  { title: 'The Egyptian', artist: 'Apple Music Dance', image: 'https://picsum.photos/seed/3/300/300' },
  { title: 'Lucky You', artist: 'Chance Music', image: 'https://picsum.photos/seed/4/300/300' },
  { title: 'No Love', artist: 'Mark Dohnewr', image: 'https://picsum.photos/seed/5/300/300' },
  { title: 'If You', artist: 'Mayorkun', image: 'https://picsum.photos/seed/6/300/300' },
  { title: 'Elevated', artist: 'Shubh', image: 'https://picsum.photos/seed/7/300/300' },
  { title: 'Brown Munde', artist: 'Ap Dhillon', image: 'https://picsum.photos/seed/8/300/300' },
]

import { useNavigate } from 'react-router-dom'

const Recommended: React.FC = () => {
  const navigate = useNavigate()
  return (
    <div style={{
      flex: 1,
      padding: '30px',
      overflowY: 'auto',
      backgroundColor: 'var(--glass-bg)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>
      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '30px'
      }}>
        {playlists.map((item, index) => (
          <div key={index} style={{ cursor: 'pointer' }} onClick={() => navigate('/detail')}>
            <div style={{
              width: '100%',
              aspectRatio: '1/1',
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '12px',
              boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
            }}>
              <img src={item.image} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <Title level={5} style={{ color: 'white', margin: '0 0 4px 0' }}>{item.title}</Title>
            <Text style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{item.artist}</Text>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Recommended
