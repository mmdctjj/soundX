import router from '@ohos.router';
import { httpClient } from '../utils/HttpClient';
import { storage } from '../utils/StorageManager';
import {
  getLatestArtists,
  getRecentAlbums,
  getRecommendedAlbums,
  getLatestTracks,
  getAlbumHistory,
  toggleTrackLike,
  toggleTrackUnLike,
  Artist,
  Album,
  Track,
  LikeUser,
  TrackImpl
} from '../utils/ApiService';

class Section {
  id: string = '';
  title: string = '';
  type: string = '';
  data: Artist[] | Album[] | Track[] = [];

  constructor(id: string, title: string, type: string, data: Artist[] | Album[] | Track[]) {
    this.id = id;
    this.title = title;
    this.type = type;
    this.data = data;
  }
}

@Component
struct HomeTab {
  @State sections: Section[] = [];
  @State loading: boolean = true;
  @State mode: string = 'MUSIC';
  @State isRadioMode: boolean = false;
  @State userId: string = '';

  aboutToAppear() {
    this.initData();
  }

  async initData() {
    try {
      const savedAddress = await storage.getItem('serverAddress');
      const savedToken = savedAddress ? await storage.getItem('token_' + savedAddress) : null;
      const savedUser = await storage.getItem('currentUser');

      if (savedAddress) {
        httpClient.setBaseURL(savedAddress);
      }
      if (savedToken) {
        httpClient.setToken(savedToken);
      }
      if (savedUser) {
        const user = JSON.parse(savedUser) as Record<string, Object>;
        this.userId = String(user['id'] || '');
      }

      const savedMode = await storage.getItem('playMode');
      if (savedMode) {
        this.mode = savedMode;
      }
    } catch (e) {
      console.error('Failed to init data:', e);
    }

    this.loadData();
  }

  async loadData() {
    this.loading = true;

    try {
      const pageSize = 8;
      const promises: Promise<Object>[] = [
        getLatestArtists(this.mode, true, pageSize),
        getRecentAlbums(this.mode, true, pageSize),
        getRecommendedAlbums(this.mode, true, pageSize)
      ];

      if (this.mode === 'MUSIC') {
        promises.push(getLatestTracks('MUSIC', true, pageSize));
      }

      if (this.mode === 'AUDIOBOOK' && this.userId.length > 0) {
        promises.push(getAlbumHistory(this.userId, 0, pageSize, 'AUDIOBOOK'));
      }

      const results = await Promise.all(promises);

      const artistsRes = results[0] as Record<string, Object>;
      const recentRes = results[1] as Record<string, Object>;
      const recommendedRes = results[2] as Record<string, Object>;
      const tracksRes = this.mode === 'MUSIC' ? results[3] as Record<string, Object> : null;
      const historyRes = this.mode === 'AUDIOBOOK' && this.userId.length > 0 ? results[3] as Record<string, Object> : null;

      const sections: Section[] = [];

      if (artistsRes['code'] === 200 && artistsRes['data']) {
        sections.push(new Section('artists', '最新艺人', 'artist', artistsRes['data'] as Artist[]));
      }

      if (recentRes['code'] === 200 && recentRes['data']) {
        sections.push(new Section('recent', '最新专辑', 'album', recentRes['data'] as Album[]));
      }

      if (recommendedRes['code'] === 200 && recommendedRes['data']) {
        sections.push(new Section('recommended', '推荐专辑', 'album', recommendedRes['data'] as Album[]));
      }

      if (this.mode === 'MUSIC' && tracksRes && tracksRes['code'] === 200 && tracksRes['data']) {
        sections.push(new Section('tracks', '最新曲目', 'track', tracksRes['data'] as Track[]));
      }

      if (this.mode === 'AUDIOBOOK' && historyRes && historyRes['code'] === 200) {
        const historyDataObj = historyRes['data'] as Record<string, Object>;
        const list = historyDataObj['list'] as Array<Record<string, Object>>;
        if (list && list.length > 0) {
          const historyAlbums: Album[] = [];
          for (let i = 0; i < list.length; i++) {
            const item = list[i];
            const album = item['album'] as Album;
            historyAlbums.push(album);
          }
          sections.push(new Section('history', '继续听', 'album', historyAlbums));
        }
      }

      this.sections = sections;
    } catch (error) {
      console.error('Failed to load home data:', error);
    } finally {
      this.loading = false;
    }
  }

