import { plusDeleteMe, plusParticipateInternalTest } from '@soundx/services';
import { ScrollView, Slider, Switch, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useTheme } from '../../context/ThemeContext';
import { usePlayMode } from '../../utils/playMode';
import './index.scss';

export default function Settings() {
  const { logout, user } = useAuth();
  const { mode, setMode } = usePlayMode();
  const {
    acceptRelay,
    acceptSync,
    cacheEnabled,
    autoOrientation,
    autoTheme,
    carLayoutMode,
    voiceAssistantEnabled,
    recommendationLikeRatio,
    carModeEnabled,
    screenBottomInset,
    experienceProgramEnabled,
    updateSetting,
  } = useSettings();
  const { theme, toggleTheme } = useTheme();

  const [showScreenInsetModal, setShowScreenInsetModal] = useState(false);
  const [redeemingInternalTestCode, setRedeemingInternalTestCode] = useState(false);
  const [isVip, setIsVip] = useState(false);

  useEffect(() => {
    const isVipStr = Taro.getStorageSync('plus_vip_status');
    setIsVip(isVipStr === 'true');
  }, []);

  const handleLogout = () => {
    Taro.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          logout();
          Taro.reLaunch({ url: '/pages/login/index' });
        }
      }
    });
  };

  const handleToggleCarMode = (val: boolean) => {
    if (val && !isVip) {
      Taro.showModal({
        title: '仅限会员使用',
        content: '车机模式是会员专属功能，请前往会员页面开启。',
        confirmText: '去开通',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            Taro.navigateTo({ url: '/pages/member/benefits/index' });
          }
        }
      });
      return;
    }
    updateSetting('carModeEnabled', val);
    updateSetting('carLayoutMode', val);
    if (val) {
      Taro.reLaunch({ url: '/pages/index/index' });
    }
  };

  const handleToggleVoiceAssistant = (val: boolean) => {
    if (val && !isVip) {
      Taro.showModal({
        title: '仅限会员使用',
        content: '语音助手是会员专属功能，请前往会员页面开启。',
        confirmText: '去开通',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            Taro.navigateTo({ url: '/pages/member/benefits/index' });
          }
        }
      });
      return;
    }
    updateSetting('voiceAssistantEnabled', val);
  };

  const carModeActive = carLayoutMode || carModeEnabled;

  const handleRedeemInternalTestCode = async () => {
    if (isVip) {
      Taro.showToast({ title: '已拥有内测权益', icon: 'none' });
      return;
    }

    const plusUserId = Taro.getStorageSync('plus_user_id');
    if (!plusUserId) {
      Taro.showToast({ title: '请先登录会员', icon: 'none' });
      return;
    }

    try {
      setRedeemingInternalTestCode(true);
      const vipStartsAt = new Date();
      const vipEndsAt = new Date(vipStartsAt);
      vipEndsAt.setMonth(vipEndsAt.getMonth() + 1);

      let id = plusUserId;
      try { id = JSON.parse(plusUserId); } catch(e) {}

      const res = await plusParticipateInternalTest({
        vipStartsAt: vipStartsAt.toISOString(),
        vipEndsAt: vipEndsAt.toISOString(),
      });
      const payload = res.data?.data;

      if (res.data?.code !== 200 || !payload?.ok) {
        throw new Error(res.data?.message || '参与内测失败');
      }

      Taro.setStorageSync('plus_vip_status', 'true');
      Taro.setStorageSync('plus_vip_data', JSON.stringify({
        ...payload,
        vipExpiresAt: payload.vipEndsAt,
      }));
      Taro.setStorageSync('plus_vip_updated_at', Date.now().toString());
      setIsVip(true);
      Taro.showToast({ title: '申请成功', icon: 'success' });
    } catch (error: any) {
      Taro.showToast({ title: error.message || '申请失败', icon: 'none' });
    } finally {
      setRedeemingInternalTestCode(false);
    }
  };

  const handleDeleteMemberAccount = () => {
    const plusToken = Taro.getStorageSync('plus_token');
    if (!plusToken) {
      Taro.showToast({ title: '请先登录会员', icon: 'none' });
      return;
    }

    Taro.showModal({
      title: '注销会员账号',
      content: '确认注销吗？注销之后您的所有数据将会被清空！',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await plusDeleteMe();
            if (result.data?.code !== 200 || !result.data?.data?.ok) {
              throw new Error(result.data?.message || '注销失败');
            }
            Taro.removeStorageSync('plus_token');
            Taro.removeStorageSync('plus_user_id');
            Taro.removeStorageSync('plus_vip_status');
            setIsVip(false);
            Taro.showToast({ title: '已注销', icon: 'success' });
          } catch (error: any) {
            Taro.showToast({ title: error.message || '请稍后重试', icon: 'none' });
          }
        }
      }
    });
  };

  const renderSettingRow = (
    label: string,
    description: string,
    value: boolean,
    onValueChange: (val: boolean) => void
  ) => (
    <View className='setting-row'>
      <View className='setting-info'>
        <Text className='setting-label'>{label}</Text>
        <Text className='setting-description'>{description}</Text>
      </View>
      <Switch checked={value} onChange={(e) => onValueChange(e.detail.value)} color='#007aff' />
    </View>
  );

  const renderActionRow = (
    label: string,
    description: string,
    onPress: () => void,
    valueText?: string
  ) => (
    <View className='setting-row' onClick={onPress}>
      <View className='setting-info'>
        <Text className='setting-label'>{label}</Text>
        <Text className='setting-description'>{description}</Text>
      </View>
      <View className='setting-action'>
        {valueText ? <Text className='setting-value'>{valueText}</Text> : null}
        <Text style={{ color: '#999', fontSize: '32rpx', marginLeft: '12rpx' }}>&gt;</Text>
      </View>
    </View>
  );

  return (
    <View className='settings-container'>
      <View className='header'>
        <View className='back-btn' onClick={() => Taro.navigateBack()}>
          <Text className='back-icon icon icon-back' />
        </View>
        <Text className='header-title'>设置</Text>
        <View style={{ width: '80rpx' }} />
      </View>

      <ScrollView scrollY className='content'>
        <View className='section'>
          <Text className='section-title'>账户</Text>
          {user?.is_admin && renderActionRow(
            '管理后台',
            '用户与系统设置',
            () => Taro.navigateTo({ url: '/pages/admin/index' })
          )}
          {renderActionRow(
            '数据源管理',
            '切换和管理音频数据源',
            () => Taro.navigateTo({ url: '/pages/source-manage/index' })
          )}
        </View>

        <View className='section'>
          <Text className='section-title'>通用</Text>
          {renderSettingRow('车机模式', '左侧播放器，右侧内容区', carModeActive, handleToggleCarMode)}
          {carModeActive && renderActionRow(
            '调整屏幕边距',
            '调整播放详情页整体距离屏幕底部的位置',
            () => setShowScreenInsetModal(true),
            `${Math.round(screenBottomInset)}`
          )}
          {renderSettingRow('跟随系统主题', '开启后将根据系统设置自动切换浅色/深色模式', autoTheme, (val) => updateSetting('autoTheme', val))}
          <View style={{ opacity: autoTheme ? 0.5 : 1, pointerEvents: autoTheme ? 'none' : 'auto' }}>
            {renderSettingRow('深色模式', '开启或关闭应用的深色外观', theme === 'dark', autoTheme ? () => {} : toggleTheme)}
          </View>
          {renderSettingRow('自动横竖屏', '开启后应用将跟随手机重力感应自动旋转', autoOrientation, (val) => updateSetting('autoOrientation', val))}
          {renderSettingRow('语音助手', '开启后显示全局语音助手小松鼠', voiceAssistantEnabled, handleToggleVoiceAssistant)}

          <View className='setting-row slider-row'>
            <View className='setting-info' style={{ width: '100%', marginRight: 0 }}>
              <Text className='setting-label'>推荐偏好（喜欢/新鲜）</Text>
              <Text className='setting-description'>喜欢 {recommendationLikeRatio}% · 新鲜 {100 - recommendationLikeRatio}%</Text>
              <Slider
                min={0}
                max={100}
                step={5}
                value={recommendationLikeRatio}
                onChange={(e) => updateSetting('recommendationLikeRatio', e.detail.value)}
                activeColor='#007aff'
                backgroundColor='#eee'
                blockSize={16}
              />
            </View>
          </View>

          {renderSettingRow('有声书模式', '切换音乐与有声书的显示内容', mode === 'AUDIOBOOK', (val) => setMode(val ? 'AUDIOBOOK' : 'MUSIC'))}
          {renderSettingRow('接力播放', '是否接受多设备之间播放接力', acceptRelay, (val) => updateSetting('acceptRelay', val))}
          {renderSettingRow('同步控制', '是否接受同数据源下其他用户的同步控制请求', acceptSync, (val) => updateSetting('acceptSync', val))}
          {renderSettingRow('边听边存', '播放时自动缓存到本地，下次播放优先使用本地文件', cacheEnabled, (val) => updateSetting('cacheEnabled', val))}
        </View>

        <View className='section'>
          <Text className='section-title'>关于</Text>
          {renderActionRow('产品动态', '查看最新功能与版本更新', () => Taro.showToast({ title: '暂无动态', icon: 'none' }))}
          {renderActionRow('参与内测', isVip ? '已拥有内测权益，无需重复申请' : redeemingInternalTestCode ? '正在申请...' : '一键申请并自动开通内测权益', handleRedeemInternalTestCode)}
          {renderSettingRow('参与用户体验计划', '使用数据以改进产品', experienceProgramEnabled, (val) => updateSetting('experienceProgramEnabled', val))}
        </View>

        <View className='section p-0'>
          <View className='logout-btn' onClick={handleLogout}>
            <Text className='logout-text'>退出登录</Text>
          </View>
          <View className='delete-member-btn' onClick={handleDeleteMemberAccount}>
            <Text className='delete-member-text'>注销会员账号</Text>
          </View>
        </View>

        <View className='footer'>
          <Text className='version-text'>SoundX Mini v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Screen Inset Modal */}
      {showScreenInsetModal && (
        <View className='modal-mask' onClick={() => setShowScreenInsetModal(false)}>
          <View className='modal-content' onClick={(e) => e.stopPropagation()}>
            <View className='modal-title-row'>
              <Text className='modal-title'>调整屏幕边距</Text>
            </View>
            <View className='modal-description-row'>
              <Text className='modal-description'>调整播放详情页整体距离屏幕底部的位置</Text>
            </View>
            <View className='slider-panel'>
              <View className='slider-header'>
                <Text className='slider-label'>底部边距</Text>
                <Text className='slider-number'>{Math.round(screenBottomInset)}</Text>
              </View>
              <Slider
                className='inset-slider'
                min={0}
                max={160}
                step={1}
                value={screenBottomInset}
                onChange={(e) => updateSetting('screenBottomInset', e.detail.value)}
                activeColor='#007aff'
                backgroundColor='#eee'
                blockSize={16}
              />
              <View className='slider-hint-row'>
                <Text className='slider-hint'>更贴近底部</Text>
                <Text className='slider-hint'>整页上移</Text>
              </View>
            </View>
            <View className='modal-actions'>
              <View className='modal-btn modal-cancel-btn' onClick={() => { updateSetting('screenBottomInset', 0); setShowScreenInsetModal(false); }}>
                <Text className='modal-cancel-text'>重置</Text>
              </View>
              <View className='modal-btn modal-confirm-btn' onClick={() => setShowScreenInsetModal(false)}>
                <Text className='modal-confirm-text'>完成</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
