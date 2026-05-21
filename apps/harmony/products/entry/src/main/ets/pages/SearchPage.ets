import router from '@ohos.router';
import { storage } from '../utils/StorageManager';
import { httpClient } from '../utils/HttpClient';

class SearchResult {
  id: string | number = '';
  name: string = '';
  artist: string = '';
  cover: string = '';
  type: string = 'track';
}

@Entry
@Component
struct SearchPage {
  @State keyword: string = '';
  @State results: SearchResult[] = [];
  @State loading: boolean = false;
  @State searchType: string = 'all';

  async doSearch() {
    if (this.keyword.length === 0) return;
    this.loading = true;
    try {
      const savedAddress = await storage.getItem('serverAddress');
      const savedToken = savedAddress ? await storage.getItem('token_' + savedAddress) : null;
      if (savedAddress) httpClient.setBaseURL(savedAddress);
      if (savedToken) httpClient.setToken(savedToken);

      const res = await httpClient.get('/api/search?q=' + encodeURIComponent(this.keyword) + '&type=' + this.searchType) as Record<string, Object>;
      if (res['code'] === 200 && res['data']) {
        const dataObj = res['data'] as Record<string, Object>;
        const list = dataObj['list'] as Array<Record<string, Object>> || [];
        const mapped: SearchResult[] = [];
        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          const result = new SearchResult();
          result.id = item['id'] as string | number || '';
          result.name = item['name'] as string || '';
          result.artist = item['artist'] as string || '';
          result.cover = item['cover'] as string || '';
          result.type = item['type'] as string || 'track';
          mapped.push(result);
        }
        this.results = mapped;
      }
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      this.loading = false;
    }
  }

  navigateToAlbum(albumId: string) {
    router.pushUrl({ url: 'pages/AlbumDetailPage', params: { id: albumId } });
  }

  navigateToArtist(artistId: string) {
    router.pushUrl({ url: 'pages/ArtistDetailPage', params: { id: artistId } });
  }

  navigateToTrack(track: SearchResult) {
    // TODO: Play track
  }

  goBack() {
    router.back();
  }

  @Builder
  ResultItemBuilder(item: SearchResult) {
    Row() {
      Column() {
        Text(item.name.substring(0, 1))
          .fontSize(18)
          .fontColor('#FFFFFF')
      }
      .width(50)
      .height(50)
      .borderRadius(8)
      .backgroundColor(item.type === 'artist' ? '#007DFF' : '#52B54B')
      .justifyContent(FlexAlign.Center)
      .margin({ right: 12 })

      Column() {
        Text(item.name)
          .fontSize(15)
          .fontWeight(FontWeight.Medium)
          .fontColor('#2c3e50')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width(200)

        Text(item.artist)
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
    .onClick(() => {
      if (item.type === 'album') {
        this.navigateToAlbum(String(item.id));
      } else if (item.type === 'artist') {
        this.navigateToArtist(String(item.id));
      } else {
        this.navigateToTrack(item);
      }
    })
  }

  build() {
    Column() {
      Row() {
        Button('←')
          .width(40)
          .height(40)
          .backgroundColor(Color.Transparent)
          .fontSize(24)
          .fontColor('#2c3e50')
          .onClick(() => this.goBack())

        TextInput({ placeholder: '搜索...' })
          .width('70%')
          .height(40)
          .backgroundColor('#f0f0f0')
          .borderRadius(20)
          .padding({ left: 16, right: 16 })
          .fontSize(15)
          .onChange((value: string) => {
            this.keyword = value;
          })
          .onSubmit(() => this.doSearch())

        Button('🔍')
          .width(40)
          .height(40)
          .backgroundColor(Color.Transparent)
          .fontSize(18)
          .onClick(() => this.doSearch())
      }
      .width('100%')
      .padding({ left: 8, right: 8, top: 16, bottom: 8 })

      Row() {
        Button('全部')
          .backgroundColor(this.searchType === 'all' ? '#007DFF20' : Color.Transparent)
          .fontColor(this.searchType === 'all' ? '#007DFF' : '#95a5a6')
          .borderRadius(16)
          .height(32)
          .onClick(() => { this.searchType = 'all'; })

        Button('单曲')
          .backgroundColor(this.searchType === 'track' ? '#007DFF20' : Color.Transparent)
          .fontColor(this.searchType === 'track' ? '#007DFF' : '#95a5a6')
          .borderRadius(16)
          .height(32)
          .margin({ left: 8 })
          .onClick(() => { this.searchType = 'track'; })

        Button('专辑')
          .backgroundColor(this.searchType === 'album' ? '#007DFF20' : Color.Transparent)
          .fontColor(this.searchType === 'album' ? '#007DFF' : '#95a5a6')
          .borderRadius(16)
          .height(32)
          .margin({ left: 8 })
          .onClick(() => { this.searchType = 'album'; })

        Button('艺人')
          .backgroundColor(this.searchType === 'artist' ? '#007DFF20' : Color.Transparent)
          .fontColor(this.searchType === 'artist' ? '#007DFF' : '#95a5a6')
          .borderRadius(16)
          .height(32)
          .margin({ left: 8 })
          .onClick(() => { this.searchType = 'artist'; })
      }
      .width('100%')
      .padding({ left: 16, right: 16, bottom: 8 })
      .justifyContent(FlexAlign.Start)

      if (this.loading) {
        Column() {
          Text('搜索中...')
            .fontSize(14)
            .fontColor('#95a5a6')
            .margin({ top: 40 })
        }
        .width('100%')
        .layoutWeight(1)
      } else if (this.results.length > 0) {
        List() {
          ForEach(this.results, (item: SearchResult) => {
            ListItem() {
              this.ResultItemBuilder(item);
            }
          })
        }
        .width('100%')
        .layoutWeight(1)
        .scrollBar(BarState.Off)
        .edgeEffect(EdgeEffect.Spring)
      } else if (this.keyword.length > 0) {
        Column() {
          Text('未找到结果')
            .fontSize(14)
            .fontColor('#95a5a6')
            .margin({ top: 40 })
        }
        .width('100%')
        .layoutWeight(1)
      } else {
        Column() {
          Text('请输入关键词搜索')
            .fontSize(14)
            .fontColor('#95a5a6')
            .margin({ top: 40 })
        }
        .width('100%')
        .layoutWeight(1)
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#ffffff')
  }
}
