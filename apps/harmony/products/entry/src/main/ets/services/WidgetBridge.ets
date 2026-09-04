import formProvider from '@ohos.app.form.formProvider';
import formBindingData from '@ohos.app.form.formBindingData';
import { Logger } from 'audiodock_common';
import { kvStore } from 'features_storage';
import { httpClient } from 'features_network';
import { plusApi } from 'features_network';
import { likesHistory } from './LikesHistoryService';
import {
  HistorySnapshot, LatestSnapshot, NowPlayingSnapshot,
  PlaylistsSnapshot, VipSnapshot, WidgetKind,
  WIDGET_KV_KEYS,
} from '../models/WidgetData';
import { getImageUrl } from '../utils/image';

/**
 * playerStore 的最小视图契约（本地声明，避免 import PlayerStore 造成循环依赖）。
 * PlayerStore → WidgetBridge → PlayerStore 的环会让两个模块都加载失败，
 * 所以本模块一律用动态 import('../context/PlayerStore') 在运行时取。
 */
interface WidgetTrack {
  id: string;
  title: string;
  artist?: string;
  coverUrl?: string;
}

/** 播放模式（与 NowPlayingSnapshot.playMode 同构） */
type WidgetPlayMode = 'SEQUENCE' | 'LOOP_LIST' | 'LOOP_SINGLE' | 'SHUFFLE';

interface PlayerStateViewLite {
  queue: WidgetTrack[];
  currentIndex: number;
  isPlaying: boolean;
  playMode: WidgetPlayMode;
}

interface PlayerStoreLite {
  view(): PlayerStateViewLite;
  togglePlayMode(): void;
}

/**
 * 主 App → 卡片数据推送（对齐 mobile WidgetBridge.swift）。
 *
 * - 播放状态由 PlayerStore.notify() → pushToWidget() → syncNowPlayingFromStore(view) 推
 * - 状态变化时同步 4 类数据到 kvStore（共享 preferences，FormExtensionAbility 直接读）
 * - 调 formProvider.updateForm 让已添加的卡片立刻重绘
 * - EntryAbility 启动时 refreshAll() 拉一次最新数据（VIP、歌单、历史、上新）
 *
 * ⚠️ 跨进程坑：preferences 是每进程一份内存缓存实例。主 App 进程和卡片进程各持一份，
 * 一方 flush 到磁盘后另一方仍返回旧缓存值。所以凡是读「可能被对方进程写入」的数据
 * （formId 注册表、播放状态），一律走 kvStore.getJSONFresh() 先 pull 再读。
 *
 * 容错：所有失败仅 Logger.w，不影响主 App 业务。
 */

const TAG = 'WidgetBridge';
/** 上新单曲数量（对齐 iOS LATEST_LIMIT = 5） */
const LATEST_LIMIT = 5;
/** 歌单卡片显示数量（对齐 iOS PLAYLIST_LIMIT = 3） */
const PLAYLIST_LIMIT = 3;
/** 历史卡片数量（对齐 iOS HISTORY_LIMIT = 3） */
const HISTORY_LIMIT = 3;
/**
 * 全局 formId 索引 key。
 * 兜底场景：widget_form_ids_${formName} 依赖卡片进程写入的 formName 与 WidgetKind 枚举字符串
 * 完全一致；一旦系统传的 formName 有出入（空串/别名），主 App 就一条都匹配不到。
 * 这里额外维护一个不依赖 formName 的全局列表，配合 formId→formName 反查做交叉兜底。
 */
const WIDGET_ALL_FORM_IDS = 'widget_all_form_ids';

/** 歌单列表响应（对齐后端 /playlists/mine） */
interface PlaylistListResponse {
  items?: Array<PlaylistListItem>;
}
interface PlaylistListItem {
  id?: string;
  name?: string;
  cover?: string;
  trackCount?: number;
}

/** 历史列表响应（对齐后端 /user/track-history） */
interface HistoryListResponse {
  items?: Array<HistoryListItem>;
}
interface HistoryListItem {
  track?: HistoryListTrack;
}
interface HistoryListTrack {
  id?: string;
  name?: string;
  artist?: string;
  cover?: string;
}

/** 上新单曲响应（对齐后端 /tracks/latest） */
interface LatestListResponse {
  items?: Array<LatestListItem>;
}
interface LatestListItem {
  id?: string;
  name?: string;
  artist?: string;
  cover?: string;
}

/** 歌单卡片行数据 */
interface PlaylistRowDto {
  id: string;
  name: string;
  cover: string;
  trackCount: number;
}