  toggleMode() {
    this.mode = this.mode === 'MUSIC' ? 'AUDIOBOOK' : 'MUSIC';
    storage.setItem('playMode', this.mode);
    this.loading = true;
    this.loadData();
  }

  toggleRadioMode() {
    this.isRadioMode = !this.isRadioMode;
  }

  async toggleLike(trackId: number | string) {
    if (!this.userId || this.userId.length === 0) {
      return;
    }

    for (let i = 0; i < this.sections.length; i++) {
      const section = this.sections[i];
      if (section.type === 'track') {
        const tracks = section.data as Track[];
        for (let j = 0; j < tracks.length; j++) {
          const track = tracks[j];
          if (track.id === trackId) {
            let isLiked = false;
            if (track.likedByUsers && track.likedByUsers.length > 0) {
              for (let k = 0; k < track.likedByUsers.length; k++) {
                if (String(track.likedByUsers[k].userId) === this.userId) {
                  isLiked = true;
                  break;
                }
              }
            }
            try {
              if (isLiked) {
                await toggleTrackUnLike(trackId, this.userId);
              } else {
                await toggleTrackLike(trackId, this.userId);
              }
              this.updateTrackLikeStatus(trackId, !isLiked);
            } catch (e) {
              console.error('Failed to toggle like:', e);
            }
            return;
          }
        }
      }
    }
  }

  updateTrackLikeStatus(trackId: number | string, liked: boolean) {
    const newSections: Section[] = [];
    for (let i = 0; i < this.sections.length; i++) {
      const section = this.sections[i];
      if (section.type === 'track') {
        const newData: Track[] = [];
        for (let j = 0; j < section.data.length; j++) {
          const t = section.data[j] as Track;
          if (t.id === trackId) {
            let newLikedByUsers: Array<LikeUser>;
            const likedUser: LikeUser = { userId: this.userId };
            if (liked) {
              newLikedByUsers = [...(t.likedByUsers || []), likedUser];
            } else {
              newLikedByUsers = [];
              const users = t.likedByUsers || [];
              for (let k = 0; k < users.length; k++) {
                if (String(users[k].userId) !== this.userId) {
                  newLikedByUsers.push(users[k]);
                }
              }
            }
            const newTrack = new TrackImpl();
            newTrack.id = t.id;
            newTrack.name = t.name;
            newTrack.artist = t.artist;
            newTrack.cover = t.cover;
            newTrack.album = t.album;
            newTrack.liked = liked;
            newTrack.likedByUsers = newLikedByUsers;
            newData.push(newTrack);
          } else {
            newData.push(t);
          }
        }
        newSections.push(new Section(section.id, section.title, section.type, newData));
      } else {
        newSections.push(new Section(section.id, section.title, section.type, section.data));
      }
    }
    this.sections = newSections;
  }

  isTrackLiked(track: Track): boolean {
    if (!track.likedByUsers || track.likedByUsers.length === 0) {
      return false;
    }
    for (let i = 0; i < track.likedByUsers.length; i++) {
      if (String(track.likedByUsers[i].userId) === this.userId) {
        return true;
      }
    }
    return false;
  }

  navigateToSearch() {
    // TODO: Implement search page
  }

  navigateToArtist(artistId: number | string) {
    // TODO: Implement artist detail page
  }

  navigateToAlbum(albumId: number | string) {
    // TODO: Implement album detail page
  }

  playTrack(track: Track) {
    // TODO: Implement player
  }

