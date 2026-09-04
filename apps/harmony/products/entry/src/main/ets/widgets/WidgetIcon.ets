/**
 * 卡片矢量图标（对齐 iOS SF Symbols）。
 *
 * HarmonyOS 卡片没有 iOS SF Symbols 那种按名字引用系统图标的能力，
 * 媒体控制图标（play/pause/prev/next/heart/shuffle/repeat）系统也没内置。
 * 用 Path 绘制矢量图形，视觉对齐 SF Symbols 的粗细和比例。
 *
 * 所有图标基于 24x24 viewBox，通过 width/height 缩放到目标尺寸。
 */

@Builder
export function WidgetIcon(name: string, size: number, color: string) {
  if (name === 'play') {
    // SF Symbols: play.fill
    Path()
      .commands('M8 5.14v13.72c0 .8.87 1.3 1.56.88l10.5-6.86c.62-.4.62-1.36 0-1.76L9.56 4.26C8.87 3.84 8 4.34 8 5.14z')
      .width(size)
      .height(size)
      .fill(color)
      .fillOpacity(1);
  } else if (name === 'pause') {
    // SF Symbols: pause.fill
    Path()
      .commands('M6 4h3.5v16H6zM14.5 4H18v16h-3.5z')
      .width(size)
      .height(size)
      .fill(color)
      .fillOpacity(1);
  } else if (name === 'prev') {
    // SF Symbols: backward.end.fill
    Path()
      .commands('M6 5h2v14H6zM18 5.14v13.72c0 .8-.87 1.3-1.56.88L6.94 12.88c-.62-.4-.62-1.36 0-1.76l9.5-6.86c.69-.42 1.56.08 1.56.88z')
      .width(size)
      .height(size)
      .fill(color)
      .fillOpacity(1);
  } else if (name === 'next') {
    // SF Symbols: forward.end.fill
    Path()
      .commands('M16 5h2v14h-2zM6 5.14v13.72c0 .8.87 1.3 1.56.88l9.5-6.86c.62-.4.62-1.36 0-1.76l-9.5-6.86C6.87 3.84 6 4.34 6 5.14z')
      .width(size)
      .height(size)
      .fill(color)
      .fillOpacity(1);
  } else if (name === 'heart') {
    // SF Symbols: heart (outline)
    Path()
      .commands('M12 21s-7.5-4.9-10-9.5C.5 8 2 4 6 4c2.5 0 4.5 1.5 6 3.5C13.5 5.5 15.5 4 18 4c4 0 5.5 4 4 7.5-2.5 4.6-10 9.5-10 9.5z')
      .width(size)
      .height(size)
      .fill('none')
      .stroke(color)
      .strokeWidth(1.8)
      .fillOpacity(0);
  } else if (name === 'heart.fill') {
    // SF Symbols: heart.fill
    Path()
      .commands('M12 21s-7.5-4.9-10-9.5C.5 8 2 4 6 4c2.5 0 4.5 1.5 6 3.5C13.5 5.5 15.5 4 18 4c4 0 5.5 4 4 7.5-2.5 4.6-10 9.5-10 9.5z')
      .width(size)
      .height(size)
      .fill(color)
      .fillOpacity(1);
  } else if (name === 'shuffle') {
    // SF Symbols: shuffle
    Path()
      .commands('M3 7h3.5c1.5 0 2.8.8 3.5 2l1.5 2.5M3 17h3.5c1.5 0 2.8-.8 3.5-2l4.5-7c.7-1.2 2-2 3.5-2H21M18 4l3 3-3 3M18 14l3 3-3 3')
      .width(size)
      .height(size)
      .fill('none')
      .stroke(color)
      .strokeWidth(1.8)
      .fillOpacity(0);
  } else if (name === 'repeat') {
    // SF Symbols: repeat
    Path()
      .commands('M3 12c0-3.3 2.7-6 6-6h9M18 4l3 2-3 2M21 12c0 3.3-2.7 6-6 6H6M6 16l-3 2 3 2')
      .width(size)
      .height(size)
      .fill('none')
      .stroke(color)
      .strokeWidth(1.8)
      .fillOpacity(0);
  } else if (name === 'repeat.1') {
    // SF Symbols: repeat.1
    Path()
      .commands('M3 12c0-3.3 2.7-6 6-6h9M18 4l3 2-3 2M21 12c0 3.3-2.7 6-6 6H6M6 16l-3 2 3 2')
      .width(size)
      .height(size)
      .fill('none')
      .stroke(color)
      .strokeWidth(1.8)
      .fillOpacity(0);
    Text('1')
      .fontSize(size * 0.4)
      .fontColor(color)
      .fontWeight(FontWeight.Bold)
      .position({ x: size * 0.5 - size * 0.15, y: size * 0.5 - size * 0.2 });
  } else if (name === 'list') {
    // SF Symbols: list.bullet
    Path()
      .commands('M4 6h2M8 6h12M4 12h2M8 12h12M4 18h2M8 18h12')
      .width(size)
      .height(size)
      .fill('none')
      .stroke(color)
      .strokeWidth(1.8)
      .fillOpacity(0);
  } else if (name === 'music') {
    // SF Symbols: music.note
    Path()
      .commands('M9 18V5l10-2v13M9 18c0 1.7-1.3 3-3 3s-3-1.3-3-3 1.3-3 3-3 3 1.3 3 3zM19 16c0 1.7-1.3 3-3 3s-3-1.3-3-3 1.3-3 3-3 3 1.3 3 3z')
      .width(size)
      .height(size)
      .fill('none')
      .stroke(color)
      .strokeWidth(1.8)
      .fillOpacity(0);
  } else if (name === 'crown') {
    // SF Symbols: crown.fill
    Path()
      .commands('M12 3l3 4.5 4-2-1 6H6L5 5.5l4 2L12 3zM6 14h12v4c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1v-4z')
      .width(size)
      .height(size)
      .fill(color)
      .fillOpacity(1);
  } else if (name === 'refresh') {
    // SF Symbols: arrow.clockwise
    Path()
      .commands('M12 4c4.4 0 8 3.6 8 8s-3.6 8-8 8c-3.4 0-6.4-2.1-7.6-5.2M12 4c-4.4 0-8 3.6-8 8m0 0V8m0 4h4')
      .width(size)
      .height(size)
      .fill('none')
      .stroke(color)
      .strokeWidth(1.8)
      .fillOpacity(0);
  } else {
    // fallback: 占位圆点
    Circle({ width: size, height: size })
      .fill(color)
      .fillOpacity(0.3);
  }
}