/** 历史卡片行数据 */
interface HistoryRowDto {
  id: string;
  title: string;
  artist: string;
  cover: string;
}

/** 上新单曲行数据 */
interface LatestRowDto {
  id: string;
  title: string;
  artist: string;
  cover: string;
}

/** formName → formId[] 映射条目（持久化到 kvStore 让 EntryAbility 进程能读到） */
interface FormIdsBundle {
  ids: string[];
}

class WidgetBridgeImpl {
  private installed: boolean = false;
  private syncScheduled: boolean = false;

  /** 运行时取 playerStore（动态 import 打破循环依赖） */
  private async getPlayerStore(): Promise<PlayerStoreLite | null> {
    try {
      const mod = await import('../context/PlayerStore');
      return mod.playerStore as PlayerStoreLite;
    } catch (e) {
      Logger.w(TAG, `import PlayerStore: ${String(e)}`);
      return null;
    }
  }

  /**
   * 安装订阅。需在 likesHistory 就绪后调用（EntryAbility.initialize 末尾）。
   *
   * 注意：这里不再 subscribe playerStore —— 那个订阅只在主 App 进程内有效，卡片进程收不到。
   * 播放状态推送改由 PlayerStore.notify() → pushToWidget() → syncNowPlayingFromStore() 驱动。
   */
  install(): void {
    if (this.installed) return;
    this.installed = true;
    likesHistory.on('trackLike', (): void => {
      this.scheduleSyncNowPlaying();
    });
    Logger.i(TAG, 'installed');
  }

  /**
   * 启动时拉取一次全量数据（VIP、歌单、历史、上新），不含播放状态（播放状态等下一次 subscribe 触发）。
   * 拉 VIP 需要 plus token，所以放在 httpClient / authStore 初始化之后。
   */
  async refreshAll(): Promise<void> {
    await Promise.all([
      this.syncVip(),
      this.syncPlaylists(),
      this.syncHistory(),
      this.syncLatest(),
    ]);
    this.scheduleSyncNowPlaying();
  }

  // ─── 实时订阅：now-playing 同步 ────────────────────────────────────────

  /**
   * 1000ms 合并触发（public，供 PlayerStore.notify() 高频路径调用，
   * 避免进度 tick（~50ms 一次）把 formProvider.updateForm 打爆。
   * 系统 hilog 报过 isReportOverSize,checkFail，说明 300ms 还是太频繁。
   */
  scheduleSyncNowPlaying(): void {
    if (this.syncScheduled) return;
    this.syncScheduled = true;
    setTimeout((): void => {
      this.syncScheduled = false;
      this.syncNowPlaying().catch((e: Error): void => {
        Logger.w(TAG, `syncNowPlaying: ${e.message}`);
      });
    }, 1000);
  }

  async syncNowPlaying(): Promise<void> {
    const store = await this.getPlayerStore();
    if (!store) return;
    const view = store.view();
    const cur: WidgetTrack | undefined = view.queue[view.currentIndex];
    Logger.i(TAG, `syncNowPlaying isPlaying=${view.isPlaying} idx=${view.currentIndex} queue=${view.queue.length}`);
    if (!cur) {
      // 清空状态：still 推一次让卡片显示「未在播放」
      const empty: NowPlayingSnapshot = {
        title: '', artist: '', cover: '',
        colorPrimary: '#1a1a2e', colorSecondary: '#16213e',
        isPlaying: false, playMode: view.playMode, isLiked: false,
        updatedAt: Date.now(),
      };
      await this.writeAndPushNowPlaying(empty);
      return;
    }
    const isLiked = cur.id ? await likesHistory.isTrackLiked(cur.id) : false;
    const snap: NowPlayingSnapshot = {
      title: cur.title ?? '',
      artist: cur.artist ?? '',
      cover: cur.coverUrl ?? '',
      colorPrimary: '#3a3a5e',
      colorSecondary: '#222246',
      isPlaying: view.isPlaying,
      playMode: view.playMode,
      isLiked,
      updatedAt: Date.now(),
    };
    await this.writeAndPushNowPlaying(snap);
  }

  // ─── 启动时拉取：VIP、歌单、历史、上新 ────────────────────────────────

