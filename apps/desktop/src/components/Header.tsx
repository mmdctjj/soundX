import { ImportOutlined, LeftOutlined, ReloadOutlined, RightOutlined, SearchOutlined, SkinOutlined, SunOutlined } from '@ant-design/icons'
import { Input } from 'antd'
import React from 'react'
import { useNavigate } from 'react-router-dom'

const Header: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div style={{
      height: '64px',
      padding: '0 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'var(--glass-bg)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      zIndex: 100,
    }}>
      {/* Navigation Controls */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div style={{
          borderRadius: '20px',
          backgroundColor: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '10px 15px',
          display: 'flex',
          gap: '15px',
          alignItems: 'center'
        }}>
          <LeftOutlined onClick={() => navigate(-1)} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} />
          <RightOutlined onClick={() => navigate(1)} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} />
          <ReloadOutlined onClick={() => window.location.reload()} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} />
        </div>
      </div>

      {/* Search Bar */}
      <div style={{
        flex: 1,
        maxWidth: '400px',
        backgroundColor: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        margin: '0 20px',
        borderRadius: '20px',
        padding: '5px',
      }}>
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
          placeholder="HLE官宣Gumayusi加盟"
          bordered={false}
          style={{
            borderRadius: '20px',
            color: 'var(--text-primary)'
          }}
        />
      </div>

      {/* User Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <ImportOutlined style={{ fontSize: '18px', color: 'var(--text-primary)', cursor: 'pointer' }} />
        <SkinOutlined style={{ fontSize: '18px', color: 'var(--text-primary)', cursor: 'pointer' }} />
        <SunOutlined style={{ fontSize: '18px', color: 'var(--text-primary)', cursor: 'pointer' }} />
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: '#ddd',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Placeholder for Avatar */}
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    </div>
  )
}

export default Header
