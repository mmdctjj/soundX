import { Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import React from 'react';
import './index.scss';

const tabs = [
  { pagePath: '/pages/index/index', text: '推荐' },
  { pagePath: '/pages/library/index', text: '声仓' },
  { pagePath: '/pages/personal/index', text: '我的' },
];

const BottomTabBar: React.FC = () => {
  const router = useRouter();

  return (
    <View className='bottom-tab-bar'>
      <View className='bottom-tab-bar-main'>
        {tabs.map((tab) => {
          const active = router.path === tab.pagePath;
          return (
            <View
              key={tab.pagePath}
              className={`bottom-tab-item ${active ? 'active' : ''}`}
              onClick={() => Taro.switchTab({ url: tab.pagePath })}
            >
              <View className='bottom-tab-item-inner'>
                <Text className='bottom-tab-text'>{tab.text}</Text>
              </View>
            </View>
          );
        })}
      </View>
      <View className='bottom-tab-bar-safe' />
    </View>
  );
};

export default BottomTabBar;