  private async syncVip(): Promise<void> {
    try {
      // plus VIP 系统有独立用户 ID（与 authStore.user.id 不同），见 mobile _layout.tsx syncVipState
      const userId = await kvStore.get('plus_user_id');
      if (!userId) {
        // 未登录 plus 会员系统时不写 KV：让 EntryFormAbility.readIsLocked 走「缓存无效 → 不锁定」分支，
        // 避免登录态恢复前把 isVip=false 当作"已同步结果"缓存，导致 VIP 也被错误锁定。
        return;
      }
      const status = await plusApi.getVipStatus(userId);
      const snap: VipSnapshot = {
        isVip: !!status.isVip,
        expiresAt: status.expiresAt ?? null,
        updatedAt: Date.now(),
      };
      await kvStore.setJSON<VipSnapshot>(WIDGET_KV_KEYS.vip, snap);
      Logger.i(TAG, `syncVip isVip=${snap.isVip}`);
    } catch (e) {
      Logger.w(TAG, `syncVip: ${String(e)}`);
    }
  }

  private async syncPlaylists(): Promise<void> {
    try {
      const params: Record<string, string | number | boolean> = {};
      params['pageSize'] = 20;
      const resp = await httpClient.get<PlaylistListResponse>('/playlists/mine', params);
      const rawItems = resp.items ?? [];
      const items: PlaylistRowDto[] = [];
      for (let i = 0; i < rawItems.length && i < PLAYLIST_LIMIT; i++) {
        const it = rawItems[i];
        items.push({
          id: String(it.id ?? ''),
          name: String(it.name ?? ''),
          cover: it.cover ? String(it.cover) : '',
          trackCount: typeof it.trackCount === 'number' ? it.trackCount : 0,
        });
      }
      const snap: PlaylistsSnapshot = { items, updatedAt: Date.now() };
      await kvStore.setJSON<PlaylistsSnapshot>(WIDGET_KV_KEYS.playlists, snap);
      Logger.i(TAG, `syncPlaylists count=${items.length}`);
    } catch (e) {
      Logger.w(TAG, `syncPlaylists: ${String(e)}`);
    }
  }

  private async syncHistory(): Promise<void> {
    const store = await this.getPlayerStore();
    try {
      const params: Record<string, string | number | boolean> = {};
      params['pageSize'] = 20;
      params['loadCount'] = 1;
      params['type'] = 'MUSIC';
      const resp = await httpClient.get<HistoryListResponse>('/user/track-history', params);
      const rawItems = resp.items ?? [];
      const items: HistoryRowDto[] = [];
      let n = 0;
      for (let i = 0; i < rawItems.length && n < HISTORY_LIMIT; i++) {
        const it = rawItems[i];
        if (!it.track) continue;
        items.push({
          id: String(it.track.id ?? ''),
          title: String(it.track.name ?? ''),
          artist: String(it.track.artist ?? ''),
          cover: it.track.cover ? String(it.track.cover) : '',
        });
        n++;
      }
      const view = store ? store.view() : null;
      const cur = view ? view.queue[view.currentIndex] : undefined;
      const np: NowPlayingSnapshot | null = (view && cur) ? {
        title: cur.title ?? '', artist: cur.artist ?? '', cover: cur.coverUrl ?? '',
        colorPrimary: '#3a3a5e', colorSecondary: '#222246',
        isPlaying: view.isPlaying, playMode: view.playMode, isLiked: false,
        updatedAt: Date.now(),
      } : null;
      const snap: HistorySnapshot = { nowPlaying: np, items, updatedAt: Date.now() };
      await kvStore.setJSON<HistorySnapshot>(WIDGET_KV_KEYS.history, snap);
      Logger.i(TAG, `syncHistory count=${items.length}`);
    } catch (e) {
      Logger.w(TAG, `syncHistory: ${String(e)}`);
    }
  }

  private async syncLatest(): Promise<void> {
    try {
      const params: Record<string, string | number | boolean> = {};
      params['type'] = 'MUSIC';
      params['pageSize'] = LATEST_LIMIT;
      const resp = await httpClient.get<LatestListResponse>('/tracks/latest', params);
      const rawItems = resp.items ?? [];
      const items: LatestRowDto[] = [];
      const limit = Math.min(rawItems.length, LATEST_LIMIT);
      for (let i = 0; i < limit; i++) {
        const it = rawItems[i];
        items.push({
          id: String(it.id ?? ''),
          title: String(it.name ?? ''),
          artist: String(it.artist ?? ''),
          cover: it.cover ? String(it.cover) : '',
        });
      }
      const snap: LatestSnapshot = { items, updatedAt: Date.now() };
      await kvStore.setJSON<LatestSnapshot>(WIDGET_KV_KEYS.latest, snap);
      Logger.i(TAG, `syncLatest count=${items.length}`);
    } catch (e) {
      Logger.w(TAG, `syncLatest: ${String(e)}`);
    }
  }