  @Builder
  ArtistCard(artist: Artist) {
    Column() {
      Column() {
        Text(artist.name.substring(0, 1))
          .fontSize(30)
          .fontColor('#FFFFFF')
          .fontWeight(FontWeight.Bold)
      }
      .width(80)
      .height(80)
      .borderRadius(40)
      .backgroundColor('#007DFF')
      .justifyContent(FlexAlign.Center)

      Text(artist.name)
        .fontSize(13)
        .fontColor('#2c3e50')
        .margin({ top: 8 })
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .textAlign(TextAlign.Center)
        .width(80)
    }
    .margin({ right: 16 })
    .onClick(() => this.navigateToArtist(artist.id))
  }

  @Builder
  AlbumCard(album: Album, showProgress: boolean) {
    Column() {
      Column() {
        Text(album.name.substring(0, 1))
          .fontSize(40)
          .fontColor('#FFFFFF')
          .fontWeight(FontWeight.Bold)
      }
      .width(120)
      .height(120)
      .borderRadius(10)
      .backgroundColor('#5B8FF9')
      .justifyContent(FlexAlign.Center)

      if (showProgress && album.progress !== undefined && album.progress > 0) {
        Stack() {
          Row()
            .width('100%')
            .height(3)
            .backgroundColor('rgba(255,255,255,0.3)')
            .borderRadius(1.5)

          Row()
            .width(album.progress + '%')
            .height(3)
            .backgroundColor('#007DFF')
            .borderRadius(1.5)
        }
        .width(120)
        .margin({ top: -8, bottom: 8 })
      }

      Text(album.name)
        .fontSize(14)
        .fontWeight(FontWeight.Medium)
        .fontColor('#2c3e50')
        .margin({ top: showProgress ? 0 : 8, bottom: 4 })
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .width(120)

      Text(album.artist)
        .fontSize(12)
        .fontColor('#95a5a6')
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .width(120)
    }
    .margin({ right: 16 })
    .onClick(() => this.navigateToAlbum(album.id))
  }

  @Builder
  TrackCard(track: Track) {
    Row() {
      Column() {
        Text(track.name.substring(0, 1))
          .fontSize(20)
          .fontColor('#FFFFFF')
          .fontWeight(FontWeight.Bold)
      }
      .width(50)
      .height(50)
      .borderRadius(4)
      .backgroundColor('#52B54B')
      .justifyContent(FlexAlign.Center)

      Column() {
        Text(track.name)
          .fontSize(14)
          .fontWeight(FontWeight.Medium)
          .fontColor('#2c3e50')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width(100)

        Text(track.artist)
          .fontSize(12)
          .fontColor('#95a5a6')
          .margin({ top: 4 })
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width(100)
      }
      .layoutWeight(1)
      .margin({ left: 12 })
      .alignItems(HorizontalAlign.Start)

      Row() {
        Button() {
          Text(this.isTrackLiked(track) ? '❤' : '🤍')
            .fontSize(16)
        }
        .backgroundColor(Color.Transparent)
        .width(32)
        .height(32)
        .onClick(() => this.toggleLike(track.id))

        Button() {
          Text('➕')
            .fontSize(16)
        }
        .backgroundColor(Color.Transparent)
        .width(32)
        .height(32)
      }
    }
    .width(260)
    .padding(10)
    .backgroundColor('#f8f9fa')
    .borderRadius(8)
    .margin({ right: 12, bottom: 10 })
    .onClick(() => this.playTrack(track))
  }

  @Builder
  SectionHeader(title: string, sectionId: string) {
    Row() {
      Text(title)
        .fontSize(18)
        .fontWeight(FontWeight.Bold)
        .fontColor('#2c3e50')
        .layoutWeight(1)

      Row() {
        if (sectionId === 'tracks') {
          Button() {
            Text('▶')
              .fontSize(14)
              .fontColor('#FFFFFF')
          }
          .width(28)
          .height(28)
          .backgroundColor('#007DFF')
          .borderRadius(14)
          .margin({ right: 8 })
        }

        Button() {
          Text('↻')
            .fontSize(16)
        }
        .backgroundColor(Color.Transparent)
        .width(32)
        .height(32)
        .onClick(() => {
          this.loadData();
        })
      }
    }
    .width('100%')
    .padding({ left: 16, right: 16, top: 20, bottom: 12 })
    .justifyContent(FlexAlign.SpaceBetween)
  }

