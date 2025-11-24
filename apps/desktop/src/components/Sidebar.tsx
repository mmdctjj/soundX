import { AppstoreOutlined, CompassOutlined, CustomerServiceOutlined, HeartOutlined, PlusOutlined, SoundOutlined } from '@ant-design/icons'
import { Typography } from 'antd'
import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const { Text, Title } = Typography

const Sidebar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <div className='sidebar' style={{
      width: '250px',
      backgroundColor: 'var(--glass-bg)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      padding: '20px',
      paddingTop: 30,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      color: 'var(--text-primary)'
    }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ color: 'white', margin: 0 }}>Sond X</Title>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
        <MenuItem icon={<CompassOutlined />} text="推荐" onClick={() => navigate('/recommended')} active={isActive('/recommended')} />
        <MenuItem icon={<AppstoreOutlined />} text="分类" onClick={() => navigate('/category')} active={isActive('/category')} />
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={5} style={{ color: 'white', margin: 0 }}>播放列表</Title>
        <CustomerServiceOutlined style={{ color: 'var(--text-secondary)' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto' }}>
        <MenuItem icon={<HeartOutlined />} text="收藏" onClick={() => navigate('/favorites')} active={isActive('/favorites')} />
        <MenuItem icon={<SoundOutlined />} text="听过" onClick={() => navigate('/listened')} active={isActive('/listened')} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: 'var(--text-secondary)', cursor: 'pointer', marginTop: '10px' }}>
          <div style={{ width: '24px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PlusOutlined style={{ fontSize: '14px' }} />
          </div>
          <Text style={{ color: 'inherit' }}>添加播放列表</Text>
        </div>
      </div>
    </div>
  )
}

const MenuItem = ({ icon, text, active = false, onClick }: { icon: React.ReactNode, text: string, active?: boolean, onClick?: () => void }) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      cursor: 'pointer',
      padding: '8px 12px',
      borderRadius: '8px',
      backgroundColor: active ? 'rgba(255,255,255,0.1)' : 'transparent',
      transition: 'background-color 0.2s, color 0.2s'
    }}
  >
    <span style={{ fontSize: '20px' }}>{icon}</span>
    <Text style={{ color: 'inherit' }}>{text}</Text>
  </div>
)

export default Sidebar
