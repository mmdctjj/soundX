
import { ScrollView, Switch, Text, View } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useState } from 'react';
import { User } from '../../models';
import { deleteAdminUser, getAdminUsers, getRegistrationSetting, setAdminUserExpiration, toggleRegistrationSetting } from '../../services/admin';
import './index.scss';

export default function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [registrationAllowed, setRegistrationAllowed] = useState(true);

  const fetchUsers = async () => {
    Taro.showLoading({ title: '加载中...' });
    try {
      const res = await getAdminUsers();
      if (res.code === 200) {
        setUsers(res.data);
      }
    } catch (error) {
      Taro.showToast({ title: '加载失败', icon: 'none' });
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
        title: '确认删除',
        content: '确定要删除该用户吗？此操作无法撤销。',
        success: async (res) => {
            if (res.confirm) {
                const apiRes = await deleteAdminUser(id);
                if (apiRes.code === 200) {
                    Taro.showToast({ title: '删除成功' });
                    fetchUsers();
                } else {
                    Taro.showToast({ title: apiRes.message, icon: 'none' });
                }
            }
        }
    });
  };

  const handleSetExpiration = (user: User) => {
      const options = ['7天', '30天', '1年', '永久有效'];
      const daysMap = [7, 30, 365, null];

      Taro.showActionSheet({
          itemList: options,
          success: async (res) => {
              const days = daysMap[res.tapIndex];
              Taro.showLoading({ title: '设置中...' });
              const apiRes = await setAdminUserExpiration(user.id, days);
              Taro.hideLoading();
              if (apiRes.code === 200) {
                  Taro.showToast({ title: '设置成功' });
                  fetchUsers();
              } else {
                  Taro.showToast({ title: apiRes.message, icon: 'none' });
              }
          }
      });
  };

  const formatDate = (dateStr?: string | null) => {
      if (!dateStr) return '永久有效';
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
        <Text className='header-title'>用户管理</Text>
        <View style={{ width: '80rpx' }} />
      </View>

      <ScrollView scrollY className='content'>
         <View className='section'>
             <View className='setting-row'>
                <Text className='setting-label'>允许注册</Text>
                <Switch checked={registrationAllowed} onChange={handleToggleRegistration} color='#000000' />
             </View>
         </View>

         <View className='section'>
             <Text className='section-title'>用户列表</Text>
             {users.map(user => (
                 <View className='user-item' key={user.id}>
                     <View className='user-info'>
                         <Text className='username'>
                             {user.username} {user.is_admin && <Text style={{color: '#1890ff', fontSize: '24rpx'}}> (管理员)</Text>}
                         </Text>
                         <Text className='user-meta'>ID: {user.id} | 注册: {formatDate(user.createdAt)}</Text>
                         {/* We assume createdAt is added to User interface */}
                         <Text className='user-meta' style={{ color: isExpired(user.expiresAt) ? 'red' : '#999' }}>
                             过期: {formatDate(user.expiresAt)}
                         </Text>
                     </View>
                     {!user.is_admin && (
                         <View className='actions'>
                             <View className='btn btn-primary' onClick={() => handleSetExpiration(user)}>有效期</View>
                             <View className='btn btn-danger' onClick={() => handleDeleteUser(user.id)}>删除</View>
                         </View>
                     )}
                 </View>
             ))}
         </View>
      </ScrollView>
    </View>
  );
}
