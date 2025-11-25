import type { Album } from "@soundx/db"
import { Skeleton, Typography } from "antd"
import React from "react"
import { useNavigate } from "react-router-dom"
const { Title, Text } = Typography

interface CoverComponent extends React.FC<{ item: Album }> {
  Skeleton: React.FC
}

const Cover: CoverComponent = ({ item }) => {
  const navigate = useNavigate()

  return (
    <div style={{ cursor: 'pointer' }} onClick={() => navigate('/detail')}>
      <div style={{
        width: '100%',
        aspectRatio: '1/1',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '12px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
      }}>
        <img src={item.cover ?? ''} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <Title level={5} style={{ color: 'white', margin: '0 0 4px 0' }}>{item.name}</Title>
      <Text style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{item.artist}</Text>
    </div>
  )
}

// Skeleton component as a static property
Cover.Skeleton = () => {
  return (
    <div>
      <div style={{
        width: '100%',
        aspectRatio: '1/1',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '12px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
      }}>
        <Skeleton.Node
          active
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          <div style={{ width: '100%', height: '100%' }} />
        </Skeleton.Node>
      </div>
      <Skeleton
        active
        title={{ width: '80%', style: { height: '20px', marginBottom: '8px' } }}
        paragraph={{ rows: 1, width: '60%' }}
      />
    </div>
  )
}

export default Cover