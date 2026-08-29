import { Image, View } from '@tarojs/components';
import React from 'react';
import { getImageUrl as buildImageUrl } from '../../utils/image';
import './index.scss';

interface StackedCoverProps {
  tracks: any[];
}

const StackedCover: React.FC<StackedCoverProps> = ({ tracks }) => {
  const covers = (tracks || []).slice(0, 4);

  // 占位图各文件不同，这里绑死；调用点传显示尺寸（rpx 值 ≈ 目标设备像素，见 utils/image.ts）
  const getImageUrl = (url: string | null, width = 300) =>
    buildImageUrl(url, "https://picsum.photos/100/100", width);
  return (
    <View className='stacked-cover-container'>
      {covers.length > 0 ? (
        covers.map((track, index) => (
          <Image
            key={track.id || index}
            src={getImageUrl(track.cover, 96)}
            className='stacked-item'
            style={{
              zIndex: 4 - index,
              left: `${index * 12}rpx`,
              top: `${index * 6}rpx`,
              position: index === 0 ? 'relative' : 'absolute',
              opacity: 1 - index * 0.15,
              transform: `scale(${1 - index * 0.05})`,
            }}
            mode='aspectFill' webp
          />
        ))
      ) : (
        <Image
          src='https://picsum.photos/100/100'
          className='stacked-item'
          mode='aspectFill' webp
        />
      )}
    </View>
  );
};

export default StackedCover;
