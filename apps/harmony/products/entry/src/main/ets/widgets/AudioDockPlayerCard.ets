import { WidgetBackground } from './WidgetBackground';
import { WidgetCover } from './WidgetCover';
import { LockedCard } from './LockedCard';
import { WidgetIcon } from './WidgetIcon';
import { WIDGET_COLOR, WIDGET_FONT, WIDGET_PADDING, WIDGET_RADIUS } from './WidgetConstants';

/**
 * 正在播放控制卡片（对齐 iOS AudioDockWidget）。
 *
 * 三种尺寸自适应（EntryFormAbility 在 FormBindingData 里加 formDimension 字段）：
 * - 2x2：封面 + 标题 + 上一首/播放/下一首（与 iOS small 一致）
 * - 2x4：封面左 + 标题/歌手右 + 三键播控
 * - 4x4：居中封面 + 标题/歌手 + 模式/三键/点赞（与 iOS large 一致）
 *
 * 数据字段直接通过 @LocalStorageProp 读取主 App 推送的 NowPlayingSnapshot。
 */

@Entry
@Component
struct AudioDockPlayerCard {
  @LocalStorageProp('title') title: string = '';
  @LocalStorageProp('artist') artist: string = '';
  @LocalStorageProp('cover') cover: string = '';
  @LocalStorageProp('isPlaying') isPlaying: boolean = false;
  @LocalStorageProp('playMode') playMode: string = 'SEQUENCE';
  @LocalStorageProp('isLiked') isLiked: boolean = false;
  @LocalStorageProp('colorPrimary') colorPrimary: string = '#1a1a2e';
  @LocalStorageProp('colorSecondary') colorSecondary: string = '#16213e';
  @LocalStorageProp('updatedAt') updatedAt: number = 0;
  @LocalStorageProp('formDimension') formDimension: string = '2*2';
  @LocalStorageProp('isLocked') isLocked: boolean = false;

  build() {
    Stack() {
      // VIP 锁定页（优先于其他内容）
      if (this.isLocked) {
        LockedCard();
      } else {
        // 背景
        WidgetBackground({
          cover: this.cover,
          colorPrimary: this.colorPrimary,
          colorSecondary: this.colorSecondary,
        });

        // 内容（按 updatedAt==0 时显示「未在播放」占位）
        if (this.updatedAt === 0) {
          this.placeholderView();
        } else if (this.formDimension === '4*4') {
          this.largeView();
        } else if (this.formDimension === '2*4') {
          this.mediumView();
        } else {
          this.smallView();
        }
      }
    }
    .width('100%')
    .height('100%')
    .onClick((): void => {
      try {
        postCardAction(this, {
          action: 'router',
          abilityName: 'EntryAbility',
          params: { url: 'audiodock://player' },
        });
      } catch (e) { /* swallow */ }
    });
  }

  // ─── 占位视图 ───────────────────────────────────────────────────────────

  @Builder
  placeholderView() {
    Column() {
      WidgetIcon('music', 40, '#80FFFFFF');
      Text('未在播放')
        .fontSize(WIDGET_FONT.titleLarge)
        .fontColor(WIDGET_COLOR.fg)
        .margin({ top: 8 });
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center);
  }

  // ─── 2x2 small ──────────────────────────────────────────────────────────

  @Builder
  smallView() {
    Column({ space: 4 }) {
      WidgetCover({ cover: this.cover, preset: 'medium' });

      Text(this.title || '—')
        .fontSize(WIDGET_FONT.titleLarge)
        .fontColor(WIDGET_COLOR.fg)
        .fontWeight(FontWeight.Medium)
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .textAlign(TextAlign.Center)
        .width('100%');

      this.transportRow(24, 12);
    }
    .width('100%')
    .height('100%')
    .padding(WIDGET_PADDING.cardSmall)
    .alignItems(HorizontalAlign.Center);
  }

  // ─── 4x2 medium ─────────────────────────────────────────────────────────

  @Builder
  mediumView() {
    Row({ space: 12 }) {
      WidgetCover({ cover: this.cover, preset: 'medium' });

      Column({ space: 4 }) {
        Text(this.title || '—')
          .fontSize(WIDGET_FONT.titleLarge)
          .fontColor(WIDGET_COLOR.fg)
          .fontWeight(FontWeight.Medium)
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width('100%');
        Text(this.artist || ' ')
          .fontSize(WIDGET_FONT.artistLarge)
          .fontColor(WIDGET_COLOR.fgSecondary)
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width('100%');
        Blank();
        this.transportRow(34);
      }
      .layoutWeight(1)
      .height('100%')
      .alignItems(HorizontalAlign.Start);
    }
    .width('100%')
    .height('100%')
    .padding(WIDGET_PADDING.card);
  }

