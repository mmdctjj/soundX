import { Image, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import React from 'react';
import './index.scss';

// 使用相对路径导入图片
import homeIcon from '../../assets/images/home.png';
import homeFillIcon from '../../assets/images/home-fill.png';
import musicIcon from '../../assets/images/music.png';
import musicFillIcon from '../../assets/images/music-fill.png';
import peopleIcon from '../../assets/images/people.png';
import peopleFillIcon from '../../assets/images/people-fill.png';

const tabs = [
  { pagePath: '/pages/index/index', text: '推荐', icon: homeIcon, selectedIcon: homeFillIcon },
  { pagePath: '/pages/library/index', text: '声仓', icon: musicIcon, selectedIcon: musicFillIcon },
  { pagePath: '/pages/personal/index', text: '我的', icon: peopleIcon, selectedIcon: peopleFillIcon },
];

const BottomTabBar: React.FC = () => {
  const router = useRouter();

  const handleTabClick = (pagePath: string) => {
    Taro.switchTab({ url: pagePath });
  };

  return (
    <View className='bottom-tab-bar custom-secondary-tab-bar'>
      <View className='bottom-tab-bar-main'>
        {tabs.map((tab) => {
          // 二级页面里的 tab 都不是高亮状态
          const active = false; 
          return (
            <View
              key={tab.pagePath}
              className='bottom-tab-item'
              onClick={() => handleTabClick(tab.pagePath)}
            >
              <View className='bottom-tab-item-inner'>
                <Image className='bottom-tab-icon-img' src={active ? tab.selectedIcon : tab.icon} />
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