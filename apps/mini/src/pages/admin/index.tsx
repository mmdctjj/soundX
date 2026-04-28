
import { ScrollView, Switch, Text, View } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User } from '../../models';
import { deleteAdminUser, getAdminUsers, getRegistrationSetting, setAdminUserExpiration, toggleRegistrationSetting } from '../../services/admin';
import './index.scss';

export default function Admin() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [registrationAllowed, setRegistrationAllowed] = useState(true);

  const fetchUsers = async () => {
    Taro.showLoading({ title: t('common.loading') });
    try {
      const res = await getAdminUsers();
      if (res.code === 200) {
        setUsers(res.data);
      }
    } catch (error) {
      Taro.showToast({ title: t('common.error'), icon: 'none' });
    } finally {
      Taro.hideLoading();
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await getRegistrationSetting();
      if (res.code === 200) {
        setRegistrationAllowed(res.data);
      }
    } catch (error) {
      // ignore
    }
  };

  useLoad(() => {
    fetchUsers();
    fetchSettings();
  });

  const handleToggleRegistration = async (e) => {
    const val = e.detail.value;
    const res = await toggleRegistrationSetting(val);
    if (res.code === 200) {
        setRegistrationAllowed(val);
    } else {
        Taro.showToast({ title: res.message, icon: 'none' });
        // revert
        setRegistrationAllowed(!val);
    }
  };

  const handleDeleteUser = (id: number) => {
    Taro.showModal({
        title: t('admin.confirmDeleteUser'),
        content: t('admin.confirmDeleteUserContent'),
        success: async (res) => {
            if (res.confirm) {
                const apiRes = await deleteAdminUser(id);
                if (apiRes.code === 200) {
                    Taro.showToast({ title: t('common.success') });
                    fetchUsers();
                } else {
                    Taro.showToast({ title: apiRes.message, icon: 'none' });
                }
            }
        }
    });
  };

  const handleSetExpiration = (user: User) => {
      const options = [t('admin.sevenDays'), t('admin.thirtyDays'), t('admin.oneYear'), t('admin.forever')];
      const daysMap = [7, 30, 365, null];

      Taro.showActionSheet({
          itemList: options,
          success: async (res) => {
              const days = daysMap[res.tapIndex];
              Taro.showLoading({ title: t('common.loading') });
              const apiRes = await setAdminUserExpiration(user.id, days);
              Taro.hideLoading();
              if (apiRes.code === 200) {
                  Taro.showToast({ title: t('common.success') });
                  fetchUsers();
              } else {
                  Taro.showToast({ title: apiRes.message, icon: 'none' });
              }
          }
      });
  };

  const formatDate = (dateStr?: string | null) => {
      if (!dateStr) return t('admin.forever');
      const date = new Date(dateStr);
      return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  };

  const isExpired = (dateStr?: string | null) => {
      if (!dateStr) return false;
      return new Date(dateStr).getTime() < Date.now();
  };

  return (
    <View className='admin-container'>
      <View className='header'>
        <View className='back-btn' onClick={() => Taro.navigateBack()}>
          <Text className='back-icon icon icon-back' />
        </View>
        <Text className='header-title'>{t('admin.userManagement')}</Text>
        <View style={{ width: '80rpx' }} />
      </View>

      <ScrollView scrollY className='content'>
         <View className='section'>
             <View className='setting-row'>
                <Text className='setting-label'>{t('admin.allowRegistration')}</Text>
                <Switch checked={registrationAllowed} onChange={handleToggleRegistration} color='#000000' />
             </View>
         </View>

         <View className='section'>
             <Text className='section-title'>{t('admin.userList')}</Text>
             {users.map(user => (
                 <View className='user-item' key={user.id}>
                     <View className='user-info'>
                         <Text className='username'>
                             {user.username} {user.is_admin && <Text style={{color: '#1890ff', fontSize: '24rpx'}}> ({t('admin.adminRole')})</Text>}
                         </Text>
                         <Text className='user-meta'>ID: {user.id} | 注册: {formatDate(user.createdAt)}</Text>
                         {/* We assume createdAt is added to User interface */}
                         <Text className='user-meta' style={{ color: isExpired(user.expiresAt) ? 'red' : '#999' }}>
                             {t('admin.expires')}: {formatDate(user.expiresAt)}
                         </Text>
                     </View>
                     {!user.is_admin && (
                         <View className='actions'>
                             <View className='btn btn-primary' onClick={() => handleSetExpiration(user)}>{t('admin.validity')}</View>
                             <View className='btn btn-danger' onClick={() => handleDeleteUser(user.id)}>{t('common.delete')}</View>
                         </View>
                     )}
                 </View>
             ))}
         </View>
      </ScrollView>
    </View>
  );
}
