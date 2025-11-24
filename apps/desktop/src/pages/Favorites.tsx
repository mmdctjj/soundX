import { Typography } from 'antd';
import React from 'react';

const { Title } = Typography;

const Favorites: React.FC = () => {
  return (
    <div style={{ padding: '20px', color: 'white' }}>
      <Title level={2} style={{ color: 'white' }}>Favorites</Title>
    </div>
  );
};

export default Favorites;
