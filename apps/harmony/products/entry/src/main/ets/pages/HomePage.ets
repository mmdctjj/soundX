import router from '@ohos.router';

// 数据模型
class Artist {
  id: number = 0;
  name: string = '';
  avatar: string = '';

  constructor(id: number, name: string, avatar: string) {
    this.id = id;
    this.name = name;
    this.avatar = avatar;
  }
}

class Album {
  id: number = 0;
  name: string = '';
  artist: string = '';
  cover: string = '';
  progress?: number;

  constructor(id: number, name: string, artist: string, cover: string, progress?: number) {
    this.id = id;
    this.name = name;
    this.artist = artist;
    this.cover = cover;
    if (progress !== undefined) {
      this.progress = progress;
    }
  }
}

class Track {
  id: number = 0;
  name: string = '';
  artist: string = '';
  cover: string = '';
  liked: boolean = false;

  constructor(id: number, name: string, artist: string, cover: string, liked: boolean) {
    this.id = id;
    this.name = name;
    this.artist = artist;
    this.cover = cover;
    this.liked = liked;
  }
}

class Section {
  id: string = '';
  title: string = '';
  type: string = '';
  // 使用联合类型替代 any
  data: Artist[] | Album[] | Track[] = [];

  constructor(id: string, title: string, type: string, data: Artist[] | Album[] | Track[]) {
    this.id = id;
    this.title = title;
    this.type = type;
    this.data = data;
  }
}

@Entry
@Component
struct HomePage {
  @State sections: Section[] = [];
  @State loading: boolean = true;
  @State refreshing: boolean = false;
  @State mode: string = 'MUSIC';
  @State isRadioMode: boolean = false;

  // 模拟数据
  private mockArtists: Artist[] = [
    new Artist(1, '周杰伦', ''),
    new Artist(2, '林俊杰', ''),
    new Artist(3, '陈奕迅', ''),
    new Artist(4, '邓紫棋', '')
  ];

  private mockAlbums: Album[] = [
    new Album(1, '范特西', '周杰伦', ''),
    new Album(2, '伟大的渺小', '林俊杰', ''),
    new Album(3, 'U-87', '陈奕迅', ''),
    new Album(4, '新的心跳', '邓紫棋', '')
  ];

  private mockTracks: Track[] = [
    new Track(1, '晴天', '周杰伦', '', true),
    new Track(2, '江南', '林俊杰', '', false),
    new Track(3, '富士山下', '陈奕迅', '', true),
    new Track(4, '光年之外', '邓紫棋', '', false)
  ];

  aboutToAppear() {
    this.loadData();
  }

  loadData() {
    setTimeout(() => {
      const sections: Section[] = [];
      sections.push(new Section('artists', '最新艺人', 'artist', this.mockArtists));
      sections.push(new Section('recent', '最新专辑', 'album', this.mockAlbums));
      sections.push(new Section('recommended', '推荐专辑', 'album', [
        new Album(5, '依然范特西', '周杰伦', ''),
        new Album(6, '因你而在', '林俊杰', ''),
        new Album(7, 'Black. White. Gray', '陈奕迅', ''),
        new Album(8, 'Xposed', '邓紫棋', '')
      ]));

      if (this.mode === 'MUSIC') {
        sections.push(new Section('tracks', '最新曲目', 'track', this.mockTracks));
      } else {
        const historyAlbums: Album[] = [
          new Album(1, '范特西', '周杰伦', '', 35),
          new Album(2, '伟大的渺小', '林俊杰', '', 60)
        ];
        sections.push(new Section('history', '继续听', 'album', historyAlbums));
      }

      this.sections = sections;
      this.loading = false;
      this.refreshing = false;
    }, 800);
  }

  onRefresh() {
    this.refreshing = true;
    this.loadData();
  }

  toggleMode() {
    this.mode = this.mode === 'MUSIC' ? 'AUDIOBOOK' : 'MUSIC';
    this.loading = true;
    this.loadData();
  }

  toggleRadioMode() {
    this.isRadioMode = !this.isRadioMode;
  }

  toggleLike(trackId: number) {
    const newSections: Section[] = [];
    for (let i = 0; i < this.sections.length; i++) {
      const section = this.sections[i];
      if (section.type === 'track') {
        const newData: Track[] = [];
        for (let j = 0; j < section.data.length; j++) {
          const t = section.data[j] as Track;
          if (t.id === trackId) {
            newData.push(new Track(t.id, t.name, t.artist, t.cover, !t.liked));
          } else {
            newData.push(new Track(t.id, t.name, t.artist, t.cover, t.liked));
          }
        }
        newSections.push(new Section(section.id, section.title, section.type, newData));
      } else {
        newSections.push(new Section(section.id, section.title, section.type, section.data));
      }
    }
    this.sections = newSections;
  }

  navigateToSearch() {
    // TODO: 实现搜索页面
  }

  navigateToArtist(artistId: number) {
    // TODO: 实现艺人详情页
  }

  navigateToAlbum(albumId: number) {
    // TODO: 实现专辑详情页
  }

  playTrack(track: Track) {
    // TODO: 实现播放逻辑
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
        .align(Alignment.Bottom)
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
          Text(track.liked ? '❤' : '🤍')
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
    if (this.loading && !this.refreshing) {
      this.LoadingSkeleton();
    } else {
      Column() {
        // Header
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

        // 搜索栏
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

        // 内容列表
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

          // 底部调整顺序按钮
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

  // 分块曲目
  chunkTracks(tracks: Track[]): Track[][] {
    const result: Track[][] = [];
    const trackList: Track[] = [];
    for (let i = 0; i < tracks.length; i++) {
      trackList.push(tracks[i] as Track);
    }
    for (let i = 0; i < trackList.length; i += 2) {
      const chunk: Track[] = [];
      chunk.push(trackList[i]);
      if (i + 1 < trackList.length) {
        chunk.push(trackList[i + 1]);
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
