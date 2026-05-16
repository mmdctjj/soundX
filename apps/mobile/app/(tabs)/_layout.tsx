import { useAuth } from "@/src/context/AuthContext";
import { initBaseURL } from "@/src/https";
import { check } from "@soundx/services";
import { Stack, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { BackHandler } from "react-native";

export default function TabLayout() {
  const { logout } = useAuth();
  const segments = useSegments();
  const lastIndexRef = React.useRef<number | null>(null);
  const tabOrder = ["index", "library", "personal"];

  const currentKey = (segments[1] as string) || "index";
  const currentIndex = tabOrder.indexOf(currentKey);
  const prevIndex = lastIndexRef.current;
  const animation =
    prevIndex === null || currentIndex === -1
      ? "slide_from_right"
      : currentIndex === prevIndex
        ? "none"
        : currentIndex > prevIndex
          ? "slide_from_right"
          : "slide_from_left";
  lastIndexRef.current = currentIndex;

  useEffect(() => {
    initBaseURL().then(() => {
      check().then((res) => {
        if (res.code === 401) {
          logout();
        }
      });
    });
  }, []);

  // 在 tab 根页面（首页/声仓/个人）拦截返回键，直接退出应用
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      const currentKey = (segments[1] as string) || "index";
      const isTabRoot = ["index", "library", "personal"].includes(currentKey);
      if (isTabRoot) {
        BackHandler.exitApp();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [segments]);

  return (
    <Stack screenOptions={{ headerShown: false, animation }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="library" />
      <Stack.Screen name="personal" />
    </Stack>
  );
}
