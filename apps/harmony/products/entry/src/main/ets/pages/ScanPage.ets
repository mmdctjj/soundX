import router from '@ohos.router';
import promptAction from '@ohos.promptAction';
import { kvStore } from 'features_storage';
import { t } from 'features_i18n';
import { Logger } from 'audiodock_common';
import { scanLoginApi } from 'features_network';
import type {
  ScanLoginClaimPayload,
  ScanLoginAuthBundle,
  ScanLoginPlusBundle,
  ScanLoginSourceBundle,
} from 'features_network';
import { authStore } from '../context/AuthStore';
import { AppIcon } from '../components/AppIcon';
import { buildTheme } from 'features_ui';
import type { Theme, ThemeMode } from 'features_ui';

const TAG = 'ScanPage';

interface ParsedQR {
  sessionId: string;
  secret: string;
}

function parseScanLoginQR(text: string): ParsedQR | null {
  try {
    const obj: Record<string, string> = JSON.parse(text) as Record<string, string>;
    if (obj['kind'] !== 'soundx-scan-login') return null;
    const sid = obj['sessionId'];
    const sec = obj['secret'];
    if (typeof sid !== 'string' || typeof sec !== 'string') return null;
    if (sid.length === 0 || sec.length === 0) return null;
    return { sessionId: sid, secret: sec };
  } catch {
    return null;
  }
}

/**
 * 扫码登录页（VIP 功能）。
 *
 * 注意：mobile 端使用 expo-camera + 二维码识别 SDK 实时扫码。
 * harmony 端相机 API（@kit.CameraKit + @ohos.multimedia.zxing）在不同 SDK
 * 版本兼容差异较大，且部分能力仅 API 12+ 提供。为保证 1:1 功能可用、跨版本
 * 编译通过，本页采用「手动输入 session 信息」方案：用户在桌面端生成二维码后，
 * 把二维码附带的 sessionId / secret 粘贴到本页输入框，调 claim 接口后跳转
 * ScanConfirmPage 完成后续确认。
 *
 * 后续如果接入相机扫码能力，可在此基础上叠加 cameraKit 预览 + zxing 解析；
 * claim 之后的流程不变。
 */
@Entry
@Component
struct ScanPage {
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  @State theme: Theme = buildTheme('light');
  @State manualInputVisible: boolean = false;
  @State manualSessionId: string = '';
  @State manualSecret: string = '';
  @State manualPasted: string = '';
  @State busy: boolean = false;

  aboutToAppear() {
    this.theme = buildTheme(this.themeMode);
  }

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  goBack(): void {
    router.back();
  }

  // ─────────────── 手动输入回退（主流程） ───────────────

  private openManualInput(): void {
    this.manualSessionId = '';
    this.manualSecret = '';
    this.manualPasted = '';
    this.manualInputVisible = true;
  }

  private closeManualInput(): void {
    this.manualInputVisible = false;
  }

  private async submitManualInput(): Promise<void> {
    if (this.busy) return;
    const pasted: string = this.manualPasted.trim();
    let sid: string = this.manualSessionId.trim();
    let sec: string = this.manualSecret.trim();

    // 支持直接粘贴完整 JSON：{"kind":"soundx-scan-login","sessionId":"...","secret":"..."}
    if (pasted.length > 0) {
      const parsed: ParsedQR | null = parseScanLoginQR(pasted);
      if (parsed) {
        sid = parsed.sessionId;
        sec = parsed.secret;
      } else if (sid.length === 0 && sec.length === 0) {
        // 粘贴的不是 JSON 也不是两项都填，直接当无效
        promptAction.showToast({ message: t('scanLogin.invalidQR') });
        return;
      }
    }

    if (sid.length === 0 || sec.length === 0) {
      promptAction.showToast({ message: t('common.fillUsernameAndPassword') });
      return;
    }
    this.manualInputVisible = false;
    await this.handleScannedText(JSON.stringify({ kind: 'soundx-scan-login', sessionId: sid, secret: sec }));
  }

