import { FireOutlined, HomeOutlined, PlusOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons'
import { Typography } from 'antd'
import React from 'react'

const { Text } = Typography

const Sidebar: React.FC = () => {
  return (
    <div style={{
      width: '250px',
      backgroundColor: 'var(--sidebar-bg)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      borderRight: '1px solid var(--border-color)'
    }}>
      <div style={{ marginBottom: '40px' }}>
        {/* Logo or Brand could go here */}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: 'var(--text-primary)', cursor: 'pointer' }}>
          <HomeOutlined style={{ fontSize: '20px' }} />
          <Text strong style={{ color: 'inherit' }}>Home</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <FireOutlined style={{ fontSize: '20px' }} />
          <Text style={{ color: 'inherit' }}>Trending</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <UserOutlined style={{ fontSize: '20px' }} />
          <Text style={{ color: 'inherit' }}>Following</Text>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Text style={{ color: 'var(--text-secondary)' }}>Your playlist (9)</Text>
        <div style={{ display: 'flex', gap: '10px' }}>
          <SearchOutlined style={{ color: 'var(--text-secondary)' }} />
          <PlusOutlined style={{ color: 'var(--text-secondary)' }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto' }}>
        {['How to Start Podcast', 'Late Night Horror', 'Business Improvement', 'Chit Chat Enter', 'PRO Gamer Podcast', 'Small Talk 101'].map((item, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
             <div style={{ width: '30px', height: '30px', backgroundColor: '#333', borderRadius: '4px' }}></div>
             <div style={{ display: 'flex', flexDirection: 'column' }}>
               <Text style={{ color: index === 0 ? 'var(--accent-color)' : 'var(--text-primary)', fontSize: '12px' }}>{item}</Text>
               <Text style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>31 podcast • by user</Text>
             </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Sidebar
