/**
 * MV 视频播放器组件（对齐 mobile apps/mobile/app/mv/[id].tsx）。
 *
 * 使用 ArkUI 内置 Video 组件 + 自定义 controller；自定义控件（中央播放按钮、
 * Slider 进度条、上一首/下一首、全屏）；自动隐藏（3s）；播放结束回调支持连续播放。
 *
 * 布局：
 *   Stack
 *     ├ Video（铺满）
 *     ├ 点击热区（铺满，点击切换控件显隐）
 *     ├ 顶部遮罩层（控件显示时，半透明黑）
 *     ├ 中央播放按钮（控件显示时）
 *     └ 底部控件栏（控件显示时，绝对贴底）
 *
 * 注意：
 *  - Video 组件的时长单位是**秒**（不是毫秒）。
 *  - props 变化（mv/url 切换）需要父组件受控切换。
 */
import type { Theme } from 'features_ui';
import type { MVDto } from 'features_network';
import { AppIcon } from './AppIcon';
import { window } from '@kit.ArkUI';

interface VideoProgress {
  currentTime: number;
  duration: number;
}

interface VideoPreparedEvent {
  duration: number;
}

interface VideoUpdateEvent {
  time: number;
}

interface FullscreenInfo {
  fullscreen: boolean;
}

@Component
export struct MvVideoPlayer {
  /** 当前播放的 MV。 */
  @Prop @Watch('onMvChange') mv: MVDto | null = null;
  /** 视频 URL（已通过 getImageUrl 拼好的绝对地址）。 */
  @Prop @Watch('onUrlChange') videoUrl: string = '';
  /** 主题。 */
  @Prop theme: Theme;
  /** 是否正在播放（受控）。 */
  @Prop @Watch('onIsPlayingChange') isPlaying: boolean = true;
  /** 列表模式：loop=false 让播放结束走 onEnded 让父组件连播。 */
  @Prop inPlaylist: boolean = false;
  /** 上一首/下一首可用性。 */
  @Prop hasPrev: boolean = false;
  @Prop hasNext: boolean = false;

  @State currentTime: number = 0;
  @State duration: number = 0;
  @State controlsVisible: boolean = true;
  @State preparing: boolean = false;
  /**
   * 全屏状态：仅用于切换全屏按钮图标（expand/contract）和 onFullscreenChange 回调同步；
   * 全屏时**不显示自定义控件**（系统播放器接管，全屏窗口里只看到系统 UI）。
   * 真正的横屏全屏由 VideoController.requestFullscreen(true) + setPreferredOrientation(LANDSCAPE) 保证。
   */
  @State isFullscreen: boolean = false;

  private controller: VideoController = new VideoController();
  private hideTimer: number = -1;
  /** 外部触发 start/pause 时跳过 watcher 自身的 onIsPlayingChange（避免和父组件状态打架）。 */
  private suppressNextPlaying: boolean = false;

  onPrev?: () => void;
  onNext?: () => void;
  onEnded?: () => void;
  /** 用户点击中央播放/暂停按钮时通知父组件（受控切换）。 */
  onTogglePlay?: (nextPlaying: boolean) => void;
  /** 进度回调（父组件可选用）。 */
  onProgress?: (p: VideoProgress) => void;

  aboutToAppear(): void {
    this.scheduleHide();
  }

  aboutToDisappear(): void {
    this.clearHideTimer();
    // 组件销毁兜底：如果还在全屏，退出并恢复主窗口方向。
    if (this.isFullscreen) {
      this.controller.exitFullscreen();
    }
    this.restorePortraitOrientation();
  }

  /**
   * 把主窗口方向恢复成竖屏（兜底）。
   * 不传参给 getContext：API 12+ 返回最近 component 的 context。
   */
  private restorePortraitOrientation(): void {
    const ctx: Context = getContext();
    window.getLastWindow(ctx).then((win: window.Window) => {
      win.setPreferredOrientation(window.Orientation.PORTRAIT);
    }).catch(() => undefined);
  }

  private onMvChange(): void {
    this.currentTime = 0;
    this.duration = 0;
    this.controlsVisible = true;
    this.scheduleHide();
  }

  private onUrlChange(): void {
    this.currentTime = 0;
    this.duration = 0;
    this.preparing = true;
    this.controlsVisible = true;
    this.scheduleHide();
  }

  private onIsPlayingChange(): void {
    if (this.suppressNextPlaying) {
      this.suppressNextPlaying = false;
      return;
    }
    if (!this.videoUrl) return;
    if (this.isPlaying) {
      this.controller.start();
    } else {
      this.controller.pause();
    }
  }

  private clearHideTimer(): void {
    if (this.hideTimer !== -1) {
      clearTimeout(this.hideTimer);
      this.hideTimer = -1;
    }
  }

  private scheduleHide(): void {
    this.clearHideTimer();
    if (!this.isPlaying) {
      this.controlsVisible = true;
      return;
    }
    this.hideTimer = setTimeout(() => {
      this.controlsVisible = false;
      this.hideTimer = -1;
    }, 3000);
  }

