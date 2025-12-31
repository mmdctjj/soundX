import React, { useRef, useState } from "react";
import {
  GestureResponderEvent,
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
  const containerRef = useRef<View>(null);
  const lastIndex = useRef<number>(-1);

  const handleTouch = (e: GestureResponderEvent) => {
    if (!containerHeight || sections.length === 0) return;
    
    // locationY is the most stable relative coordinate inside the sidebar component
    const y = e.nativeEvent.locationY;
    const itemHeight = containerHeight / sections.length;
    let index = Math.floor(y / itemHeight);
    
    index = Math.max(0, Math.min(index, sections.length - 1));
    
    if (index !== lastIndex.current) {
      lastIndex.current = index;
      onSelect(sections[index], index);
    }
  };

  return (
    <View
      ref={containerRef}
      style={[styles.container, style]}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        setContainerHeight(h);
        containerRef.current?.measure((x, y, width, height, pageX, pageY) => {
          if (pageY) setContainerLayout({ y: pageY, height });
        });
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
      hitSlop={{ left: 20, right: 20, top: 0, bottom: 0 }}
    >
      {sections.map((section, index) => (
        <View key={index} style={styles.item} pointerEvents="none">
          <Text
            style={[
              styles.text,
              { 
                color: colors.primary, 
                fontSize: sections.length > 20 ? 9 : 11 
              },
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
    right: 0,
    top: 60,
    bottom: 60,
    width: 25,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    zIndex: 9999,
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
