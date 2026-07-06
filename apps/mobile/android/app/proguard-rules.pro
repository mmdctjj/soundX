# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# React Native 通用 keep —— R8 会把 Hermes/JSI 走 native 的类误删，必须保留。
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.proguard.annotations.** { *; }
-keep class com.facebook.soloader.** { *; }
-keep class com.facebook.yoga.** { *; }

# 反射使用，不要混淆
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# expo modules
-keep class expo.modules.** { *; }
-keep class abi48_0_0.** { *; }
-keep class abi49_0_0.** { *; }
-keep class abi50_0_0.** { *; }
-keep class abi51_0_0.** { *; }
-keep class abi52_0_0.** { *; }
-keep class abi53_0_0.** { *; }
-keep class abi54_0_0.** { *; }

# 第三方需要反射的
-keep class com.horcrux.svg.** { *; }         # react-native-svg
-keep class com.swmansion.gesturehandler.** { *; }  # react-native-gesture-handler
-keep class com.swmansion.reanimated.** { *; }
-keep class com.brentvatne.** { *; }
-keep class com.guichaguri.trackplayer.** { *; } # react-native-track-player
-keep class com.dooboolab.** { *; }
-keep class com.margelo.nitro.** { *; }

# 我们自己的应用入口
-keep public class com.audiodock.app.MainApplication { *; }
-keep public class com.audiodock.app.MainActivity { *; }

# 防止 native method 被误删
-keepclasseswithmembernames class * {
    native <methods>;
}

# WebRTC / 微信模块
-keep class com.tencent.** { *; }
-keep class com.theweave.** { *; }