  private toggleControls(): void {
    this.controlsVisible = !this.controlsVisible;
    if (this.controlsVisible) {
      this.scheduleHide();
    } else {
      this.clearHideTimer();
    }
  }

  private formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  private togglePlay(): void {
    const next = !this.isPlaying;
    this.suppressNextPlaying = true;
    if (next) {
      this.controller.start();
    } else {
      this.controller.pause();
    }
    if (this.onTogglePlay) this.onTogglePlay(next);
    if (next) {
      this.scheduleHide();
    } else {
      this.controlsVisible = true;
      this.clearHideTimer();
    }
  }

  private toggleFullscreen(): void {
    // 拉起横屏全屏（对齐 mobile apps/mobile/app/mv/[id].tsx:266 orientation: "landscape"）。
    // - 走 VideoController.requestFullscreen(true)：系统拉起独立全屏窗口（系统播放器 UI），
    //   该窗口默认横屏，保证横屏全屏；
    // - 自定义控件（Slider/按钮）仍渲染在 MVDetailPage，被系统全屏窗口遮住看不到。
    //   这是用户主动选择的方案：放弃全屏下自定义控件，换取稳定的横屏全屏。
    // - setPreferredOrientation(LANDSCAPE) 兜底，确保主窗口在退出全屏时也是横屏方向。
    // getContext() 不传参：返回最近一个 component 的 context（API 12+）。
    const ctx: Context = getContext();
    if (this.isFullscreen) {
      this.controller.exitFullscreen();
      window.getLastWindow(ctx).then((win: window.Window) => {
        win.setPreferredOrientation(window.Orientation.PORTRAIT);
      }).catch(() => undefined);
    } else {
      this.controller.requestFullscreen(true);
      window.getLastWindow(ctx).then((win: window.Window) => {
        win.setPreferredOrientation(window.Orientation.LANDSCAPE);
      }).catch(() => undefined);
    }
  }

  private handlePrev(): void {
    if (!this.hasPrev || !this.onPrev) return;
    this.onPrev();
    this.scheduleHide();
  }

  private handleNext(): void {
    if (!this.hasNext || !this.onNext) return;
    this.onNext();
    this.scheduleHide();
  }

  private onSliderChange(value: number, mode: SliderChangeMode): void {
    if (mode === SliderChangeMode.End || mode === SliderChangeMode.Click) {
      this.controller.setCurrentTime(value);
      this.currentTime = value;
      this.scheduleHide();
    } else {
      this.currentTime = value;
    }
  }

