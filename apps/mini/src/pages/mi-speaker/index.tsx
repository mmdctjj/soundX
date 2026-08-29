import {
  addMiKeyword,
  deleteMiKeyword,
  getMiAuthStatus,
  getMiCasts,
  getMiConversations,
  getMiKeywords,
  getMiQRCode,
  getMiQRCodeStatus,
  logoutMiAccount,
  updateMiKeyword,
  type MiCastRecord,
  type MiConversation,
  type MiKeyword,
  type MiPagedResponse,
} from '@soundx/services';
import { Image, Input, ScrollView, Switch, Text, View } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import './index.scss';

type MiTab = 'keywords' | 'conversations' | 'casts';
const PAGE_SIZE = 20;

export default function MiSpeaker() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  // 未登录时整个页面只展示 LoginTab（不显示 tabBar）；登录后展示 keywords/conversations/casts 三个 tab。
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<MiTab>('keywords');

  // 父组件主动发起登录态检查 —— 否则 `loggedIn` 永远停留在 `null`，页面一直显示 loading。
  const checkAuth = useCallback(async () => {
    try {
      const res = await getMiAuthStatus();
      setLoggedIn(res.logged_in);
    } catch {
      setLoggedIn(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleAuthChange = useCallback((v: boolean) => {
    setLoggedIn(v);
    if (v) setActiveTab('keywords');
  }, []);

  const handleLogout = useCallback(() => {
    Taro.showModal({
      title: t('miManage.logoutConfirm'),
      confirmColor: '#f5222d',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await logoutMiAccount();
          setLoggedIn(false);
        } catch (e: any) {
          Taro.showToast({ title: e?.message || t('common.error'), icon: 'none' });
        }
      },
    });
  }, [t]);

  useLoad(() => {
    Taro.setNavigationBarTitle({ title: t('miManage.title') });
    Taro.setNavigationBarColor({
      frontColor: colors.text === '#11181C' ? '#000000' : '#ffffff',
      backgroundColor: colors.background,
    });
  });

  if (loggedIn === null) {
    return (
      <View className="mi-speaker">
        <View className="header">
          <View className="back-btn" onClick={() => Taro.navigateBack()}>
            <Text className="back-icon" style={{ color: colors.text }}>‹</Text>
          </View>
          <Text className="header-title" style={{ color: colors.text }}>
            {t('miManage.title')}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View className="center-box">
          <Text style={{ color: colors.secondary }}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  if (!loggedIn) {
    return (
      <View className="mi-speaker">
        <View className="header">
          <View className="back-btn" onClick={() => Taro.navigateBack()}>
            <Text className="back-icon" style={{ color: colors.text }}>‹</Text>
          </View>
          <Text className="header-title" style={{ color: colors.text }}>
            {t('miManage.title')}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <LoginTab onAuthChange={handleAuthChange} />
      </View>
    );
  }

  const tabs: { key: MiTab; label: string }[] = [
    { key: 'keywords', label: t('miManage.tabKeywords') },
    { key: 'conversations', label: t('miManage.tabConversations') },
    { key: 'casts', label: t('miManage.tabCasts') },
  ];

  return (
    <View className="mi-speaker">
      <View className="header">
        <View className="back-btn" onClick={() => Taro.navigateBack()}>
          <Text className="back-icon" style={{ color: colors.text }}>‹</Text>
        </View>
        <Text className="header-title" style={{ color: colors.text }}>
          {t('miManage.title')}
        </Text>
        <View className="logout-btn" onClick={handleLogout}>
          <Text className="back-icon" style={{ color: colors.text }}>⏻</Text>
        </View>
      </View>

      <View className="tab-bar" style={{ backgroundColor: colors.card }}>
        {tabs.map((tab) => (
          <View
            key={tab.key}
            className="tab-item"
            style={{
              borderBottomColor: activeTab === tab.key ? colors.primary : 'transparent',
            }}
            onClick={() => setActiveTab(tab.key)}
          >
            <Text
              className="tab-text"
              style={{
                color: activeTab === tab.key ? colors.primary : colors.secondary,
                fontWeight: activeTab === tab.key ? '700' : '400',
              }}
            >
              {tab.label}
            </Text>
          </View>
        ))}
      </View>

      {activeTab === 'keywords' && <KeywordsTab />}
      {activeTab === 'conversations' && (
        <HistoryList
          fetcher={(q) => getMiConversations(q)}
          renderItem={(item: MiConversation) => (
            <View className="history-row">
              <Text className="history-time" style={{ color: colors.secondary }}>
                {new Date(item.timestamp_ms).toLocaleString()}
                {item.device_name ? ` · ${item.device_name}` : ''}
              </Text>
              <View className="history-query" style={{ color: colors.text }}>{item.query}</View>
              {!!item.answer && (
                <Text className="history-answer">{item.answer}</Text>
              )}
            </View>
          )}
        />
      )}
      {activeTab === 'casts' && (
        <HistoryList
          fetcher={(q) => getMiCasts(q)}
          renderItem={(item: MiCastRecord) => (
            <View className="history-row">
              <View className="history-meta">
                <Text className="history-time" style={{ color: colors.secondary }}>
                  {new Date(item.created_at).toLocaleString()}
                  {item.device_name ? ` · ${item.device_name}` : ''}
                </Text>
                <Text className="history-source" style={{ color: colors.primary }}>
                  {sourceLabel(t, item.source)}
                </Text>
              </View>
              <View className="history-title" style={{ color: colors.text }}>{item.title || '-'}</View>
            </View>
          )}
        />
      )}
    </View>
  );
}

function sourceLabel(t: (k: string) => string, source: string): string {
  const map: Record<string, string> = {
    play_by_url: t('miManage.castSource_play_by_url'),
    play_playlist: t('miManage.castSource_play_playlist'),
    voice: t('miManage.castSource_voice'),
  };
  return map[source] ?? source;
}

// ===================== 登录状态 Tab =====================

interface LoginTabProps {
  onAuthChange: (loggedIn: boolean) => void;
}

const LoginTab: React.FC<LoginTabProps> = ({ onAuthChange }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  // 父组件已检查登录态才传入；这里不再重复请求，仅维护自身扫码状态 + 同步登录结果给父组件。
  const [loggedIn, setLoggedIn] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // 扫码成功 → 父组件切到 3-tab 视图并卸载本组件
  useEffect(() => {
    if (loggedIn) onAuthChange(true);
  }, [loggedIn, onAuthChange]);

  const handleGetQRCode = async () => {
    setLoading(true);
    stopPolling();
    try {
      const res = await getMiQRCode();
      if (res.already_logged_in) {
        setLoggedIn(true);
        setQrCodeUrl(null);
        return;
      }
      if (res.qrcode_url) {
        setQrCodeUrl(res.qrcode_url);
        if (res.status_url) {
          pollingRef.current = setInterval(async () => {
            try {
              const statusRes = await getMiQRCodeStatus(res.status_url!);
              if (statusRes.status === 'success') {
                stopPolling();
                setLoggedIn(true);
                setQrCodeUrl(null);
                Taro.showToast({ title: t('miManage.loginSuccess'), icon: 'success' });
              } else if (statusRes.status === 'expired' || statusRes.status === 'error') {
                stopPolling();
                setQrCodeUrl(null);
                Taro.showToast({ title: t('miManage.qrCodeExpired'), icon: 'none' });
              }
            } catch {
              // ignore polling errors
            }
          }, 3000);
        }
      }
    } catch (e: any) {
      Taro.showToast({ title: e?.message || t('common.error'), icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="center-box">
      <Text className="secondary-text" style={{ color: colors.secondary }}>
        {t('miManage.notLoggedIn')}
      </Text>
      {qrCodeUrl ? (
        <>
          <Image className="qrcode-img" src={qrCodeUrl} mode="aspectFit" />
          <Text className="hint-text" style={{ color: colors.secondary }}>
            {t('miManage.scanQRCode')}
          </Text>
        </>
      ) : (
        <View className="primary-btn" style={{ backgroundColor: colors.primary }} onClick={handleGetQRCode}>
          <Text className="primary-btn-text">
            {loading ? t('common.loading') : t('miManage.getQRCode')}
          </Text>
        </View>
      )}
    </View>
  );
};

// ===================== 唤醒关键字 Tab =====================

const KeywordsTab: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [keywords, setKeywords] = useState<MiKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyword, setNewKeyword] = useState('');
  const [adding, setAdding] = useState(false);

  const loadKeywords = useCallback(async () => {
    try {
      const res = await getMiKeywords();
      setKeywords(res.keywords ?? []);
    } catch (e: any) {
      Taro.showToast({ title: e?.message || t('common.error'), icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadKeywords();
  }, [loadKeywords]);

  const handleAdd = async () => {
    const kw = newKeyword.trim();
    if (!kw) return;
    setAdding(true);
    try {
      await addMiKeyword(kw);
      setNewKeyword('');
      await loadKeywords();
    } catch (e: any) {
      if (e?.response?.status === 409) {
        Taro.showToast({ title: t('miManage.keywordExists'), icon: 'none' });
      } else {
        Taro.showToast({ title: e?.message || t('common.error'), icon: 'none' });
      }
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (kw: MiKeyword) => {
    try {
      await updateMiKeyword(kw.id, { enabled: !kw.enabled });
      await loadKeywords();
    } catch (e: any) {
      Taro.showToast({ title: e?.message || t('common.error'), icon: 'none' });
    }
  };

  const handleDelete = (kw: MiKeyword) => {
    Taro.showModal({
      title: t('miManage.keywordDeleteConfirm', { keyword: kw.keyword }),
      confirmColor: '#f5222d',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await deleteMiKeyword(kw.id);
          await loadKeywords();
        } catch (e: any) {
          Taro.showToast({ title: e?.message || t('common.error'), icon: 'none' });
        }
      },
    });
  };

  if (loading) {
    return <View className="center-box"><Text style={{ color: colors.secondary }}>{t('common.loading')}</Text></View>;
  }

  return (
    <View className="keywords-wrap">
      <View className="add-row">
        <Input
          className="keyword-input"
          style={{ color: colors.text, backgroundColor: colors.card }}
          placeholder={t('miManage.keywordPlaceholder')}
          value={newKeyword}
          onInput={(e) => setNewKeyword(e.detail.value)}
          onConfirm={handleAdd}
          confirmType="done"
        />
        <View className="add-btn" onClick={handleAdd}>
          <Text className="add-btn-text">
            {adding ? t('common.loading') : t('miManage.keywordAdd')}
          </Text>
        </View>
      </View>

      {keywords.length === 0 ? (
        <View className="empty" style={{ color: colors.secondary }}>{t('miManage.keywordEmpty')}</View>
      ) : (
        keywords.map((kw) => (
          <View key={kw.id} className="keyword-row">
            <Text
              className={`keyword-text${kw.enabled ? '' : ' disabled'}`}
              style={{ color: colors.text }}
            >
              {kw.keyword}
            </Text>
            <Switch
              checked={kw.enabled}
              color={colors.primary}
              onChange={() => handleToggle(kw)}
            />
            <Text className="delete-btn" onClick={() => handleDelete(kw)}>删除</Text>
          </View>
        ))
      )}
    </View>
  );
};

// ===================== 历史记录列表（对话/投放共用） =====================

interface HistoryListProps {
  fetcher: (q: { page: number; size: number }) => Promise<MiPagedResponse<any>>;
  renderItem: (item: any) => React.ReactElement;
}

const HistoryList: React.FC<HistoryListProps> = ({ fetcher, renderItem }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    async (p: number, append: boolean) => {
      if (p > 1) setLoadingMore(true);
      try {
        const res = await fetcher({ page: p, size: PAGE_SIZE });
        setTotal(res.total ?? 0);
        setItems((prev) => (append ? [...prev, ...(res.items ?? [])] : res.items ?? []));
        setPage(p);
      } catch (e: any) {
        Taro.showToast({ title: e?.message || t('common.error'), icon: 'none' });
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [fetcher, t],
  );

  useEffect(() => {
    load(1, false);
  }, [load]);

  const hasMore = items.length < total;

  return (
    <ScrollView style={{ height: 'calc(100vh - 220rpx)' }}>
      {items.length === 0 ? (
        loading ? (
          <View className="center-box"><Text style={{ color: colors.secondary }}>{t('common.loading')}</Text></View>
        ) : (
          <View className="empty" style={{ color: colors.secondary }}>{t('miManage.historyEmpty')}</View>
        )
      ) : (
        <>
          {items.map((item) => (
            <View key={item.id}>{renderItem(item)}</View>
          ))}
          {hasMore ? (
            <View className="load-more" style={{ color: colors.primary }} onClick={() => load(page + 1, true)}>
              {loadingMore ? t('common.loading') : t('miManage.loadMore')}
            </View>
          ) : (
            <View className="load-more" style={{ color: colors.secondary }}>{t('miManage.noMore')}</View>
          )}
        </>
      )}
    </ScrollView>
  );
};
