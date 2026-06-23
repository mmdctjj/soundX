import React from "react";
import { ImageStyle, StyleProp } from "react-native";
import { Image as ExpoImage } from "expo-image";

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
  return (
    <ExpoImage
      source={require("../../assets/dexopt/xiaoai.svg")}
      style={[{ width: size, height: size }, style]}
      tintColor={color}
      contentFit="contain"
    />
  );
};