  // ─── 4x4 large ──────────────────────────────────────────────────────────

  @Builder
  largeView() {
    Column({ space: 10 }) {
      WidgetCover({ cover: this.cover, preset: 'xlarge' });
      Text(this.title || '—')
        .fontSize(WIDGET_FONT.titleLarge)
        .fontColor(WIDGET_COLOR.fg)
        .fontWeight(FontWeight.Bold)
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .width('100%')
        .textAlign(TextAlign.Center);
      Text(this.artist || ' ')
        .fontSize(WIDGET_FONT.artistLarge)
        .fontColor(WIDGET_COLOR.fgSecondary)
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .width('100%')
        .textAlign(TextAlign.Center);
      Row({ space: 8 }) {
        this.modeButton();
        this.iconButton('prev', 'prev', 34);
        this.playButton(44, false);
        this.iconButton('next', 'next', 34);
        this.likeButton();
      }
      .width('100%')
      .justifyContent(FlexAlign.Center);
    }
    .width('100%')
    .height('100%')
    .padding(WIDGET_PADDING.card)
    .alignItems(HorizontalAlign.Center);
  }

  // ─── 公共控件 ───────────────────────────────────────────────────────────

  @Builder
  transportRow(iconSize: number, hitPad: number = 20) {
    Row({ space: 8 }) {
      this.iconButton('prev', 'prev', iconSize, hitPad);
      this.playButton(iconSize + 8, true, hitPad);
      this.iconButton('next', 'next', iconSize, hitPad);
    }
    .width('100%')
    .justifyContent(FlexAlign.Center);
  }

  @Builder
  playButton(size: number, showBg: boolean, hitPad: number = 20) {
    Stack({ alignContent: Alignment.Center }) {
      if (showBg) {
        Circle({ width: size + hitPad, height: size + hitPad })
          .fill(WIDGET_COLOR.btnActiveBg);
      }
      WidgetIcon(this.isPlaying ? 'pause' : 'play', size, WIDGET_COLOR.fg);
    }
    .width(size + hitPad)
    .height(size + hitPad)
    .onClick((): void => {
      this.sendCommand(this.isPlaying ? 'pause' : 'play');
    });
  }

  @Builder
  iconButton(icon: string, method: string, iconSize: number, hitPad: number = 20) {
    Stack({ alignContent: Alignment.Center }) {
      WidgetIcon(icon, iconSize, WIDGET_COLOR.fg);
    }
    .width(iconSize + hitPad)
    .height(iconSize + hitPad)
    .borderRadius(WIDGET_RADIUS.button)
    .onClick((): void => {
      this.sendCommand(method);
    });
  }

  @Builder
  modeButton() {
    Stack({ alignContent: Alignment.Center }) {
      WidgetIcon(this.modeIcon(this.playMode), 32, WIDGET_COLOR.fg);
    }
    .width(56)
    .height(56)
    .borderRadius(WIDGET_RADIUS.button)
    .onClick((): void => {
      this.sendCommand('mode');
    });
  }

  @Builder
  likeButton() {
    Stack({ alignContent: Alignment.Center }) {
      WidgetIcon(this.isLiked ? 'heart.fill' : 'heart', 32, this.isLiked ? '#FF6B6B' : WIDGET_COLOR.fg);
    }
    .width(56)
    .height(56)
    .borderRadius(WIDGET_RADIUS.button)
    .onClick((): void => {
      this.sendCommand(this.isLiked ? 'unlike' : 'like');
    });
  }

  /**
   * 播控指令统一直达主 App（对齐官方 CardInfoRefresh 示例的 call 事件）。
   *
   * 为什么不用 message 事件：message 会落到 EntryFormAbility（FormExtensionAbility
   * 进程），那里没有正在播放的 playerStore 单例，指令执行无效或启动第二个播放实例。
   * call 事件由系统直接拉起 EntryAbility 并回调 this.callee.on('widgetCommand')，
   * 指令作用在主 App 的 playerStore 上，执行完后由 PlayerStore.notify →
   * WidgetBridge.scheduleSyncNowPlaying 自动把最新状态回推到本卡片。
   */
  private sendCommand(method: string): void {
    try {
      const params: Record<string, string> = {};
      params['method'] = 'widgetCommand';
      params['widgetAction'] = method;
      postCardAction(this, {
        action: 'call',
        abilityName: 'EntryAbility',
        params,
      });
    } catch (e) { /* swallow */ }
  }

  private modeIcon(mode: string): string {
    switch (mode) {
      case 'SHUFFLE': return 'shuffle';
      case 'LOOP_LIST': return 'repeat';
      case 'LOOP_SINGLE': return 'repeat.1';
      default: return 'list';
    }
  }
}
