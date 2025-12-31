import React, { useRef, useState } from "react";
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

interface Props {
  sections: string[];
  onSelect: (section: string, index: number) => void;
  style?: ViewStyle;
}

export const AlphabetSidebar = ({ sections, onSelect, style }: Props) => {
  const { colors } = useTheme();
  const [containerHeight, setContainerHeight] = useState(0);
  const [containerLayout, setContainerLayout] = useState<{ y: number, height: number } | null>(null);

  const handleSelect = (y: number) => {
    if (!containerHeight || sections.length === 0) return;
    
    const itemHeight = containerHeight / sections.length;
    const index = Math.floor(y / itemHeight);
    
    if (index >= 0 && index < sections.length) {
      onSelect(sections[index], index);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        handleSelect(evt.nativeEvent.locationY);
      },
      onPanResponderMove: (evt, gestureState) => {
        handleSelect(evt.nativeEvent.locationY);
      },
    })
  ).current;

  return (
    <View
      style={[styles.container, style]}
      {...panResponder.panHandlers}
      onLayout={(e) => {
        setContainerHeight(e.nativeEvent.layout.height);
      }}
    >
      {sections.map((section, index) => (
        <View key={index} style={styles.item}>
          <Text
            style={[
              styles.text,
              { color: colors.primary, fontSize: sections.length > 26 ? 8 : 10 },
            ]}
          >
            {section}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 2,
    top: 60,
    bottom: 60,
    width: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.5)", // slight background for touch area visibility
    borderRadius: 10,
    zIndex: 100,
  },
  item: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  text: {
    fontWeight: "bold",
  },
});
