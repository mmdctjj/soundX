import router from '@ohos.router';
import { storage } from '../utils/StorageManager';
import { httpClient } from '../utils/HttpClient';

interface ArtistDetailParams {
  id: string;
}

class AlbumData {
  id: string | number = '';
  name: string = '';
  cover: string = '';
  artist: string = '';
}

class TrackData {
  id: string | number = '';
  name: string = '';
  artist: string = '';
  cover: string = '';
  album: string = '';
  liked: boolean = false;
}

@Entry
@Component
struct ArtistDetailPage {
  @State artistId: string = '';
  @State artistName: string = '';
  @State artistAvatar: string = '';
  @State artistBio: string = '';
  @State albums: AlbumData[] = [];
  @State tracks: TrackData[] = [];
  @State activeTab: string = 'tracks';
  @State loading: boolean = true;

  aboutToAppear() {
    const params = router.getParams() as ArtistDetailParams;
    if (params && params.id) {
      this.artistId = params.id;
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

      const artistRes = await httpClient.get('/api/artists/' + this.artistId) as Record<string, Object>;
      if (artistRes['code'] === 200 && artistRes['data']) {
        const artist = artistRes['data'] as Record<string, Object>;
        this.artistName = String(artist['name'] || '');
        this.artistAvatar = String(artist['avatar'] || '');
        this.artistBio = String(artist['bio'] || '');
      }

      const tracksRes = await httpClient.get('/api/artists/' + this.artistId + '/tracks?pageSize=50&loadCount=0') as Record<string, Object>;
      if (tracksRes['code'] === 200 && tracksRes['data']) {
        const dataObj = tracksRes['data'] as Record<string, Object>;
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
          mapped.push(track);
        }
        this.tracks = mapped;
      }

      const albumsRes = await httpClient.get('/api/artists/' + this.artistId + '/albums?pageSize=50&loadCount=0') as Record<string, Object>;
      if (albumsRes['code'] === 200 && albumsRes['data']) {
        const dataObj = albumsRes['data'] as Record<string, Object>;
        const list = dataObj['list'] as Array<Record<string, Object>> || [];
        const mapped: AlbumData[] = [];
        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          const album = new AlbumData();
          album.id = item['id'] as string | number || '';
          album.name = item['name'] as string || '';
          album.cover = item['cover'] as string || '';
          album.artist = item['artist'] as string || '';
          mapped.push(album);
        }
        this.albums = mapped;
      }
    } catch (error) {
      console.error('Failed to load artist detail:', error);
    } finally {
      this.loading = false;
    }
  }

  switchTab(tab: string) {
    this.activeTab = tab;
  }

  playTrack(track: TrackData) {
    // TODO
  }

  navigateToAlbum(albumId: string) {
    // TODO
  }

  goBack() {
    router.back();
  }

  @Builder
  TabBarBuilder() {
    Row() {
      Button('单曲')
        .backgroundColor(this.activeTab === 'tracks' ? '#007DFF20' : Color.Transparent)
        .fontColor(this.activeTab === 'tracks' ? '#007DFF' : '#95a5a6')
        .borderRadius(16)
        .height(32)
        .onClick(() => this.switchTab('tracks'))

      Button('专辑')
        .backgroundColor(this.activeTab === 'albums' ? '#007DFF20' : Color.Transparent)
        .fontColor(this.activeTab === 'albums' ? '#007DFF' : '#95a5a6')
        .borderRadius(16)
        .height(32)
        .margin({ left: 8 })
        .onClick(() => this.switchTab('albums'))
    }
    .width('100%')
    .padding({ left: 16, right: 16, bottom: 8 })
    .justifyContent(FlexAlign.Start)
  }

  @Builder
  TrackItemBuilder(track: TrackData) {
    Row() {
      Column() {
        Text(track.name.substring(0, 1))
          .fontSize(14)
          .fontColor('#FFFFFF')
      }
      .width(40)
      .height(40)
      .borderRadius(20)
      .backgroundColor('#52B54B')
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

        Text(track.album || track.artist)
          .fontSize(12)
          .fontColor('#95a5a6')
          .margin({ top: 4 })
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width(200)
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)
    }
    .width('100%')
    .padding({ top: 10, bottom: 10, left: 16, right: 16 })
    .onClick(() => this.playTrack(track))
  }

  @Builder
  AlbumItemBuilder(album: AlbumData) {
    Column() {
      Column() {
        Text(album.name.substring(0, 1))
          .fontSize(28)
          .fontColor('#FFFFFF')
          .fontWeight(FontWeight.Bold)
      }
      .width('100%')
      .aspectRatio(1)
      .borderRadius(8)
      .backgroundColor('#007DFF')
      .justifyContent(FlexAlign.Center)
      .margin({ bottom: 8 })

      Text(album.name)
        .fontSize(13)
        .fontWeight(FontWeight.Medium)
        .fontColor('#2c3e50')
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .width('100%')
        .textAlign(TextAlign.Center)
    }
    .width('100%')
    .padding(8)
    .onClick(() => this.navigateToAlbum(String(album.id)))
  }

  @Builder
  LoadingSkeleton() {
    Column() {
      Row()
        .width(100)
        .height(100)
        .borderRadius(50)
        .backgroundColor('#e8e8e8')
        .margin({ top: 20, bottom: 16 })

      Row()
        .width(150)
        .height(20)
        .borderRadius(10)
        .backgroundColor('#e8e8e8')
        .margin({ bottom: 8 })

      ForEach([1, 2, 3, 4, 5], (index: number) => {
        Row() {
          Row()
            .width(40)
            .height(40)
            .borderRadius(20)
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
        Row() {
          Button('←')
            .width(40)
            .height(40)
            .backgroundColor(Color.Transparent)
            .fontSize(24)
            .fontColor('#2c3e50')
            .onClick(() => this.goBack())

          Text('艺人详情')
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .fontColor('#2c3e50')
            .layoutWeight(1)
            .textAlign(TextAlign.Center)
        }
        .width('100%')
        .padding({ left: 8, right: 8, top: 16, bottom: 8 })

        Scroll() {
          Column() {
            Column() {
              Text(this.artistName.substring(0, 1))
                .fontSize(40)
                .fontColor('#FFFFFF')
                .fontWeight(FontWeight.Bold)
            }
            .width(100)
            .height(100)
            .borderRadius(50)
            .backgroundColor('#007DFF')
            .justifyContent(FlexAlign.Center)
            .margin({ top: 20, bottom: 16 })

            Text(this.artistName)
              .fontSize(22)
              .fontWeight(FontWeight.Bold)
              .fontColor('#2c3e50')
              .maxLines(2)
              .textAlign(TextAlign.Center)
              .padding({ left: 16, right: 16 })

            if (this.artistBio.length > 0) {
              Text(this.artistBio)
                .fontSize(13)
                .fontColor('#95a5a6')
                .margin({ top: 8, left: 16, right: 16 })
                .maxLines(3)
                .textOverflow({ overflow: TextOverflow.Ellipsis })
            }

            this.TabBarBuilder()

            if (this.activeTab === 'tracks') {
              Column() {
                ForEach(this.tracks, (track: TrackData) => {
                  this.TrackItemBuilder(track);
                })
              }
              .width('100%')
            } else {
              Grid() {
                ForEach(this.albums, (album: AlbumData) => {
                  GridItem() {
                    this.AlbumItemBuilder(album);
                  }
                })
              }
              .columnsTemplate('1fr 1fr 1fr')
              .columnsGap(8)
              .rowsGap(8)
              .padding(16)
              .width('100%')
            }
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
