import { Image } from '@tarojs/components';
import React from 'react';
import xiaoaiDark from '../../assets/images/xiaoai_dark.png';

export interface XiaoAiIconProps {
  size?: number;
  style?: React.CSSProperties;
}

export const XiaoAiIcon: React.FC<XiaoAiIconProps> = ({
  size = 24,
  style,
}) => {
  const pixelSize = `${size}px`;
  return (
    <Image
      src={xiaoaiDark}
      style={{ width: pixelSize, height: pixelSize, ...style }}
      mode='aspectFit'
    />
  );
};

export default XiaoAiIcon;