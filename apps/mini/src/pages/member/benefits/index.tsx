import { plusCreatePayment, setPlusToken } from '@soundx/services';
import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MiniPlayer from '../../../components/MiniPlayer';
import './index.scss';

type PaymentPlan = 'annual' | 'lifetime';

const comparisonData = [
  { feature: 'memberFeature.basicFeatures', free: true, member: true },
  { feature: 'memberFeature.deviceRelay', free: true, member: true },
  { feature: 'memberFeature.syncControlFeature', free: false, member: true },
  { feature: 'memberFeature.ttsAudiobookFeature', free: false, member: true },
  { feature: 'memberFeature.tvVersionFeature', free: false, member: true },
  { feature: 'memberFeature.carVersionFeature', free: false, member: true },
];

export default function MemberBenefits() {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan>('lifetime');
  const [loading, setLoading] = useState(false);

  const handlePayment = async (method: 'WECHAT' | 'ALIPAY') => {
    const userIdStr = Taro.getStorageSync('plus_user_id');
    if (!userIdStr) {
      Taro.showModal({
        title: t('member.tip'),
        content: t('member.loginFirst'),
        confirmText: t('member.goLogin'),
        cancelText: t('member.cancelBtn'),
        success: (res) => {
          if (res.confirm) {
            Taro.navigateTo({ url: '/pages/member/login/index' });
          }
        },
      });
      return;
    }

    setLoading(true);
    try {
      const res = await plusCreatePayment({
        userId: userIdStr,
        amount: selectedPlan === 'annual' ? 20 : 60,
        currency: 'CNY',
        method,
        forVip: true,
        vipTier: selectedPlan === 'annual' ? 'BASIC' : 'LIFETIME',
        forPoints: false,
        pointsAmount: 0,
      });

      if (res.data.code === 201 || res.data.code === 200) {
        const { paymentUrl, wechatPay, alipayPay, orderId } = res.data.data || {};

        if (method === 'WECHAT') {
          if (wechatPay) {
            // WeChat payment - in mini program would use wx.requestPayment
            Taro.showToast({ title: t('member.wechatPay') + ' ' + t('common.vipOnly'), icon: 'none' });
          } else if (paymentUrl) {
            Taro.showToast({ title: t('memberSuccess.paymentSuccess') + ', ' + t('member.paymentWebDesc'), icon: 'none' });
          } else {
            Taro.showToast({ title: t('common.error'), icon: 'none' });
          }
          return;
        }

        if (method === 'ALIPAY') {
          if (alipayPay?.orderString) {
            Taro.showToast({ title: t('member.alipay') + ' ' + t('common.vipOnly'), icon: 'none' });
          } else if (paymentUrl) {
            Taro.showToast({ title: t('memberSuccess.paymentSuccess') + ', ' + t('member.paymentWebDesc'), icon: 'none' });
          } else {
            Taro.showToast({ title: t('common.error'), icon: 'none' });
          }
          return;
        }
      } else {
        Taro.showToast({ title: res.data.message || t('common.error'), icon: 'none' });
      }
    } catch (e: any) {
      Taro.showToast({ title: e.response?.data?.message || t('member.networkError'), icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Taro.showModal({
      title: t('member.logoutSwitchAccount'),
      content: t('member.logoutConfirm'),
      confirmText: t('member.confirmBtn'),
      cancelText: t('member.cancelBtn'),
      success: async (res) => {
        if (res.confirm) {
          Taro.removeStorageSync('plus_user_id');
          Taro.removeStorageSync('plus_token');
          Taro.redirectTo({ url: '/pages/member/login/index' });
        }
      },
    });
  };

  return (
    <View className='member-benefits-container'>
      <View className='header'>
        <View className='back-btn' onClick={() => Taro.navigateBack()}>
          <Text className='back-icon'>←</Text>
        </View>
        <Text className='header-title'>{t('member.benefitsTitle')}</Text>
        <View style={{ width: '80rpx' }} />
      </View>

      <View className='scroll-content'>
        {/* Comparison Table */}
        <View className='table-card'>
          <View className='table-header'>
            <Text className='table-header-text flex-2'>{t('member.rightsDescription')}</Text>
            <Text className='table-header-text flex-1 center'>{t('scanConfirm.nonMember')}</Text>
            <Text className='table-header-text flex-1 center'>{t('scanConfirm.memberLabel')}</Text>
          </View>
          {comparisonData.map((item, index) => (
            <View
              key={item.feature}
              className={`table-row ${index > 0 ? 'border-top' : ''}`}
            >
              <Text className='feature-text flex-2'>{t(item.feature)}</Text>
              <View className='flex-1 center'>
                <Text className={`check-icon ${item.free ? 'active' : 'inactive'}`}>
                  {item.free ? '✓' : '✗'}
                </Text>
              </View>
              <View className='flex-1 center'>
                <Text className='check-icon gold'>✓</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Pricing Plans */}
        <View className='divider-container'>
          <Text className='divider-text'>{t('member.memberPlan')}</Text>
        </View>

        <View className='plans-container'>
          <View
            className={`plan-card ${selectedPlan === 'annual' ? 'active' : ''}`}
            onClick={() => setSelectedPlan('annual')}
          >
            <Text className='plan-name'>{t('member.annual')}</Text>
            <View className='price-container'>
              <Text className='currency'>¥</Text>
              <Text className='price-amount'>20</Text>
              <Text className='unit'>/{t('member.annualMember')}</Text>
            </View>
          </View>

          <View
            className={`plan-card ${selectedPlan === 'lifetime' ? 'active' : ''}`}
            onClick={() => setSelectedPlan('lifetime')}
          >
            {selectedPlan === 'lifetime' && (
              <View className='recommend-badge'>
                <Text className='recommend-text'>{t('member.recommend')}</Text>
              </View>
            )}
            <Text className='plan-name'>{t('member.permanent')}</Text>
            <View className='price-container'>
              <Text className='currency'>¥</Text>
              <Text className='price-amount'>60</Text>
              <Text className='unit'>/{t('member.permanentValid')}</Text>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        <View className='divider-container'>
          <Text className='divider-text'>{t('member.paymentMethod')}</Text>
        </View>

        <View className='payment-methods'>
          <View
            className={`payment-item ${loading ? 'disabled' : ''}`}
            onClick={() => handlePayment('WECHAT')}
          >
            <Text className='payment-icon'>💳</Text>
            <Text className='payment-text'>{t('member.wechatPay')}</Text>
          </View>
          <View
            className={`payment-item ${loading ? 'disabled' : ''}`}
            onClick={() => handlePayment('ALIPAY')}
          >
            <Text className='payment-icon'>💰</Text>
            <Text className='payment-text'>{t('member.alipay')}</Text>
          </View>
        </View>

        <View className='logout-button' onClick={handleLogout}>
          <Text className='logout-icon'>🚪</Text>
          <Text className='logout-text'>{t('member.logoutSwitchAccount')}</Text>
        </View>
      </View>

      <MiniPlayer />
    </View>
  );
}
