import { PlayCircleFilled, RetweetOutlined, SoundOutlined, StepBackwardOutlined, StepForwardOutlined, SwapOutlined } from '@ant-design/icons'
import { Slider, Typography } from 'antd'
import React from 'react'

const { Text } = Typography

const Player: React.FC = () => {
  return (
    <div style={{
      height: '90px',
      backgroundColor: 'var(--player-bg)',
      borderTop: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      justifyContent: 'space-between'
    }}>
      {/* Song Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', width: '250px' }}>
        <div style={{ width: '50px', height: '50px', backgroundColor: '#333', borderRadius: '4px' }}></div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Text style={{ color: 'var(--text-primary)' }}>How to make your partner...</Text>
          <Text style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Ken Adams</Text>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '5px' }}>
          <SwapOutlined style={{ color: 'var(--text-secondary)', fontSize: '16px' }} />
          <StepBackwardOutlined style={{ color: 'var(--text-primary)', fontSize: '20px' }} />
          <PlayCircleFilled style={{ color: 'var(--accent-color)', fontSize: '40px' }} />
          <StepForwardOutlined style={{ color: 'var(--text-primary)', fontSize: '20px' }} />
          <RetweetOutlined style={{ color: 'var(--text-secondary)', fontSize: '16px' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '60%' }}>
          <Text style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>03:41</Text>
          <Slider 
            defaultValue={30} 
            tooltip={{ open: false }} 
            style={{ flex: 1, margin: 0 }}
            trackStyle={{ backgroundColor: 'var(--text-primary)' }}
            railStyle={{ backgroundColor: '#333' }}
            handleStyle={{ display: 'none' }}
          />
          <Text style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>12:11</Text>
        </div>
      </div>

      {/* Volume */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '150px', justifyContent: 'flex-end' }}>
        <SoundOutlined style={{ color: 'var(--text-primary)' }} />
        <Slider 
          defaultValue={70} 
          style={{ width: '80px', margin: 0 }}
          trackStyle={{ backgroundColor: 'var(--text-primary)' }}
          railStyle={{ backgroundColor: '#333' }}
        />
      </div>
    </div>
  )
}

export default Player
