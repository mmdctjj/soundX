import { socketService } from 'features_socket';
import { Logger } from 'audiodock_common';

/**
 * SyncStore 与 PlayerStore 双向通信的 Track 类型，故意定义为 object 而非从
 * PlayerStore import，避免两个单例 store 形成循环依赖。调用方（PlayerStore /
 * SyncInviteModal）在 emit 时直接传入 PlayerStore.Track 实例，接收端需要时再做
 * 字段读取（运行时 ArkTS 允许对象在结构兼容时相互赋值）。
 */
export type SyncTrack = object;

/** 同步会话中的参与者（对齐 mobile SyncContext.Participant）。 */
export interface SyncParticipant {
  userId: string;
  username: string;
  deviceName: string;
  socketId: string;
}

/** 收到的同步播放邀请（对齐 mobile SyncContext.SyncInvite）。 */
export interface SyncInvite {
  fromUserId: string;
  fromUsername: string;
  fromDeviceName: string;
  fromSocketId: string;
  sessionId: string;
  currentTrack?: SyncTrack;
  playlist?: SyncTrack[];
  progress?: number;
  timestamp: number;
}

interface ParticipantsUpdatePayload {
  participants: SyncParticipant[];
}

interface SessionStartedPayload {
  sessionId: string;
}

interface InviteHandledPayload {
  fromUserId: string;
}

interface PlayerLeftPayload {
  username: string;
  deviceName: string;
}

interface PlayerLeftSessionPayload {
  sessionId: string;
}

export interface InviteUsersPayload {
  targetUserIds: string[];
  currentTrack?: SyncTrack;
  playlist?: SyncTrack[];
  progress?: number;
  sessionId: string;
}

interface RespondInvitePayload {
  fromUserId: string;
  fromSocketId: string;
  sessionId: string;
  accept: boolean;
}

/** SyncStore 的外部视图，避免暴露可变内部字段。 */
export interface SyncStateView {
  isSynced: boolean;
  sessionId: string | null;
  participants: SyncParticipant[];
  invites: SyncInvite[];
  lastAcceptedInvite: SyncInvite | null;
  /** 用户是否在 Settings 开启了「接受同步邀请」。 */
  acceptSync: boolean;
}

type Listener = () => void;
type PlayerLeftListener = (p: PlayerLeftPayload) => void;

/**
 * 同步播放状态 Store。对齐 mobile 的 SyncContext：
 * - 通过 HarmonySocketService 接收 invite_received / participants_update /
 *   sync_session_started / invite_handled 四类消息并更新自身状态；
 * - 提供 acceptInvite / rejectInvite / leaveSession 等动作，调用方按需使用；
 * - 接受邀请的副作用（应用 currentTrack + playlist + progress）由 PlayerStore 监听
 *   lastAcceptedInvite 完成，SyncStore 自身只负责事件透传，避免耦合。
 *
 * Socket 连接的建立与断开由调用方（一般是 Index.ets 启动后）通过
 * authStore.connectSyncSocket() 触发；这里只在监听事件时假设 socket 已就绪。
 */
export class SyncStore {
  private _isSynced: boolean = false;
  private _sessionId: string | null = null;
  private _participants: SyncParticipant[] = [];
  private _invites: SyncInvite[] = [];
  private _lastAcceptedInvite: SyncInvite | null = null;
  /** 默认 true，与 mobile SettingsContext.defaultSettings.acceptSync 一致。 */
  private _acceptSync: boolean = true;

  private listeners = new Set<Listener>();
  private playerLeftListeners = new Set<PlayerLeftListener>();
  private socketBound: boolean = false;

  /** 返回当前快照，调用方通过 view() 拿数据 + subscribe() 订阅更新。 */
  view(): SyncStateView {
    return {
      isSynced: this._isSynced,
      sessionId: this._sessionId,
      participants: this._participants,
      invites: this._invites,
      lastAcceptedInvite: this._lastAcceptedInvite,
      acceptSync: this._acceptSync,
    };
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return (): void => { this.listeners.delete(l); };
  }

  setAcceptSync(enabled: boolean): void {
    this._acceptSync = enabled;
    this.notify();
  }

  /** 绑定同步相关 socket 事件监听（幂等）。 */
  bindSocketEvents(): void {
    if (this.socketBound) return;
    this.socketBound = true;
    socketService.on('invite_received', (payload: Object | null | undefined): void => {
      this.handleInviteReceived(payload as SyncInvite);
    });
    socketService.on('participants_update', (payload: Object | null | undefined): void => {
      this.handleParticipantsUpdate(payload as ParticipantsUpdatePayload);
    });
    socketService.on('sync_session_started', (payload: Object | null | undefined): void => {
      if (!payload) return;
      this.handleSessionStarted(payload as SessionStartedPayload);
    });
    socketService.on('invite_handled', (payload: Object | null | undefined): void => {
      if (!payload) return;
      this.handleInviteHandled(payload as InviteHandledPayload);
    });
    socketService.on('session_ended', (): void => {
      this.handleSessionEnded();
    });
    socketService.on('player_left', (payload: Object | null | undefined): void => {
      // 仅转发给监听者，UI 弹窗由 PlayerPage 自行决定文案
      if (!payload) return;
      this.emitPlayerLeft(payload as PlayerLeftPayload);
    });
    Logger.i('SyncStore', 'socket listeners bound');
  }