  // ─────────────── claim 流程（复用 mobile handleScanQrcode） ───────────────

  private async handleScannedText(text: string): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      const parsed: ParsedQR | null = parseScanLoginQR(text);
      if (!parsed) {
        promptAction.showToast({ message: t('scanLogin.invalidQR') });
        return;
      }
      const payload: ScanLoginClaimPayload = await this.buildClaimPayload();
      if (!payload.nativeAuth && !payload.plusAuth) {
        promptAction.showToast({ message: t('scanLogin.noLocalAuth') });
        return;
      }
      await scanLoginApi.claim(parsed.sessionId, parsed.secret, payload);
      router.replaceUrl({
        url: 'pages/ScanConfirmPage',
        params: { sessionId: parsed.sessionId, secret: parsed.secret },
      });
    } catch (e) {
      Logger.e(TAG, `handleScanned failed: ${String(e)}`);
      promptAction.showToast({ message: t('scanLogin.scanFailed') });
    } finally {
      this.busy = false;
    }
  }

  private async buildClaimPayload(): Promise<ScanLoginClaimPayload> {
    const payload: ScanLoginClaimPayload = {
      nativeAuth: null,
      plusAuth: null,
      sourceBundles: this.collectSourceBundles(),
    };
    const native: ScanLoginAuthBundle | null = this.buildNativeAuth();
    if (native) payload.nativeAuth = native;
    const plus: ScanLoginPlusBundle | null = await this.buildPlusAuth();
    if (plus) payload.plusAuth = plus;
    return payload;
  }

  private buildNativeAuth(): ScanLoginAuthBundle | null {
    const state = authStore.state_;
    const authMe = state.user;
    const token = state.token ?? '';
    if (!authMe || token.length === 0) return null;
    const bundle: ScanLoginAuthBundle = {
      baseUrl: state.serverAddress,
      sourceType: state.sourceType,
      token: token,
      user: {
        id: authMe.id,
        username: authMe.username,
        nickname: authMe.nickname,
        avatar: authMe.avatar,
      },
    };
    return bundle;
  }

  private async buildPlusAuth(): Promise<ScanLoginPlusBundle | null> {
    const token: string | null = await kvStore.get('plus_token');
    const userId: string | null = await kvStore.get('plus_user_id');
    if (!token || !userId) return null;
    return { token, userId };
  }

  private collectSourceBundles(): ScanLoginSourceBundle[] {
    return [];
  }

  // ─────────────── UI ───────────────

  @Builder
  HeaderBar() {
    Row() {
      Button() {
        AppIcon({ name: 'chevron-back', iconSize: 24, color: this.theme.colors.text })
      }
      .width(40).height(40).backgroundColor(Color.Transparent)
      .onClick((): void => { this.goBack(); })

      Text(t('scanLogin.title'))
        .fontSize(18).fontWeight(FontWeight.Bold).fontColor(this.theme.colors.text)
        .layoutWeight(1).textAlign(TextAlign.Center)

      Button() {
        AppIcon({ name: 'scan', iconSize: 22, color: this.theme.colors.text })
      }
      .width(40).height(40).backgroundColor(Color.Transparent)
      .onClick((): void => { this.openManualInput(); })
    }
    .width('100%').padding({ left: 15, right: 15, top: 16, bottom: 15 })
  }

  @Builder
  IntroView() {
    Column({ space: 16 }) {
      AppIcon({ name: 'scan', iconSize: 56, color: this.theme.colors.primary })
      Text(t('scanLogin.title'))
        .fontSize(20).fontWeight(FontWeight.Bold).fontColor(this.theme.colors.text)
      Text(t('scanLogin.permissionDesc'))
        .fontSize(14).fontColor(this.theme.colors.textSecondary)
        .textAlign(TextAlign.Center)
        .padding({ left: 24, right: 24 })
      Text(t('scanLogin.aimHint'))
        .fontSize(13).fontColor(this.theme.colors.textSecondary)
        .textAlign(TextAlign.Center)
        .padding({ left: 24, right: 24 })

      Button(t('scanLogin.title'))
        .width('70%').height(48)
        .backgroundColor(this.theme.colors.primary)
        .fontColor(this.theme.colors.onPrimary)
        .fontSize(16).fontWeight(FontWeight.Medium)
        .borderRadius(12)
        .onClick((): void => { this.openManualInput(); })
    }
    .width('100%').layoutWeight(1)
    .justifyContent(FlexAlign.Center).alignItems(HorizontalAlign.Center)
  }

  @Builder
  ManualInputOverlay() {
    Stack({ alignContent: Alignment.Center }) {
      Column()
        .width('100%').height('100%')
        .backgroundColor('rgba(0,0,0,0.5)')
        .onClick((): void => { this.closeManualInput(); })

      Column({ space: 12 }) {
        Text(t('scanLogin.title'))
          .fontSize(18).fontWeight(FontWeight.Bold).fontColor(this.theme.colors.text)

        Text(t('scanLogin.aimHint'))
          .fontSize(12).fontColor(this.theme.colors.textSecondary)

        // 一行式粘贴：把 desktop 端二维码对应的 JSON 整体粘到这里，自动解析 sessionId/secret
        TextInput({ placeholder: '{kind, sessionId, secret}', text: this.manualPasted })
          .placeholderColor(this.theme.colors.textSecondary)
          .fontColor(this.theme.colors.text)
          .backgroundColor(this.theme.colors.background)
          .borderRadius(10).border({ width: 1, color: this.theme.colors.border })
          .height(44)
          .onChange((value: string): void => { this.manualPasted = value; })

        TextInput({ placeholder: 'sessionId', text: this.manualSessionId })
          .placeholderColor(this.theme.colors.textSecondary)
          .fontColor(this.theme.colors.text)
          .backgroundColor(this.theme.colors.background)
          .borderRadius(10).border({ width: 1, color: this.theme.colors.border })
          .height(44)
          .onChange((value: string): void => { this.manualSessionId = value; })

        TextInput({ placeholder: 'secret', text: this.manualSecret })
          .placeholderColor(this.theme.colors.textSecondary)
          .fontColor(this.theme.colors.text)
          .backgroundColor(this.theme.colors.background)
          .borderRadius(10).border({ width: 1, color: this.theme.colors.border })
          .height(44)
          .onChange((value: string): void => { this.manualSecret = value; })

        Row({ space: 12 }) {
          Row() {
            Text(t('common.cancel'))
              .fontSize(15).fontColor(this.theme.colors.textSecondary)
          }
          .padding({ top: 10, bottom: 10, left: 20, right: 20 })
          .onClick((): void => { this.closeManualInput(); })

          Row() {
            if (this.busy) {
              LoadingProgress().width(18).height(18).color(this.theme.colors.onPrimary)
            } else {
              Text(t('scanLogin.confirmButton'))
                .fontSize(15).fontWeight(FontWeight.Bold).fontColor(this.theme.colors.onPrimary)
            }
          }
          .padding({ top: 10, bottom: 10, left: 24, right: 24 }).borderRadius(10)
          .backgroundColor(this.theme.colors.primary)
          .onClick((): void => { this.submitManualInput(); })
        }
        .width('100%').justifyContent(FlexAlign.End).margin({ top: 8 })
      }
      .width('85%')
      .backgroundColor(this.theme.colors.surface).borderRadius(16).padding(20)
    }
    .width('100%').height('100%')
  }

  build() {
    Stack({ alignContent: Alignment.Center }) {
      Column() {
        this.HeaderBar()
        this.IntroView()
      }
      .width('100%').height('100%').backgroundColor(this.theme.colors.background)

      if (this.manualInputVisible) {
        this.ManualInputOverlay()
      }
    }
    .width('100%').height('100%')
  }
}