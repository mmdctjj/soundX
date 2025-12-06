import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import "react-native-reanimated";
import { MiniPlayer } from "../src/components/MiniPlayer";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { PlayerProvider } from "../src/context/PlayerContext";
import { ThemeProvider } from "../src/context/ThemeContext";
import { PlayModeProvider } from "../src/utils/playMode";

export const unstable_settings = {
  anchor: "(tabs)",
};

function RootLayoutNav() {
  const { token, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // AsyncStorage.clear();
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(tabs)";

    // 排除 artist / album / modal 页面
    const isDetailPage =
      segments[0] === "artist" ||
      segments[0] === "album" ||
      segments[0] === "modal" ||
      segments[0] === "player";

    if (!token && inAuthGroup) {
      router.replace("/login");
    } else if (token && !inAuthGroup && !isDetailPage) {
      router.replace("/(tabs)");
    }
  }, [token, segments, isLoading]);

  return (
    <PlayModeProvider>
      <PlayerProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
          <Stack.Screen
            name="player"
            options={{
              presentation: "modal",
              headerShown: false,
              animation: "slide_from_bottom",
            }}
          />
        </Stack>
        {segments[0] !== "login" && segments[0] !== "player" && <MiniPlayer />}
      </PlayerProvider>
    </PlayModeProvider>
  );
}

import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
