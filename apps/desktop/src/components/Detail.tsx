import { CaretRightOutlined, CheckCircleFilled, CloudDownloadOutlined, HeartOutlined, MoreOutlined, SearchOutlined, ShareAltOutlined } from '@ant-design/icons'
import { Avatar, Button, Col, Row, Table, Typography } from 'antd'
import React from 'react'

const { Title, Text } = Typography

const episodes = [
  { key: '1', title: 'Find topic that tou love', artist: 'Ken Adams', playlist: 'How to Start Podcast', plays: '2,412', duration: '08:12', image: 'https://picsum.photos/seed/10/100/100' },
  { key: '2', title: 'Invite your friends instead', artist: 'Ken Adams', playlist: 'How to Start Podcast', plays: '2,341', duration: '18:11', image: 'https://picsum.photos/seed/11/100/100' },
  { key: '3', title: 'How to make your partner talk more', artist: 'Ken Adams', playlist: 'How to Start Podcast', plays: '1,212', duration: '12:11', image: 'https://picsum.photos/seed/12/100/100' },
  { key: '4', title: 'Invest in podcast tools', artist: 'Ken Adams', playlist: 'How to Start Podcast', plays: '3,123', duration: '18:31', image: 'https://picsum.photos/seed/13/100/100' },
]

const Detail: React.FC = () => {
  const columns = [
    { title: '#', dataIndex: 'key', key: 'key', width: 50, render: (text: string) => <Text style={{ color: 'var(--text-secondary)' }}>{text}</Text> },
    { title: '状态', dataIndex: 'status', key: 'status', width: 60, render: (text: string, record: any) => <img src={record.image} alt={text} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} /> },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Text style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{text}</Text>
            <Text style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{record.artist}</Text>
          </div>
        </div>
      )
    },
    { title: 'Playlist', dataIndex: 'playlist', key: 'playlist', render: (text: string) => <Text style={{ color: 'var(--text-secondary)' }}>{text}</Text> },
    { title: '时长', dataIndex: 'duration', key: 'duration', render: (text: string) => <Text style={{ color: 'var(--text-secondary)' }}>{text}</Text> },
    {
      title: '',
      key: 'action',
      width: 50,
      render: () => <MoreOutlined style={{ color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '18px' }} />
    },
  ]

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      backgroundColor: 'var(--glass-bg)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      padding: '0',
      position: 'relative'
    }}>
      {/* Header Banner */}
      <div style={{
        height: '300px',
        backgroundImage: 'url(https://picsum.photos/seed/podcast/1200/400)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        padding: '30px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.8))'
        }}></div>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <Title level={1} style={{ color: 'white', margin: 0 }}>How to start podcast</Title>
              <CheckCircleFilled style={{ color: '#1890ff', fontSize: '24px' }} />
            </div>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px', display: 'block', marginBottom: '20px' }}>40,142 Monthly Listeners</Text>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <Avatar size={50} src="https://api.dicebear.com/7.x/avataaars/svg?seed=Ken" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text style={{ color: 'white', fontWeight: 600, fontSize: '16px' }}>Ken Adam</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>51k Followers</Text>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '30px' }}>
        <Row gutter={40}>
          {/* Main Content */}
          <Col span={24}>
            {/* Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: '#5c5cff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(92, 92, 255, 0.4)'
                }}>
                  <CaretRightOutlined style={{ color: 'white', fontSize: '30px' }} />
                </div>
                <Button shape="circle" icon={<HeartOutlined />} type="primary" size="large" style={{ backgroundColor: 'transparent', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}></Button>
                <Button shape="circle" icon={<ShareAltOutlined />} size="large" style={{ backgroundColor: 'transparent', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }} />
                <Button shape="circle" icon={<CloudDownloadOutlined />} size="large" style={{ backgroundColor: 'transparent', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <SearchOutlined style={{ color: 'var(--text-secondary)', fontSize: '18px' }} />
                <Text style={{ color: 'var(--text-secondary)' }}>Order by</Text>
              </div>
            </div>

            {/* Episode List */}
            <Table
              dataSource={episodes}
              columns={columns}
              pagination={false}
              rowClassName="episode-row"
              onRow={() => ({
                style: { cursor: 'pointer' }
              })}
            />
          </Col>
        </Row>
      </div>

      <style>{`
        .episode-row:hover td {
          background-color: rgba(255, 255, 255, 0.05) !important;
        }
        .ant-table {
          background: transparent !important;
        }
        .ant-table-thead > tr > th {
          background: transparent !important;
          color: var(--text-secondary) !important;
          border-bottom: 1px solid var(--border-color) !important;
        }
        .ant-table-tbody > tr > td {
          border-bottom: 1px solid var(--border-color) !important;
        }
        .ant-table-tbody > tr:hover > td {
          background: transparent !important;
        }
      `}</style>
    </div>
  )
}

export default Detail
