import router from '@ohos.router';
import { storage } from '../utils/StorageManager';

interface PlayerParams {
  trackId?: string;
  albumId?: string;
}

class TrackInfo {
  id: string | number = '';
  name: string = '';
  artist: string = '';
  album: string = '';
  cover: string = '';
  duration: number = 0;
}

@Entry
@Component
struct PlayerPage {
  @State track: TrackInfo = new TrackInfo();
  @State isPlaying: boolean = false;
  @State progress: number = 0;
  @State isLiked: boolean = false;
  @State playMode: string = 'sequential';

  aboutToAppear() {
    const params = router.getParams() as PlayerParams;
    this.loadTrack(params);
  }

  async loadTrack(params: PlayerParams) {
    // TODO: Load track info from params or storage
    if (params && params.trackId) {
      // Load track by ID
    }
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    // TODO: Actual playback control
  }

  nextTrack() {
    // TODO
  }

  prevTrack() {
    // TODO
  }

  toggleLike() {
    this.isLiked = !this.isLiked;
    // TODO: API call
  }

  togglePlayMode() {
    const modes = ['sequential', 'random', 'single'];
    const currentIndex = modes.indexOf(this.playMode);
    this.playMode = modes[(currentIndex + 1) % modes.length];
  }

  seekProgress(value: number) {
    this.progress = value;
    // TODO: Actual seek
  }

  goBack() {
    router.back();
  }

  formatTime(seconds: number): string {
    if (!seconds || seconds <= 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ':' + (s < 10 ? '0' + s : s);
  }

  build() {
    Column() {
      Row() {
        Button('↓')
          .width(40)
          .height(40)
          .backgroundColor(Color.Transparent)
          .fontSize(24)
          .fontColor('#2c3e50')
          .onClick(() => this.goBack())

        Text('正在播放')
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .fontColor('#2c3e50')
          .layoutWeight(1)
          .textAlign(TextAlign.Center)

        Button('⋯')
          .width(40)
          .height(40)
          .backgroundColor(Color.Transparent)
          .fontSize(20)
          .fontColor('#2c3e50')
      }
      .width('100%')
      .padding({ left: 8, right: 8, top: 16, bottom: 8 })

      // Cover
      Column() {
        Text(this.track.name.substring(0, 1) || '♪')
          .fontSize(60)
          .fontColor('#FFFFFF')
          .fontWeight(FontWeight.Bold)
      }
      .width(280)
      .height(280)
      .borderRadius(20)
      .backgroundColor('#007DFF')
      .justifyContent(FlexAlign.Center)
      .margin({ top: 30, bottom: 30 })

      // Track info
      Text(this.track.name || '未选择曲目')
        .fontSize(20)
        .fontWeight(FontWeight.Bold)
        .fontColor('#2c3e50')
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .padding({ left: 24, right: 24 })

      Text(this.track.artist || '未知艺人')
        .fontSize(14)
        .fontColor('#95a5a6')
        .margin({ top: 8 })
        .maxLines(1)

      // Progress
      Row() {
        Text(this.formatTime(this.progress))
          .fontSize(12)
          .fontColor('#95a5a6')
          .width(40)

        Slider({ value: this.progress, min: 0, max: this.track.duration || 300, step: 1 })
          .layoutWeight(1)
          .margin({ left: 8, right: 8 })
          .onChange((value: number) => this.seekProgress(value))

        Text(this.formatTime(this.track.duration || 300))
          .fontSize(12)
          .fontColor('#95a5a6')
          .width(40)
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 20, bottom: 20 })

      // Controls
      Row() {
        Button(this.playMode === 'random' ? '🔀' : this.playMode === 'single' ? '🔂' : '🔁')
          .width(48)
          .height(48)
          .backgroundColor(Color.Transparent)
          .fontSize(24)
          .onClick(() => this.togglePlayMode())

        Button('⏮')
          .width(48)
          .height(48)
          .backgroundColor(Color.Transparent)
          .fontSize(28)
          .onClick(() => this.prevTrack())

        Button(this.isPlaying ? '⏸' : '▶')
          .width(64)
          .height(64)
          .backgroundColor('#007DFF')
          .borderRadius(32)
          .fontSize(32)
          .fontColor('#FFFFFF')
          .onClick(() => this.togglePlay())

        Button('⏭')
          .width(48)
          .height(48)
          .backgroundColor(Color.Transparent)
          .fontSize(28)
          .onClick(() => this.nextTrack())

        Button(this.isLiked ? '❤️' : '🤍')
          .width(48)
          .height(48)
          .backgroundColor(Color.Transparent)
          .fontSize(24)
          .onClick(() => this.toggleLike())
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 16 })
      .justifyContent(FlexAlign.SpaceAround)

      // Lyrics placeholder
      Column() {
        Text('歌词显示')
          .fontSize(14)
          .fontColor('#95a5a6')
          .margin({ top: 40 })

        Text('功能开发中...')
          .fontSize(12)
          .fontColor('#bdc3c7')
          .margin({ top: 8 })
      }
      .width('100%')
      .layoutWeight(1)
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#ffffff')
  }
}
