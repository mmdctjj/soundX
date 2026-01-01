import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useTheme } from "../context/ThemeContext";

const Bar = ({ delay }: { delay: number }) => {
  const { colors } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start the animation with a delay
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }),
      ])
    );

    // Initial delay implementation
    const timer = setTimeout(() => {
      animation.start();
    }, delay);

    return () => {
      clearTimeout(timer);
      animation.stop();
    };
  }, [anim, delay]);

  const height = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [3.6, 12], // 30% to 100% of 12px
  });

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          height,
          backgroundColor: colors.primary, // Using primary color for indicator
        },
      ]}
    />
  );
};

const PlayingIndicator: React.FC = () => {
  return (
    <View style={styles.container}>
      <Bar delay={0} />
      <Bar delay={200} />
      <Bar delay={400} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 2,
    height: 12,
    paddingHorizontal: 2,
  },
  bar: {
    width: 2,
    borderRadius: 1,
  },
});

export default PlayingIndicator;
