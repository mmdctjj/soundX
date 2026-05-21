import router from '@ohos.router';

@Entry
@Component
struct Index {
  @State message: string = 'Hello World'

  navigateToSourceSelect() {
    router.pushUrl({ url: 'pages/SourceSelectPage' });
  }

  build() {
    Column() {
      Text(this.message)
        .fontSize(50)
        .fontWeight(FontWeight.Bold)
        .fontColor('#2c3e50')

      Text('AudioDock on HarmonyOS')
        .fontSize(16)
        .fontColor('#95a5a6')
        .margin({ top: 12 })

      Button('进入首页')
        .width('60%')
        .height(48)
        .backgroundColor('#52B54B')
        .borderRadius(12)
        .fontSize(16)
        .fontWeight(FontWeight.Medium)
        .fontColor('#FFFFFF')
        .margin({ top: 16 })
        .onClick(() => {
          router.pushUrl({ url: 'pages/HomePage' });
        })

      Button('选择数据源')
        .width('60%')
        .height(48)
        .backgroundColor('#007DFF')
        .borderRadius(12)
        .fontSize(16)
        .fontWeight(FontWeight.Medium)
        .fontColor('#FFFFFF')
        .margin({ top: 12 })
        .onClick(() => this.navigateToSourceSelect())
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }
}