  build() {
    Stack({ alignContent: Alignment.Bottom }) {
      // 1. 视频本体
      if (this.videoUrl.length > 0) {
        Video({
          src: this.videoUrl,
          previewUri: this.mv?.cover ?? '',
          controller: this.controller,
          currentProgressRate: 1.0,
        })
          .width('100%')
          .height('100%')
          .objectFit(ImageFit.Contain)
          .backgroundColor(Color.Black)
          .controls(false)
          .autoPlay(this.isPlaying)
          .loop(!this.inPlaylist)
          .onStart(() => {
            this.preparing = false;
          })
          .onError(() => {
            this.preparing = false;
          })
          .onPrepared((event: VideoPreparedEvent) => {
            if (event && typeof event.duration === 'number' && event.duration > 0) {
              this.duration = event.duration;
            }
            this.preparing = false;
          })
          .onUpdate((event: VideoUpdateEvent) => {
            if (event && typeof event.time === 'number') {
              this.currentTime = event.time;
              if (this.onProgress) this.onProgress({ currentTime: event.time, duration: this.duration });
            }
          })
          .onFinish(() => {
            if (this.inPlaylist && this.onEnded) this.onEnded();
          })
          .onFullscreenChange((info: FullscreenInfo) => {
            const wasFullscreen = this.isFullscreen;
            this.isFullscreen = info.fullscreen;
            // 响应式恢复：用户通过系统手势/返回键退出全屏时也会触发，
            // 不依赖 toggleFullscreen 内部调用。
            if (wasFullscreen && !info.fullscreen) {
              this.restorePortraitOrientation();
            }
          });
      } else {
        Column() {
          Text('MV not found')
            .fontColor(Color.White)
            .fontSize(14);
        }
        .width('100%')
        .height('100%')
        .backgroundColor(Color.Black)
        .justifyContent(FlexAlign.Center);
      }

      // 2. 点击热区（永远在最上层，铺满，点击切换控件显隐）
      if (this.videoUrl.length > 0) {
        Column()
          .width('100%')
          .height('100%')
          .onClick(() => this.toggleControls());
      }

      // 3. 缓冲中
      if (this.preparing) {
        LoadingProgress()
          .width(36)
          .height(36)
          .color(this.theme.colors.primary);
      }

      // 4. 控件显示时的遮罩 + 中央按钮 + 底部控件栏
      if (this.controlsVisible && this.videoUrl.length > 0) {
        // 顶部半透明遮罩
        Column()
          .width('100%')
          .height('100%')
          .backgroundColor('rgba(0,0,0,0.30)')
          .position({ x: 0, y: 0 });

        // 中央播放按钮（absolute）
        Column() {
          AppIcon({
            name: this.isPlaying ? 'pause' : 'play',
            iconSize: 32,
            color: '#FFFFFF',
          });
        }
        .width(72)
        .height(72)
        .borderRadius(36)
        .backgroundColor('rgba(0,0,0,0.50)')
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center)
        .position({ x: '50%', y: '50%' })
        .markAnchor({ x: '50%', y: '50%' })
        .onClick(() => this.togglePlay());

        // 底部控件栏（自己实现全屏后控件要更大；外层 MVDetailPage 切布局）。
        // 非全屏 space 调到 4：原 10 让 Slider 行跟按钮行间距过大，Slider 视觉上
        // 偏视频中部（"太靠上"）。紧贴后 Slider 落在按钮行附近，整体控件栏更靠下。
        Column({ space: this.isFullscreen ? 14 : 4 }) {
          Row({ space: 8 }) {
            Text(this.formatTime(this.currentTime))
              .fontColor(Color.White)
              .fontSize(this.isFullscreen ? 14 : 11)
              .width(this.isFullscreen ? 56 : 40)
              .textAlign(TextAlign.Center);
            Slider({
              value: this.currentTime,
              min: 0,
              max: Math.max(1, this.duration),
              step: 1,
            })
              .layoutWeight(1)
              .trackColor('rgba(255,255,255,0.30)')
              .selectedColor(this.theme.colors.primary)
              .blockColor(this.theme.colors.primary)
              .showSteps(false)
              .onChange((value: number, mode: SliderChangeMode) => this.onSliderChange(value, mode));
            Text(this.formatTime(this.duration))
              .fontColor(Color.White)
              .fontSize(this.isFullscreen ? 14 : 11)
              .width(this.isFullscreen ? 56 : 40)
              .textAlign(TextAlign.Center);
          }
          .width('100%');

          Row() {
            Row({ space: this.isFullscreen ? 16 : 12 }) {
              // 上一首
              Column() {
                AppIcon({
                  name: 'skip-back',
                  iconSize: this.isFullscreen ? 30 : 22,
                  color: this.hasPrev ? '#FFFFFF' : 'rgba(255,255,255,0.35)',
                });
              }
              .width(this.isFullscreen ? 56 : 40)
              .height(this.isFullscreen ? 56 : 40)
              .borderRadius(this.isFullscreen ? 28 : 20)
              .backgroundColor('rgba(0,0,0,0.50)')
              .justifyContent(FlexAlign.Center)
              .alignItems(HorizontalAlign.Center)
              .enabled(this.hasPrev)
              .onClick(() => this.handlePrev());

              // 中央播放
              Column() {
                AppIcon({
                  name: this.isPlaying ? 'pause' : 'play',
                  iconSize: this.isFullscreen ? 34 : 26,
                  color: '#FFFFFF',
                });
              }
              .width(this.isFullscreen ? 64 : 48)
              .height(this.isFullscreen ? 64 : 48)
              .borderRadius(this.isFullscreen ? 32 : 24)
              .backgroundColor('rgba(0,0,0,0.50)')
              .justifyContent(FlexAlign.Center)
              .alignItems(HorizontalAlign.Center)
              .onClick(() => this.togglePlay());

              // 下一首
              Column() {
                AppIcon({
                  name: 'skip-forward',
                  iconSize: this.isFullscreen ? 30 : 22,
                  color: this.hasNext ? '#FFFFFF' : 'rgba(255,255,255,0.35)',
                });
              }
              .width(this.isFullscreen ? 56 : 40)
              .height(this.isFullscreen ? 56 : 40)
              .borderRadius(this.isFullscreen ? 28 : 20)
              .backgroundColor('rgba(0,0,0,0.50)')
              .justifyContent(FlexAlign.Center)
              .alignItems(HorizontalAlign.Center)
              .enabled(this.hasNext)
              .onClick(() => this.handleNext());
            };

            Blank();

            // 全屏
            Column() {
              AppIcon({
                name: this.isFullscreen ? 'contract' : 'expand',
                iconSize: this.isFullscreen ? 30 : 22,
                color: '#FFFFFF',
              });
            }
            .width(this.isFullscreen ? 56 : 40)
            .height(this.isFullscreen ? 56 : 40)
            .borderRadius(this.isFullscreen ? 28 : 20)
            .backgroundColor('rgba(0,0,0,0.50)')
            .justifyContent(FlexAlign.Center)
            .alignItems(HorizontalAlign.Center)
            .onClick(() => this.toggleFullscreen());
          }
          .width('100%')
          .justifyContent(FlexAlign.SpaceBetween)
          .alignItems(VerticalAlign.Center);
        }
        .width('100%')
        .padding({
          left: this.isFullscreen ? 24 : 12,
          right: this.isFullscreen ? 24 : 12,
          top: this.isFullscreen ? 18 : 12,
          bottom: this.isFullscreen ? 18 : 8,
        })
        .backgroundColor('rgba(0,0,0,0.50)');
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor(Color.Black);
  }
}