  unbindSocketEvents(): void {
    if (!this.socketBound) return;
    this.socketBound = false;
    socketService.off('invite_received');
    socketService.off('participants_update');
    socketService.off('sync_session_started');
    socketService.off('invite_handled');
    socketService.off('session_ended');
    socketService.off('player_left');
  }

  // ───────── 外部动作 ─────────

  setSynced(synced: boolean, sessionId: string | null): void {
    this._isSynced = synced;
    this._sessionId = sessionId;
    if (!synced) {
      // 离开会话：清空参与者，最后接受的邀请仍保留供 UI 提示用
      this._participants = [];
    }
    this.notify();
  }

  setParticipants(participants: SyncParticipant[]): void {
    this._participants = participants;
    this.notify();
  }

  removeInvite(sessionId: string): void {
    this._invites = this._invites.filter((i): boolean => i.sessionId !== sessionId);
    this.notify();
  }

  acceptInvite(invite: SyncInvite): void {
    const payload: RespondInvitePayload = {
      fromUserId: invite.fromUserId,
      fromSocketId: invite.fromSocketId,
      sessionId: invite.sessionId,
      accept: true,
    };
    socketService.emit('respond_invite', payload);
    this._lastAcceptedInvite = invite;
    this._isSynced = true;
    this._sessionId = invite.sessionId;
    this.removeInvite(invite.sessionId);
  }

  rejectInvite(invite: SyncInvite): void {
    const payload: RespondInvitePayload = {
      fromUserId: invite.fromUserId,
      fromSocketId: invite.fromSocketId,
      sessionId: invite.sessionId,
      accept: false,
    };
    socketService.emit('respond_invite', payload);
    this.removeInvite(invite.sessionId);
  }

  /**
   * 由发起方调用：携带当前曲目/播放列表/进度向 targetUserIds 推送邀请。
   * 先暂停音频，等待对方加入再恢复（对齐 mobile SyncModal.handleInvite）。
   */
  inviteUsers(payload: InviteUsersPayload): void {
    socketService.emit('invite', payload);
  }

  /** 主动离开会话（用户从 PlayerPage 点「断开」）。 */
  leaveSession(): void {
    if (this._sessionId) {
      const leftPayload: PlayerLeftSessionPayload = { sessionId: this._sessionId };
      socketService.emit('player_left', leftPayload);
    }
    this._isSynced = false;
    this._sessionId = null;
    this._participants = [];
    this.notify();
  }

  // ───────── 入站事件处理 ─────────

  private handleInviteReceived(payload: SyncInvite): void {
    if (!this._acceptSync) {
      // 设置关闭时直接拒绝，避免弹窗
      this.rejectInvite(payload);
      return;
    }
    this._invites = [...this._invites, payload];
    this.notify();
  }

  private handleParticipantsUpdate(payload: ParticipantsUpdatePayload): void {
    this._participants = payload.participants ?? [];
    this.notify();
  }

  private handleSessionStarted(payload: SessionStartedPayload): void {
    Logger.i('SyncStore', `session started: ${payload.sessionId}`);
    this._isSynced = true;
    this._sessionId = payload.sessionId;
    this.notify();
  }

  private handleInviteHandled(payload: InviteHandledPayload): void {
    // 另一端已处理同一邀请，本地移除避免重复弹窗
    this._invites = this._invites.filter(
      (i): boolean => i.fromUserId !== payload.fromUserId,
    );
    this.notify();
  }

  private handleSessionEnded(): void {
    this._isSynced = false;
    this._sessionId = null;
    this._participants = [];
    this.notify();
  }

  /** 透传 player_left 事件给 UI 层（PlayerPage 监听后弹 AlertDialog）。 */
  onPlayerLeft(cb: PlayerLeftListener): () => void {
    this.playerLeftListeners.add(cb);
    return (): void => { this.playerLeftListeners.delete(cb); };
  }

  private emitPlayerLeft(payload: PlayerLeftPayload): void {
    this.playerLeftListeners.forEach((cb): void => {
      cb(payload);
    });
  }

  private notify(): void {
    this.listeners.forEach((l): void => {
      l();
    });
  }
}

export const syncStore: SyncStore = new SyncStore();