  // ─── formId 注册（EntryFormAbility.onAddForm 调用）────────────────────────

  /**
   * 把 formName → formId 映射写入 kvStore（因为 formProvider.getFormsInfo() 返回的 FormInfo
   * 在 API 24 没有 formId 字段，必须由 EntryFormAbility 主动把 onAddForm 拿到的 formId 登记进来）。
   */
  async registerForm(formName: string, formId: string, formDimension: string): Promise<void> {
    if (formId === '') return;
    const key = `widget_form_ids_${formName}`;
    const bundle = await kvStore.getJSON<FormIdsBundle>(key);
    const ids: string[] = bundle?.ids ?? [];
    if (!ids.includes(formId)) ids.push(formId);
    await kvStore.setJSON<FormIdsBundle>(key, { ids });
    // 写 formId→formName 和 formId→dimension 的反向索引，供 onUpdateForm 反查
    await kvStore.set(`widget_form_name_${formId}`, formName);
    await kvStore.set(`widget_form_dimension_${formId}`, formDimension);
    // 全局索引：兜底 formName 与 WidgetKind 字符串不一致的情况（见 getFormIdsForKind）
    const allBundle = await kvStore.getJSON<FormIdsBundle>(WIDGET_ALL_FORM_IDS);
    const all: string[] = allBundle?.ids ?? [];
    if (!all.includes(formId)) all.push(formId);
    await kvStore.setJSON<FormIdsBundle>(WIDGET_ALL_FORM_IDS, { ids: all });
    Logger.i(TAG, `registerForm name=${formName} id=${formId} dim=${formDimension} all=${all.length}`);
  }

  async unregisterForm(formName: string, formId: string): Promise<void> {
    const key = `widget_form_ids_${formName}`;
    const bundle = await kvStore.getJSON<FormIdsBundle>(key);
    const ids: string[] = (bundle?.ids ?? []).filter((x): boolean => x !== formId);
    await kvStore.setJSON<FormIdsBundle>(key, { ids });
    // 全局索引同步移除
    const allBundle = await kvStore.getJSON<FormIdsBundle>(WIDGET_ALL_FORM_IDS);
    const all: string[] = (allBundle?.ids ?? []).filter((x): boolean => x !== formId);
    await kvStore.setJSON<FormIdsBundle>(WIDGET_ALL_FORM_IDS, { ids: all });
    // 清反向索引
    await kvStore.delete(`widget_form_name_${formId}`);
    await kvStore.delete(`widget_form_dimension_${formId}`);
  }

  /**
   * 取某个 kind 对应的全部 formId。
   *
   * 为什么不能直接读 widget_form_ids_${kind}：这个 key 是卡片进程（EntryFormAbility.onAddForm）
   * 写的，主 App 进程持有的是自己启动时创建的 preferences 缓存实例，读不到卡片进程新写入的值，
   * 会永远返回空数组 → updateForms 直接 return → 卡片永远停在「未在播放」骨架。
   *
   * 所以：先 kvStore.pull() 丢弃缓存从磁盘重载，再读；并且用全局索引 + name 反向索引做交叉兜底，
   * 避免 formName 与 WidgetKind 枚举字符串不一致时完全匹配不上。
   */
  private async getFormIdsForKind(kind: WidgetKind): Promise<string[]> {
    await kvStore.pull();
    const direct = await kvStore.getJSON<FormIdsBundle>(`widget_form_ids_${kind}`);
    const raw: string[] = direct?.ids ?? [];
    // 全局索引交叉兜底：按 formId→formName 反查，命中 kind 的也加进来
    const allBundle = await kvStore.getJSON<FormIdsBundle>(WIDGET_ALL_FORM_IDS);
    const all: string[] = allBundle?.ids ?? [];
    for (let i = 0; i < all.length; i++) {
      const name = await kvStore.get(`widget_form_name_${all[i]}`);
      if (name === String(kind) && !raw.includes(all[i])) {
        raw.push(all[i]);
      }
    }
    // 清洗历史脏数据：旧版 onAddForm 读错了 formId 的 key（用了不存在的
    // ohos.extra.param.key.form_id），把空字符串写进了注册表并持久化。
    // 空 formId 会让 updateForm 报 "The formId is invalid" 且长度算 1，
    // 导致 updateForms 误以为有卡片而提前进入推送流程，真实卡片永远收不到数据。
    const ids: string[] = [];
    let dirty: boolean = false;
    for (let i = 0; i < raw.length; i++) {
      const id: string = raw[i];
      if (id === '' || id === 'undefined' || id === 'null') {
        dirty = true;
        continue;
      }
      if (!ids.includes(id)) ids.push(id);
    }
    if (dirty) {
      Logger.w(TAG, `getFormIdsForKind ${kind}: 清洗脏 formId，重写注册表`);
      await kvStore.setJSON<FormIdsBundle>(`widget_form_ids_${kind}`, { ids });
      await kvStore.setJSON<FormIdsBundle>(WIDGET_ALL_FORM_IDS,
        { ids: all.filter((x): boolean => x !== '' && x !== 'undefined' && x !== 'null') });
    }
    return ids;
  }

