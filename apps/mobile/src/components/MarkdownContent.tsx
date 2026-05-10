import { Image } from "expo-image";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import React, { useMemo, type ComponentProps } from "react";
import {
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Markdown, { MarkdownIt } from "react-native-markdown-display";

interface MarkdownContentProps {
  children: string;
  style?: ComponentProps<typeof Markdown>["style"];
}

const REPO_BASE_URL = "https://github.com/mmdctjj/AudioDock/";
const markdownIt = MarkdownIt({ typographer: true, linkify: true });

const toExternalUrl = (url?: string) => {
  if (!url) return "";

  try {
    if (/^(mailto:|tel:)/i.test(url)) return url;
    return new URL(url, REPO_BASE_URL).toString();
  } catch {
    return url;
  }
};

const getImageExtension = (url: string) => {
  try {
    const pathname = url.split(/[?#]/)[0];
    const ext = pathname.split(".").pop()?.toLowerCase();
    if (ext && /^[a-z0-9]{2,5}$/.test(ext)) return ext;
  } catch {
    // Fall through to jpg.
  }

  return "jpg";
};

const openExternalUrl = async (url?: string) => {
  const externalUrl = toExternalUrl(url);
  if (!externalUrl) return;

  try {
    await Linking.openURL(externalUrl);
  } catch (error) {
    console.warn("Failed to open markdown URL:", error);
    Alert.alert("无法打开链接", externalUrl);
  }
};

const downloadImage = async (url?: string) => {
  const imageUrl = toExternalUrl(url);
  if (!imageUrl) return;

  try {
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("需要相册权限", "请允许访问相册后再保存图片。");
      return;
    }

    const extension = getImageExtension(imageUrl);
    const localUri = `${FileSystem.cacheDirectory || ""}markdown-image-${Date.now()}.${extension}`;
    const result = await FileSystem.downloadAsync(imageUrl, localUri);
    await MediaLibrary.saveToLibraryAsync(result.uri);
    Alert.alert("保存成功", "图片已保存到本地相册。");
  } catch (error) {
    console.warn("Failed to save markdown image:", error);
    Alert.alert("保存失败", "图片下载或保存失败，请稍后再试。");
  }
};

const MarkdownContent = ({ children, style }: MarkdownContentProps) => {
  const rules = useMemo(
    () => ({
      image: (node: any) => {
        const src = toExternalUrl(node.attributes?.src);
        const alt = node.attributes?.alt || "markdown image";

        if (!src) return null;

        return (
          <View key={node.key} style={styles.imageWrapper}>
            <TouchableOpacity activeOpacity={0.85} onPress={() => openExternalUrl(src)}>
              <Image source={{ uri: src }} style={styles.image} contentFit="contain" accessibilityLabel={alt} />
            </TouchableOpacity>
            <View style={styles.imageActions}>
              <TouchableOpacity style={styles.imageActionButton} onPress={() => openExternalUrl(src)}>
                <Text style={styles.imageActionText}>打开图片</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageActionButton} onPress={() => downloadImage(src)}>
                <Text style={styles.imageActionText}>保存图片</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      },
    }),
    [],
  );

  return (
    <Markdown
      style={style}
      rules={rules}
      markdownit={markdownIt}
      onLinkPress={(url) => {
        openExternalUrl(url);
        return false;
      }}
    >
      {children}
    </Markdown>
  );
};

const styles = StyleSheet.create({
  imageWrapper: {
    marginVertical: 10,
    width: "100%",
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: 10,
  },
  imageActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  imageActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(0, 122, 255, 0.12)",
  },
  imageActionText: {
    color: "#007AFF",
    fontSize: 13,
    fontWeight: "600",
  },
});

export default MarkdownContent;
