import React from "react";
import { ImageStyle, StyleProp } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useTheme } from "../context/ThemeContext";

interface XiaoAiIconProps {
  size?: number;
  color?: string;
  style?: StyleProp<ImageStyle>;
}

export const XiaoAiIcon: React.FC<XiaoAiIconProps> = ({
  size = 24,
  color,
  style,
}) => {
  const { theme } = useTheme();
  const source =
    theme === "dark"
      ? require("../../assets/images/xiaoai_dark.png")
      : require("../../assets/images/xiaoai_light.png");

  return (
    <ExpoImage
      source={source}
      style={[{ width: size, height: size }, style]}
      tintColor={color}
      contentFit="contain"
    />
  );
};