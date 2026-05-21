@Entry
@Component
struct Index {
  @State message: string = 'Hello World'

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
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }
}