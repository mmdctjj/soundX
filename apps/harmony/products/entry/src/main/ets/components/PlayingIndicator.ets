/**
 * 播放中均衡器动画指示器，1:1 对齐 mobile src/components/PlayingIndicator.tsx：
 * 三根宽 2、圆角 1 的竖条，高度在 3.6~12vp 之间循环（500ms 升、500ms 降，线性往复），
 * 三根分别以 0/200/400ms 的相位延迟错峰启动；容器高 12vp、底对齐、间距 2vp。
 * 仅在当前曲目正在播放时显示（与 mobile 的 isActive && isPlaying 规则一致）。
 */

@Component
struct IndicatorBar {
  @Prop barDelay: number = 0;
  @Prop color: ResourceColor = '#FF000000';
  @State barHeight: number = 3.6;

  build() {
    Column()
      .width(2)
      .height(this.barHeight)
      .borderRadius(1)
      .backgroundColor(this.color)
      .animation({
        duration: 500,
        delay: this.barDelay,
        curve: Curve.Linear,
        iterations: -1,
        playMode: PlayMode.Alternate,
      })
      .onAppear(() => {
        this.barHeight = 12;
      })
  }
}

@Component
export struct PlayingIndicator {
  @Prop color: ResourceColor = '#FF000000';

  build() {
    Row({ space: 2 }) {
      IndicatorBar({ barDelay: 0, color: this.color })
      IndicatorBar({ barDelay: 200, color: this.color })
      IndicatorBar({ barDelay: 400, color: this.color })
    }
    .height(12)
    .alignItems(VerticalAlign.Bottom)
    .justifyContent(FlexAlign.Center)
    .padding({ left: 2, right: 2 })
  }
}
