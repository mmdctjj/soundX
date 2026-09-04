import { WidgetBackground } from './WidgetBackground';
import { WidgetCover } from './WidgetCover';
import { LockedCard } from './LockedCard';
import { WidgetIcon } from './WidgetIcon';
import { WIDGET_COLOR, WIDGET_FONT, WIDGET_PADDING } from './WidgetConstants';

/**
 * 上新单曲卡片（对齐 iOS AudioDockLatestWidget）。
 *
 * 4x4 L 尺寸：标题「上新单曲」+ 右上播放/暂停 + 刷新按钮 + 5 条新歌
 * 每行：封面 40x40 圆角 8 + 标题/歌手 + 行内播放
 *
 * 背景：首张新歌封面 + 模糊（对齐 iOS），无封面时回落到深紫蓝渐变。
 */

@Entry
@Component
struct LatestCard {
  @LocalStorageProp('items') items: object = [];
  @LocalStorageProp('updatedAt') updatedAt: number = 0;
  @LocalStorageProp('isPlaying') isPlaying: boolean = false;
  @LocalStorageProp('isLocked') isLocked: boolean = false;

  build() {
    if (this.isLocked) {
      LockedCard();
    } else {
      Stack() {
        // 封面磨砂玻璃背景（对齐 iOS `WidgetBackground`）
        WidgetBackground({
          cover: this.firstCover(),
          colorPrimary: '#3a3a5e',
          colorSecondary: '#222246',
        });

        Column({ space: 8 }) {
          // 标题行
          Row({ space: 8 }) {
            Text('上新单曲')
              .fontSize(WIDGET_FONT.titleLarge)
              .fontWeight(FontWeight.Bold)
              .fontColor(WIDGET_COLOR.fg);
            Blank();
            this.headerPlayButton();
            this.refreshButton();
          }
          .width('100%');

          // 列表
          Column({ space: 4 }) {
            ForEach(this.toItemArray(), (item: LatestRowData, index: number): void => {
              this.rowView(item, index);
            }, (item: LatestRowData, index: number): string => `${index}-${item.id}`);
          }
          .layoutWeight(1)
          .width('100%');
        }
        .width('100%')
        .height('100%')
        .padding(WIDGET_PADDING.card)
        .alignItems(HorizontalAlign.Start);
      }
      .width('100%')
      .height('100%')
      .borderRadius(16);
    }
  }

  private firstCover(): string {
    const arr = this.toItemArray();
    if (arr.length === 0) return '';
    return arr[0].cover;
  }

  @Builder
  headerPlayButton() {
    Stack({ alignContent: Alignment.Center }) {
      Circle({ width: 28, height: 28 })
        .fill('#26FFFFFF');
      WidgetIcon(this.isPlaying ? 'pause' : 'play', 12, WIDGET_COLOR.fg);
    }
    .width(28)
    .height(28)
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
  refreshButton() {
    Stack({ alignContent: Alignment.Center }) {
      Circle({ width: 28, height: 28 })
        .fill('#1AFFFFFF');
      WidgetIcon('refresh', 14, WIDGET_COLOR.fg);
    }
    .width(28)
    .height(28)
    .onClick((): void => {
      try {
        postCardAction(this, {
          action: 'message',
          params: { message: 'refresh_latest' },
        });
      } catch (e) { /* swallow */ }
    });
  }

  @Builder
  rowView(item: LatestRowData, _index: number) {
    Row({ space: 8 }) {
      WidgetCover({ cover: item.cover, preset: 'small' });
      Column({ space: 2 }) {
        Text(item.title || '—')
          .fontSize(WIDGET_FONT.titleList)
          .fontWeight(FontWeight.Medium)
          .fontColor(WIDGET_COLOR.fg)
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis });
        Text(item.artist || ' ')
          .fontSize(WIDGET_FONT.artistList)
          .fontColor(WIDGET_COLOR.fgSecondary)
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis });
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start);

      Stack({ alignContent: Alignment.Center }) {
        Circle({ width: 22, height: 22 })
          .fill('#1AFFFFFF');
        WidgetIcon('play', 10, WIDGET_COLOR.fg);
      }
      .width(22)
      .height(22)
      .onClick((): void => {
        try {
          postCardAction(this, {
            action: 'message',
            params: { message: 'play_latest:' + item.id },
          });
        } catch (e) { /* swallow */ }
      });
    }
    .width('100%')
    .height(42);
  }

  private toItemArray(): LatestRowData[] {
    const raw = this.items;
    if (!Array.isArray(raw)) return [];
    const out: LatestRowData[] = [];
    for (let i = 0; i < raw.length; i++) {
      const it = raw[i] as Record<string, string>;
      if (!it || typeof it !== 'object') continue;
      out.push({
        id: String(it['id'] ?? ''),
        title: String(it['title'] ?? ''),
        artist: String(it['artist'] ?? ''),
        cover: String(it['cover'] ?? ''),
      });
    }
    return out;
  }
}

interface LatestRowData {
  id: string;
  title: string;
  artist: string;
  cover: string;
}
