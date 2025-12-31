import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import "react-native-reanimated";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { PlayerProvider } from "../src/context/PlayerContext";
import { ThemeProvider } from "../src/context/ThemeContext";
import { PlayModeProvider } from "../src/utils/playMode";

export const unstable_settings = {
  anchor: "(tabs)",
};

import { PlaylistModal } from "../src/components/PlaylistModal";
import { SettingsProvider } from "../src/context/SettingsContext";
import { SyncProvider } from "../src/context/SyncContext";

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
      segments[0] === "player" ||
      segments[0] === "search" ||
      segments[0] === "settings" ||
      segments[0] === "playlist";

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
              options={{
                headerShown: false,
                animation: "slide_from_right",
              }}
            />
            <Stack.Screen
              name="player"
              options={{
                presentation: "fullScreenModal",
                headerShown: false,
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen
              name="search"
              options={{
                headerShown: false,
                animation: "fade",
              }}
            />
            <Stack.Screen
              name="settings"
              options={{
                headerShown: false,
                animation: "slide_from_right",
              }}
            />
            <Stack.Screen name="playlist/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="album/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="artist/[id]" options={{ headerShown: false }} />
          </Stack>
          {segments[0] !== "player" && <PlaylistModal />}
        </PlayerProvider>
      </PlayModeProvider>
  );
}

import { GestureHandlerRootView } from "react-native-gesture-handler";

import PlaybackNotification from "../src/components/PlaybackNotification";
import { NotificationProvider } from "../src/context/NotificationContext";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <SettingsProvider>
            <NotificationProvider>
              <SyncProvider>
                <RootLayoutNav />
                <PlaybackNotification />
              </SyncProvider>
            </NotificationProvider>
          </SettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}


