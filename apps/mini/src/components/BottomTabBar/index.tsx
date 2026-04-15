import { Image, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import React from 'react';
import { useTranslation } from 'react-i18next';
import './index.scss';

// 使用相对路径导入图片
import homeIcon from '../../assets/images/home.png';
import homeFillIcon from '../../assets/images/home-fill.png';
import musicIcon from '../../assets/images/music.png';
import musicFillIcon from '../../assets/images/music-fill.png';
import peopleIcon from '../../assets/images/people.png';
import peopleFillIcon from '../../assets/images/people-fill.png';



const BottomTabBar: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();

  const tabs = [
    { pagePath: '/pages/index/index', text: t('home.recommend'), icon: homeIcon, selectedIcon: homeFillIcon },
    { pagePath: '/pages/library/index', text: t('nav.library'), icon: musicIcon, selectedIcon: musicFillIcon },
    { pagePath: '/pages/personal/index', text: t('nav.personal'), icon: peopleIcon, selectedIcon: peopleFillIcon },
  ];

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