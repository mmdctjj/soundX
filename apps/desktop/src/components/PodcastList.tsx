import { CheckCircleFilled, DownloadOutlined, MoreOutlined, PlayCircleFilled, SearchOutlined, ShareAltOutlined } from '@ant-design/icons'
import { Avatar, Button, Table, Typography } from 'antd'
import React from 'react'

const { Title, Text } = Typography

const data = [
  { key: '1', title: 'Find topic that you love', playlist: 'How to Start Podcast', plays: '2,412', time: '08:12', image: 'https://picsum.photos/40' },
  { key: '2', title: 'Invite your friends instead', playlist: 'How to Start Podcast', plays: '2,341', time: '18:11', image: 'https://picsum.photos/41' },
  { key: '3', title: 'How to make your partner talk more', playlist: 'How to Start Podcast', plays: '1,212', time: '12:11', image: 'https://picsum.photos/42' },
  { key: '4', title: 'Invest in podcast tools', playlist: 'How to Start Podcast', plays: '3,123', time: '18:31', image: 'https://picsum.photos/43' },
]

const columns = [
  {
    title: '',
    dataIndex: 'play',
    key: 'play',
    width: 50,
    render: () => <PlayCircleFilled style={{ color: 'var(--text-primary)', fontSize: '20px', cursor: 'pointer' }} />,
  },
  {
    title: 'Title',
    dataIndex: 'title',
    key: 'title',
    render: (text: string, record: any) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Avatar shape="square" size={40} src={record.image} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Text style={{ color: 'var(--text-primary)' }}>{text}</Text>
          <Text style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Ken Adams</Text>
        </div>
      </div>
    ),
  },
  {
    title: 'Playlist',
    dataIndex: 'playlist',
    key: 'playlist',
    render: (text: string) => <Text style={{ color: 'var(--text-secondary)' }}>{text}</Text>,
  },
  {
    title: 'Plays',
    dataIndex: 'plays',
    key: 'plays',
    render: (text: string) => <Text style={{ color: 'var(--text-secondary)' }}>{text}</Text>,
  },
  {
    title: 'Time',
    dataIndex: 'time',
    key: 'time',
    render: (text: string) => <Text style={{ color: 'var(--text-secondary)' }}>{text}</Text>,
  },
  {
    title: '',
    key: 'action',
    render: () => <MoreOutlined style={{ color: 'var(--text-secondary)', cursor: 'pointer' }} />,
  },
]

const PodcastList: React.FC = () => {
  return (
    <div style={{ flex: 1, padding: '20px', overflowY: 'auto', backgroundColor: 'var(--bg-color)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button type="text" icon={<span style={{ fontSize: '20px' }}>{'<'}</span>} style={{ color: 'var(--text-primary)' }} />
        </div>
        <div style={{ flex: 1, maxWidth: '600px', margin: '0 20px', position: 'relative' }}>
          <SearchOutlined style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', zIndex: 1 }} />
          <input 
            type="text" 
            placeholder="I want to listen..." 
            style={{ 
              width: '100%', 
              backgroundColor: '#2a2a35', 
              border: 'none', 
              borderRadius: '20px', 
              padding: '10px 10px 10px 35px', 
              color: 'var(--text-primary)',
              outline: 'none'
            }} 
          />
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Button shape="circle" icon={<CheckCircleFilled />} style={{ backgroundColor: '#333', border: 'none', color: 'var(--text-primary)' }} />
          <Avatar src="https://picsum.photos/50" />
        </div>
      </div>

      {/* Banner */}
      <div style={{ 
        height: '250px', 
        borderRadius: '20px', 
        background: 'linear-gradient(90deg, rgba(30,30,40,1) 0%, rgba(50,50,70,1) 100%)', 
        marginBottom: '30px',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        padding: '40px'
      }}>
        {/* Background Image Placeholder */}
        <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: '60%', background: 'url(https://picsum.photos/800/400) center/cover', opacity: 0.5, maskImage: 'linear-gradient(to right, transparent, black)' }}></div>
        
        <div style={{ zIndex: 1, maxWidth: '50%' }}>
          <Title level={2} style={{ color: 'white', margin: 0 }}>How to start podcast <CheckCircleFilled style={{ color: '#1890ff', fontSize: '20px' }} /></Title>
          <Text style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '20px' }}>40,142 Monthly Listeners</Text>
          <Button type="primary" style={{ backgroundColor: 'var(--accent-color)', border: 'none', height: '40px', padding: '0 30px', borderRadius: '20px' }}>Follow</Button>
        </div>
      </div>

      {/* Controls & List */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '15px' }}>
          <Button type="primary" shape="circle" icon={<PlayCircleFilled />} size="large" style={{ backgroundColor: 'var(--accent-color)', border: 'none' }} />
          <Button shape="circle" icon={<ShareAltOutlined />} style={{ backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
          <Button shape="circle" icon={<DownloadOutlined />} style={{ backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <SearchOutlined style={{ color: 'var(--text-primary)' }} />
          <Text style={{ color: 'var(--text-secondary)' }}>Order by</Text>
        </div>
      </div>

      <Table 
        dataSource={data} 
        columns={columns} 
        pagination={false} 
        rowClassName="podcast-row"
        onRow={(_record) => ({
          style: { backgroundColor: 'transparent', borderBottom: '1px solid var(--border-color)' }
        })}
      />
      
      <style>{`
        .ant-table { background: transparent !important; }
        .ant-table-thead > tr > th { background: transparent !important; color: var(--text-secondary) !important; border-bottom: 1px solid var(--border-color) !important; }
        .ant-table-tbody > tr > td { border-bottom: 1px solid var(--border-color) !important; }
        .ant-table-tbody > tr:hover > td { background: rgba(255, 255, 255, 0.05) !important; }
      `}</style>
    </div>
  )
}

export default PodcastList
