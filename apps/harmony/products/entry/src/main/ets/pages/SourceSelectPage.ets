import router from '@ohos.router';

interface SourceItem {
  key: string;
  name: string;
  desc: string;
  iconColor: string;
}

@Entry
@Component
struct SourceSelectPage {
  @State sourceList: SourceItem[] = [
    { key: 'AudioDock', name: 'AudioDock', desc: '自建 AudioDock 服务端', iconColor: '#007DFF' },
    { key: 'Subsonic', name: 'Subsonic', desc: '兼容 Subsonic/API 协议的音乐服务器', iconColor: '#FF6B35' },
    { key: 'Emby', name: 'Emby', desc: 'Emby 媒体服务器', iconColor: '#52B54B' }
  ];

  @State selectedSource: string = '';

  build() {
    Column() {
      // Header
      Row() {
        Text('选择数据源')
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
          .fontColor('#2c3e50')
      }
      .width('100%')
      .padding({ top: 16, bottom: 16 })
      .justifyContent(FlexAlign.Center)

      Text('请选择您的音乐服务器类型')
        .fontSize(14)
        .fontColor('#95a5a6')
        .margin({ bottom: 24 })

      // Source List
      List() {
        ForEach(this.sourceList, (item: SourceItem) => {
          ListItem() {
            Row() {
              // Icon placeholder
              Column() {
                Text(item.name.substring(0, 1))
                  .fontSize(24)
                  .fontColor('#FFFFFF')
                  .fontWeight(FontWeight.Bold)
              }
              .width(50)
              .height(50)
              .borderRadius(12)
              .backgroundColor(item.iconColor)
              .justifyContent(FlexAlign.Center)

              Column() {
                Text(item.name)
                  .fontSize(18)
                  .fontWeight(FontWeight.Medium)
                  .fontColor('#2c3e50')

                Text(item.desc)
                  .fontSize(12)
                  .fontColor('#95a5a6')
                  .margin({ top: 4 })
                  .maxLines(2)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
              }
              .layoutWeight(1)
              .margin({ left: 16 })
              .alignItems(HorizontalAlign.Start)

              Text('›')
                .fontSize(24)
                .fontColor('#bdc3c7')
            }
            .width('100%')
            .padding(16)
            .backgroundColor('#f8f9fa')
            .borderRadius(12)
            .onClick(() => {
              router.pushUrl({
                url: 'pages/LoginPage',
                params: { sourceType: item.key }
              });
            })
          }
          .margin({ bottom: 12 })
        })
      }
      .listDirection(Axis.Vertical)
      .padding({ left: 16, right: 16 })
      .layoutWeight(1)

      // Bottom info
      Text('AudioDock HarmonyOS')
        .fontSize(12)
        .fontColor('#bdc3c7')
        .margin({ bottom: 24 })
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#ffffff')
  }
}
