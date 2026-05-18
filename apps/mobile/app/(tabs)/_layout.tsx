import { useAuth } from "@/src/context/AuthContext";
import { initBaseURL } from "@/src/https";
import { check } from "@soundx/services";
import { Stack, usePathname, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { BackHandler } from "react-native";

export default function TabLayout() {
  const { logout } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const lastIndexRef = React.useRef<number | null>(null);
  const tabOrder = ["index", "library", "personal"];

  const currentKey = ((segments as unknown as string[])[1]) || "index";
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

  // 只在真正停留在 tab 根页面（首页/声仓/个人）时退出应用。
  // 详情页/设置页等覆盖在 tab 之上时，segments 仍可能保留 tab 信息，
  // 因此必须用 pathname 精确判断，避免把这些页面的返回键误处理为退出应用。
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      const isTabRoot = pathname === "/" || pathname === "/library" || pathname === "/personal";
      if (isTabRoot) {
        BackHandler.exitApp();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [pathname]);

  return (
    <Stack screenOptions={{ headerShown: false, animation }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="library" />
      <Stack.Screen name="personal" />
    </Stack>
  );
}
