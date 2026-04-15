import { plusGetMe, setPlusToken } from '@soundx/services';
import { Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MiniPlayer from '../../../components/MiniPlayer';
import './index.scss';

export default function MemberPaymentSuccess() {
  const { t } = useTranslation();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(true);

  const tradeNo = router.params.tradeNo || '';
  const paidAtRaw = router.params.paidAt || '';

  const paidAt = useMemo(() => {
    if (!paidAtRaw) return '';
    try {
      return new Date(paidAtRaw).toLocaleString();
    } catch {
      return paidAtRaw;
    }
  }, [paidAtRaw]);

  useEffect(() => {
    const refreshVipStatus = async () => {
      try {
        const plusToken = wx.getStorageSync('plus_token');
        const plusUserId = wx.getStorageSync('plus_user_id');
        if (!plusToken || !plusUserId) {
          setRefreshing(false);
          return;
        }

        setPlusToken(plusToken);

        let id: any = plusUserId;
        try {
          id = JSON.parse(plusUserId);
        } catch {}

        const res = await plusGetMe(id);
        const vipTier = res?.data?.data?.vipTier;
        const isVip = vipTier && vipTier !== 'NONE';
        if (isVip) {
          wx.setStorageSync('plus_vip_status', 'true');
          wx.setStorageSync('plus_vip_data', JSON.stringify(res.data.data || {}));
          wx.setStorageSync('plus_vip_updated_at', Date.now().toString());
        }
      } catch (error) {
        console.warn('Failed to refresh vip status', error);
      } finally {
        setRefreshing(false);
      }
    };

    refreshVipStatus();
  }, []);

  return (
    <View className='payment-success-container'>
      <View className='header'>
        <View className='back-btn' onClick={() => Taro.navigateBack()}>
          <Text className='back-icon'>←</Text>
        </View>
        <Text className='header-title'>{t('memberSuccess.paymentSuccess')}</Text>
        <View style={{ width: '80rpx' }} />
      </View>

      <View className='card'>
        <Text className='success-icon'>✓</Text>
        <Text className='success-text'>{t('memberSuccess.paymentSuccess')}</Text>

        <View className='info-block'>
          <Text className='info-label'>{t('memberSuccess.paymentDate')}</Text>
          <Text className='info-value'>{paidAt || '-'}</Text>
        </View>

        <View className='info-block'>
          <Text className='info-label'>{t('memberSuccess.transactionId')}</Text>
          <Text className='info-value'>{tradeNo || '-'}</Text>
        </View>

        {refreshing && (
          <View className='refresh-row'>
            <Text className='refresh-text'>{t('memberSuccess.syncingMemberStatus')}</Text>
          </View>
        )}

        <View
          className='primary-button'
          onClick={() => Taro.redirectTo({ url: '/pages/member/detail/index' })}
        >
          <Text className='primary-button-text'>{t('member.detailTitle')}</Text>
        </View>
      </View>

      <MiniPlayer />
    </View>
  );
}
