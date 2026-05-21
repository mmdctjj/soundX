import router from '@ohos.router';
import { storage } from '../utils/StorageManager';
import { httpClient } from '../utils/HttpClient';

interface AlbumDetailParams {
  id: string;
}

class TrackData {
  id: string | number = '';
  name: string = '';
  artist: string = '';
  cover: string = '';
  album: string = '';
  liked: boolean = false;
  duration: number = 0;
}

@Entry
@Component
struct AlbumDetailPage {
  @State albumId: string = '';
  @State albumName: string = '';
  @State albumArtist: string = '';
  @State albumCover: string = '';
  @State albumDescription: string = '';
  @State albumYear: string = '';
  @State tracks: TrackData[] = [];
  @State loading: boolean = true;
  @State isLiked: boolean = false;
  @State sortOrder: string = 'asc';
  @State total: number = 0;

  aboutToAppear() {
    const params = router.getParams() as AlbumDetailParams;
    if (params && params.id) {
      this.albumId = params.id;
      this.loadData();
    }
  }

  async loadData() {
    this.loading = true;
    try {
      const savedAddress = await storage.getItem('serverAddress');
      const savedToken = savedAddress ? await storage.getItem('token_' + savedAddress) : null;
      if (savedAddress) {
        httpClient.setBaseURL(savedAddress);
      }
      if (savedToken) {
        httpClient.setToken(savedToken);
      }

      // Load album info
      const albumRes = await httpClient.get('/api/albums/' + this.albumId) as Record<string, Object>;
      if (albumRes['code'] === 200 && albumRes['data']) {
        const album = albumRes['data'] as Record<string, Object>;
        this.albumName = String(album['name'] || '');
        this.albumArtist = String(album['artist'] || '');
        this.albumCover = String(album['cover'] || '');
        this.albumDescription = String(album['description'] || '');
        this.albumYear = String(album['year'] || '');
        const likedByUsers = album['likedByUsers'] as Array<Record<string, Object>> || [];
        this.isLiked = likedByUsers.length > 0;
      }

      // Load tracks
      const tracksRes = await httpClient.get('/api/albums/' + this.albumId + '/tracks?pageSize=200&loadCount=0&sort=' + this.sortOrder) as Record<string, Object>;
      if (tracksRes['code'] === 200 && tracksRes['data']) {
        const dataObj = tracksRes['data'] as Record<string, Object>;
        this.total = dataObj['total'] as number || 0;
        const list = dataObj['list'] as Array<Record<string, Object>> || [];
        const mapped: TrackData[] = [];
        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          const track = new TrackData();
          track.id = item['id'] as string | number || '';
          track.name = item['name'] as string || '';
          track.artist = item['artist'] as string || '';
          track.cover = item['cover'] as string || '';
          track.album = item['album'] as string || '';
          track.liked = item['liked'] as boolean || false;
          track.duration = item['duration'] as number || 0;
          mapped.push(track);
        }
        this.tracks = mapped;
      }
    } catch (error) {
      console.error('Failed to load album detail:', error);
    } finally {
      this.loading = false;
    }
  }

  async toggleLike() {
    try {
      const endpoint = this.isLiked ? '/api/albums/' + this.albumId + '/unlike' : '/api/albums/' + this.albumId + '/like';
      await httpClient.post(endpoint, new Object() as Record<string, Object>);
      this.isLiked = !this.isLiked;
    } catch (e) {
      console.error('Toggle like failed:', e);
    }
  }

  toggleSort() {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.loading = true;
    this.loadData();
  }

  playTrack(track: TrackData) {
    // TODO: Play track
  }

  goBack() {
    router.back();
  }

  @Builder
  TrackItemBuilder(track: TrackData, index: number) {
    Row() {
      Column() {
        Text(String(index + 1))
          .fontSize(14)
          .fontColor('#95a5a6')
      }
      .width(36)
      .height(36)
      .justifyContent(FlexAlign.Center)
      .margin({ right: 12 })

      Column() {
        Text(track.name)
          .fontSize(15)
          .fontWeight(FontWeight.Medium)
          .fontColor('#2c3e50')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width(200)

        Text(track.artist)
          .fontSize(12)
          .fontColor('#95a5a6')
          .margin({ top: 4 })
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width(200)
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)

      Text(this.formatDuration(track.duration))
        .fontSize(12)
        .fontColor('#95a5a6')
    }
    .width('100%')
    .padding({ top: 10, bottom: 10, left: 16, right: 16 })
    .onClick(() => this.playTrack(track))
  }

  formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ':' + (s < 10 ? '0' + s : s);
  }

  @Builder
  LoadingSkeleton() {
    Column() {
      Row()
        .width(200)
        .height(200)
        .borderRadius(12)
        .backgroundColor('#e8e8e8')
        .margin({ top: 20, bottom: 16 })

      Row()
        .width(180)
        .height(20)
        .borderRadius(10)
        .backgroundColor('#e8e8e8')
        .margin({ bottom: 8 })

      Row()
        .width(120)
        .height(14)
        .borderRadius(7)
        .backgroundColor('#e8e8e8')
        .margin({ bottom: 16 })

      ForEach([1, 2, 3, 4, 5], (index: number) => {
        Row() {
          Row()
            .width(36)
            .height(36)
            .borderRadius(18)
            .backgroundColor('#e8e8e8')
            .margin({ right: 12 })

          Column() {
            Row()
              .width(120)
              .height(16)
              .borderRadius(8)
              .backgroundColor('#e8e8e8')
              .margin({ bottom: 8 })

            Row()
              .width(80)
              .height(12)
              .borderRadius(6)
              .backgroundColor('#e8e8e8')
          }
          .layoutWeight(1)
        }
        .width('100%')
        .padding({ top: 10, bottom: 10, left: 16, right: 16 })
      })
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#ffffff')
  }

  build() {
    if (this.loading) {
      this.LoadingSkeleton();
    } else {
      Column() {
        // Header
        Row() {
          Button('←')
            .width(40)
            .height(40)
            .backgroundColor(Color.Transparent)
            .fontSize(24)
            .fontColor('#2c3e50')
            .onClick(() => this.goBack())

          Text('专辑详情')
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .fontColor('#2c3e50')
            .layoutWeight(1)
            .textAlign(TextAlign.Center)

          Button(this.isLiked ? '❤️' : '🤍')
            .width(40)
            .height(40)
            .backgroundColor(Color.Transparent)
            .fontSize(20)
            .onClick(() => this.toggleLike())
        }
        .width('100%')
        .padding({ left: 8, right: 8, top: 16, bottom: 8 })

        Scroll() {
          Column() {
            // Album cover placeholder
            Column() {
              Text(this.albumName.substring(0, 1))
                .fontSize(48)
                .fontColor('#FFFFFF')
                .fontWeight(FontWeight.Bold)
            }
            .width(200)
            .height(200)
            .borderRadius(12)
            .backgroundColor('#007DFF')
            .justifyContent(FlexAlign.Center)
            .margin({ top: 20, bottom: 16 })

            Text(this.albumName)
              .fontSize(20)
              .fontWeight(FontWeight.Bold)
              .fontColor('#2c3e50')
              .maxLines(2)
              .textAlign(TextAlign.Center)
              .padding({ left: 16, right: 16 })

            Text(this.albumArtist)
              .fontSize(14)
              .fontColor('#95a5a6')
              .margin({ top: 8 })
              .maxLines(1)

            if (this.albumYear.length > 0) {
              Text(this.albumYear)
                .fontSize(12)
                .fontColor('#bdc3c7')
                .margin({ top: 4 })
            }

            Row() {
              Button('▶ 播放全部')
                .width('45%')
                .height(44)
                .backgroundColor('#007DFF')
                .borderRadius(22)
                .fontSize(15)
                .fontWeight(FontWeight.Medium)
                .fontColor('#FFFFFF')

              Button('↕ ' + (this.sortOrder === 'asc' ? '正序' : '倒序'))
                .width('45%')
                .height(44)
                .backgroundColor('#f0f0f0')
                .borderRadius(22)
                .fontSize(15)
                .fontColor('#2c3e50')
                .onClick(() => this.toggleSort())
            }
            .width('100%')
            .padding({ left: 16, right: 16, top: 16, bottom: 8 })
            .justifyContent(FlexAlign.SpaceBetween)

            Text('曲目 (' + this.total + ')')
              .fontSize(16)
              .fontWeight(FontWeight.Bold)
              .fontColor('#2c3e50')
              .padding({ left: 16, right: 16, top: 8, bottom: 8 })
              .width('100%')
              .textAlign(TextAlign.Start)

            Column() {
              ForEach(this.tracks, (track: TrackData, index: number) => {
                this.TrackItemBuilder(track, index);
              })
            }
            .width('100%')
          }
          .width('100%')
        }
        .width('100%')
        .layoutWeight(1)
        .scrollBar(BarState.Off)
        .edgeEffect(EdgeEffect.Spring)
      }
      .width('100%')
      .height('100%')
      .backgroundColor('#ffffff')
    }
  }
}