  build() {
    if (this.loading) {
      this.LoadingSkeleton();
    } else {
      Column() {
        Row() {
          Text('AudioDock')
            .fontSize(24)
            .fontWeight(FontWeight.Bold)
            .fontColor('#2c3e50')

          Row() {
            if (this.mode === 'MUSIC') {
              Button() {
                Text(this.isRadioMode ? '📻' : '⭕')
                  .fontSize(18)
              }
              .width(36)
              .height(36)
              .backgroundColor(this.isRadioMode ? '#007DFF20' : '#f0f0f0')
              .borderRadius(18)
              .margin({ right: 8 })
              .borderWidth(this.isRadioMode ? 1 : 0)
              .borderColor('#007DFF40')
              .onClick(() => this.toggleRadioMode())
            }

            Button() {
              Text(this.mode === 'MUSIC' ? '🎵' : '🎧')
                .fontSize(18)
            }
            .width(36)
            .height(36)
            .backgroundColor('#f0f0f0')
            .borderRadius(18)
            .onClick(() => this.toggleMode())
          }
        }
        .width('100%')
        .padding({ left: 16, right: 16, top: 16, bottom: 8 })
        .justifyContent(FlexAlign.SpaceBetween)

        Row() {
          Text('🔍 搜索音乐、专辑、艺人...')
            .fontSize(14)
            .fontColor('#95a5a6')
        }
        .width('100%')
        .height(44)
        .padding({ left: 16, right: 16 })
        .margin({ left: 16, right: 16 })
        .backgroundColor('#f8f9fa')
        .borderRadius(10)
        .onClick(() => this.navigateToSearch())

        List() {
          ForEach(this.sections, (section: Section) => {
            ListItem() {
              Column() {
                this.SectionHeader(section.title, section.id)

                Scroll() {
                  Row() {
                    if (section.type === 'artist') {
                      ForEach(section.data as Artist[], (item: Artist) => {
                        this.ArtistCard(item);
                      })
                    } else if (section.type === 'album') {
                      ForEach(section.data as Album[], (item: Album) => {
                        this.AlbumCard(item, section.id === 'history');
                      })
                    } else if (section.type === 'track') {
                      Row() {
                        ForEach(this.chunkTracks(section.data as Track[]), (chunk: Track[]) => {
                          Column() {
                            ForEach(chunk, (track: Track) => {
                              this.TrackCard(track);
                            })
                          }
                        })
                      }
                    }
                  }
                  .padding({ left: 16, right: 16 })
                }
                .scrollBar(BarState.Off)
                .scrollable(ScrollDirection.Horizontal)
              }
              .width('100%')
              .alignItems(HorizontalAlign.Start)
            }
          })

          ListItem() {
            Row() {
              Text('⚙️')
                .fontSize(16)
                .margin({ right: 8 })

              Text('调整板块顺序')
                .fontSize(14)
                .fontColor('#007DFF')
            }
            .width('100%')
            .padding(20)
            .justifyContent(FlexAlign.Center)
          }
        }
        .width('100%')
        .layoutWeight(1)
        .scrollBar(BarState.Off)
        .edgeEffect(EdgeEffect.Spring)
        .onScrollIndex((first: number) => {
          // Scroll event
        })
      }
      .width('100%')
      .height('100%')
      .backgroundColor('#ffffff')
    }
  }

  chunkTracks(tracks: Track[]): Track[][] {
    const result: Track[][] = [];
    for (let i = 0; i < tracks.length; i += 2) {
      const chunk: Track[] = [];
      chunk.push(tracks[i]);
      if (i + 1 < tracks.length) {
        chunk.push(tracks[i + 1]);
      }
      result.push(chunk);
    }
    return result;
  }

