import { WidgetBackground } from './WidgetBackground';
import { WidgetCover } from './WidgetCover';
import { LockedCard } from './LockedCard';
import { WidgetIcon } from './WidgetIcon';
import { WIDGET_COLOR, WIDGET_FONT, WIDGET_PADDING, WIDGET_RADIUS } from './WidgetConstants';

/**
 * 正在播放控制卡片（对齐 iOS AudioDockWidget）。
 *
 * 三种尺寸自适应（EntryFormAbility 在 FormBindingData 里加 formDimension 字段）：
 * - 2x2 (158x158)：封面 + 标题 + 单一播放按钮
 * - 4x2 (326x158)：封面左 + 标题/歌手右 + 三键播控
 * - 4x4 (326x326)：封面顶部 + 标题/歌手 + 三键播控 + 模式 + 点赞
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
        } else if (this.formDimension === '4*2') {
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
    Column({ space: 6 }) {
      WidgetCover({ cover: this.cover, preset: 'medium' });

      Text(this.title || '—')
        .fontSize(WIDGET_FONT.titleLarge)
        .fontColor(WIDGET_COLOR.fg)
        .fontWeight(FontWeight.Medium)
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .width('100%');

      // 单个播放按钮
      this.playButton(32, false);
    }
    .width('100%')
    .height('100%')
    .padding(WIDGET_PADDING.cardSmall)
    .alignItems(HorizontalAlign.Start);
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
        this.transportRow(20);
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
      Row({ space: 10 }) {
        WidgetCover({ cover: this.cover, preset: 'large' });
        Column({ space: 4 }) {
          Text(this.title || '—')
            .fontSize(WIDGET_FONT.titleLarge)
            .fontColor(WIDGET_COLOR.fg)
            .fontWeight(FontWeight.Bold)
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .width('100%');
          Text(this.artist || ' ')
            .fontSize(WIDGET_FONT.artistLarge)
            .fontColor(WIDGET_COLOR.fgSecondary)
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .width('100%');
        }
        .layoutWeight(1)
        .height('100%')
        .alignItems(HorizontalAlign.Start)
        .justifyContent(FlexAlign.Start);
      }
      .width('100%');

      this.transportRow(28);

      Row({ space: 16 }) {
        this.modeButton();
        this.likeButton();
      }
      .width('100%')
      .justifyContent(FlexAlign.Center);
    }
    .width('100%')
    .height('100%')
    .padding(WIDGET_PADDING.card)
    .alignItems(HorizontalAlign.Start);
  }

  // ─── 公共控件 ───────────────────────────────────────────────────────────

  @Builder
  transportRow(iconSize: number) {
    Row({ space: 16 }) {
      this.iconButton('prev', 'prev', iconSize);
      this.playButton(iconSize + 8, true);
      this.iconButton('next', 'next', iconSize);
    }
    .width('100%')
    .justifyContent(FlexAlign.Center);
  }

  @Builder
  playButton(size: number, showBg: boolean) {
    Stack({ alignContent: Alignment.Center }) {
      if (showBg) {
        Circle({ width: size + 16, height: size + 16 })
          .fill(WIDGET_COLOR.btnActiveBg);
      }
      WidgetIcon(this.isPlaying ? 'pause' : 'play', size, WIDGET_COLOR.fg);
    }
    .width(size + 16)
    .height(size + 16)
    .onClick((): void => {
      try {
        postCardAction(this, {
          action: 'message',
          params: { message: this.isPlaying ? 'pause' : 'play' },
        });
      } catch (e) { /* swallow */ }
    });
  }

  @Builder
  iconButton(icon: string, method: string, iconSize: number) {
    Stack({ alignContent: Alignment.Center }) {
      WidgetIcon(icon, iconSize, WIDGET_COLOR.fg);
    }
    .width(iconSize + 16)
    .height(iconSize + 16)
    .borderRadius(WIDGET_RADIUS.button)
    .onClick((): void => {
      try {
        postCardAction(this, {
          action: 'message',
          params: { message: method },
        });
      } catch (e) { /* swallow */ }
    });
  }

  @Builder
  modeButton() {
    Stack({ alignContent: Alignment.Center }) {
      WidgetIcon(this.modeIcon(this.playMode), 22, WIDGET_COLOR.fg);
    }
    .width(40)
    .height(40)
    .borderRadius(WIDGET_RADIUS.button)
    .onClick((): void => {
      try {
        postCardAction(this, {
          action: 'message',
          params: { message: 'mode' },
        });
      } catch (e) { /* swallow */ }
    });
  }

  @Builder
  likeButton() {
    Stack({ alignContent: Alignment.Center }) {
      WidgetIcon(this.isLiked ? 'heart.fill' : 'heart', 22, this.isLiked ? '#FF6B6B' : WIDGET_COLOR.fg);
    }
    .width(40)
    .height(40)
    .borderRadius(WIDGET_RADIUS.button)
    .onClick((): void => {
      try {
        postCardAction(this, {
          action: 'message',
          params: { message: this.isLiked ? 'unlike' : 'like' },
        });
      } catch (e) { /* swallow */ }
    });
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
