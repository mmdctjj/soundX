import { Typography } from 'antd';
import React from 'react';

const { Title } = Typography;

const Listened: React.FC = () => {
  return (
    <div style={{ padding: '20px', color: 'white' }}>
      <Title level={2} style={{ color: 'white' }}>Listened</Title>
    </div>
  );
};

export default Listened;