  @Builder
  LoadingSkeleton() {
    Column() {
      Row() {
        Row()
          .width(100)
          .height(28)
          .borderRadius(8)
          .backgroundColor('#e8e8e8')

        Row()
          .width(80)
          .height(36)
          .borderRadius(18)
          .backgroundColor('#e8e8e8')
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 20 })
      .justifyContent(FlexAlign.SpaceBetween)

      Row()
        .width('90%')
        .height(44)
        .borderRadius(10)
        .backgroundColor('#e8e8e8')
        .margin({ left: 16, right: 16, top: 16 })

      ForEach([1, 2, 3], (index: number) => {
        Column() {
          Row()
            .width(120)
            .height(24)
            .borderRadius(8)
            .backgroundColor('#e8e8e8')
            .margin({ left: 16, bottom: 12 })

          Row() {
            ForEach([1, 2, 3, 4], (i: number) => {
              Column() {
                Row()
                  .width(i === 1 ? 80 : 100)
                  .height(i === 1 ? 80 : 100)
                  .borderRadius(i === 1 ? 40 : 8)
                  .backgroundColor('#e8e8e8')
                  .margin({ bottom: 8 })

                Row()
                  .width(60)
                  .height(14)
                  .borderRadius(4)
                  .backgroundColor('#e8e8e8')
              }
              .margin({ right: 16 })
            })
          }
          .padding({ left: 16 })
        }
        .margin({ top: 16 })
        .alignItems(HorizontalAlign.Start)
      })
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#ffffff')
  }
}

@Component
struct LibraryTab {
  navigateToLibrary() {
    router.pushUrl({ url: 'pages/LibraryPage' });
  }

  build() {
    Column() {
      Text('🎵 音乐库')
        .fontSize(24)
        .fontWeight(FontWeight.Bold)
        .fontColor('#2c3e50')
        .margin({ top: 40, bottom: 20 })

      Button('进入音乐库')
        .width('60%')
        .height(48)
        .backgroundColor('#007DFF')
        .borderRadius(12)
        .fontSize(16)
        .fontWeight(FontWeight.Medium)
        .fontColor('#FFFFFF')
        .margin({ top: 16 })
        .onClick(() => this.navigateToLibrary())
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#ffffff')
    .justifyContent(FlexAlign.Start)
  }
}

@Component
struct PersonalTab {
  navigateToPersonal() {
    router.pushUrl({ url: 'pages/PersonalPage' });
  }

  build() {
    Column() {
      Text('👤 我的')
        .fontSize(24)
        .fontWeight(FontWeight.Bold)
        .fontColor('#2c3e50')
        .margin({ top: 40, bottom: 20 })

      Button('进入个人中心')
        .width('60%')
        .height(48)
        .backgroundColor('#007DFF')
        .borderRadius(12)
        .fontSize(16)
        .fontWeight(FontWeight.Medium)
        .fontColor('#FFFFFF')
        .margin({ top: 16 })
        .onClick(() => this.navigateToPersonal())
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#ffffff')
    .justifyContent(FlexAlign.Start)
  }
}

@Entry
@Component
struct MainPage {
  @State currentIndex: number = 0;

  @Builder
  TabBuilder(title: string, index: number, icon: string, activeIcon: string) {
    Column() {
      Text(this.currentIndex === index ? activeIcon : icon)
        .fontSize(24)
        .margin({ bottom: 4 })

      Text(title)
        .fontSize(12)
        .fontColor(this.currentIndex === index ? '#007DFF' : '#95a5a6')
        .fontWeight(this.currentIndex === index ? FontWeight.Bold : FontWeight.Normal)
    }
    .width('100%')
    .height(56)
    .justifyContent(FlexAlign.Center)
  }

  build() {
    Tabs({ barPosition: BarPosition.End }) {
      TabContent() {
        HomeTab()
      }
      .tabBar(this.TabBuilder('首页', 0, '🏠', '🏠'))

      TabContent() {
        LibraryTab()
      }
      .tabBar(this.TabBuilder('音乐库', 1, '📚', '📚'))

      TabContent() {
        PersonalTab()
      }
      .tabBar(this.TabBuilder('我的', 2, '👤', '👤'))
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#f5f5f5')
    .barWidth('100%')
    .barHeight(56)
    .animationDuration(300)
    .onChange((index: number) => {
      this.currentIndex = index;
    })
  }
}
