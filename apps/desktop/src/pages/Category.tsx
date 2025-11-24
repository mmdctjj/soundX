import { Typography } from 'antd';
import React from 'react';

const { Title } = Typography;

const Category: React.FC = () => {
  return (
    <div style={{ padding: '20px', color: 'white' }}>
      <Title level={2} style={{ color: 'white' }}>分类</Title>
    </div>
  );
};

export default Category;