  // ─── 写 KV + 推卡片 ──────────────────────────────────────────────────────

  private async writeAndPushNowPlaying(value: NowPlayingSnapshot): Promise<void> {
    await kvStore.setJSON<NowPlayingSnapshot>(WIDGET_KV_KEYS.nowPlaying, value);
    await this.updateForms(WidgetKind.PLAYER, value);
  }

  /**
   * 推送卡片数据：把整个 snapshot 当 FormBindingData，ArkTS 卡片通过 @LocalStorageProp 接收。
   * 通过 kvStore 里维护的 formName → formId[] 映射拿到目标卡片，逐条 updateForm。
   * 每个 formId 的 dimension 从 widget_form_dimension_${formId} 读，确保不同尺寸卡片渲染正确。
   */
  private async updateForms<T>(kind: WidgetKind, payload: T): Promise<void> {
    try {
      const ids: string[] = await this.getFormIdsForKind(kind);
      Logger.i(TAG, `updateForms kind=${kind} ids=${ids.length}`);
      if (ids.length === 0) return;
      const data: Record<string, Object> = {};
      const keys = Object.keys(payload as object);
      for (let i = 0; i < keys.length; i++) {
        data[keys[i]] = (payload as Record<string, Object>)[keys[i]];
      }
      // isLocked 卡片侧按 VIP 判定，主 App 推送时带上当前缓存值避免卡片闪回锁定页
      const vip = await kvStore.getJSON<VipSnapshot>(WIDGET_KV_KEYS.vip);
      data['isLocked'] = vip ? !vip.isVip : false;
      for (let i = 0; i < ids.length; i++) {
        const formId: string = ids[i];
        try {
          // 每个 formId 单独拼 dimension（不同尺寸卡片渲染不同布局）
          const dim = await kvStore.get(`widget_form_dimension_${formId}`) ?? '2*2';
          data['formDimension'] = dim;
          const binding = formBindingData.createFormBindingData(data);
          await formProvider.updateForm(formId, binding);
          Logger.i(TAG, `updateForm ${formId} kind=${kind} dim=${dim}`);
        } catch (e) {
          // "The ID of the form to be operated does not exist" → 卡片已被用户从桌面删除，
          // 从注册表移除孤儿 formId 避免后续推送继续报错。
          const msg = String(e);
          if (msg.includes('does not exist') || msg.includes('not exist') || msg.includes('invalid')) {
            const name = await kvStore.get(`widget_form_name_${formId}`) ?? String(kind);
            Logger.w(TAG, `updateForm ${formId} 已不存在，自动 unregister（name=${name}）`);
            await this.unregisterForm(name, formId).catch((): void => undefined);
          } else {
            Logger.w(TAG, `updateForm ${formId}: ${msg}`);
          }
        }
      }
    } catch (e) {
      Logger.w(TAG, `updateForms ${kind}: ${String(e)}`);
    }
  }

  // ─── 给 WidgetCommandHandler 用的辅助方法 ────────────────────────────────

  /** 立即 cycle 播放模式（iOS mode 按钮行为，调用现有 togglePlayMode） */
  cyclePlayMode(): void {
    this.getPlayerStore().then((store: PlayerStoreLite | null): void => {
      if (store) store.togglePlayMode();
    });
  }

  /** 立即刷新（refresh_latest 指令后调用） */
  async refreshLatestNow(): Promise<void> {
    await this.syncLatest();
  }

  /** 立即刷新歌单（play_playlist 路径上如果需要也可用） */
  async refreshPlaylistsNow(): Promise<void> {
    await this.syncPlaylists();
  }

  /** 读 VIP 状态（卡片锁定页判定） */
  async readVip(): Promise<VipSnapshot> {
    const v = await kvStore.getJSON<VipSnapshot>(WIDGET_KV_KEYS.vip);
    return v ?? { isVip: false, expiresAt: null, updatedAt: 0 };
  }
}

export const widgetBridge = new WidgetBridgeImpl();

/** 重新导出供卡片组件引用 */
export { getImageUrl };
