import React from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";
import { usePlayMode } from "../../src/utils/playMode";

export default function PersonalScreen() {
  const { theme, toggleTheme, colors } = useTheme();
  const { mode, setMode } = usePlayMode();
  const { logout, user } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      <View style={styles.content}>
        <Text style={[styles.text, { color: colors.text }]}>
          {user?.username ? `Hi, ${user.username}` : "Personal Screen"}
        </Text>
        <View style={styles.settingRow}>
          <Text style={[styles.settingText, { color: colors.text }]}>
            Dark Mode
          </Text>
          <Switch
            value={theme === "dark"}
            onValueChange={toggleTheme}
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={theme === "dark" ? "#f5dd4b" : "#f4f3f4"}
          />
        </View>
        <View style={styles.settingRow}>
          <Text style={[styles.settingText, { color: colors.text }]}>
            Audiobook Mode
          </Text>
          <Switch
            value={mode === "AUDIOBOOK"}
            onValueChange={(val) => setMode(val ? "AUDIOBOOK" : "MUSIC")}
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={mode === "AUDIOBOOK" ? "#f5dd4b" : "#f4f3f4"}
          />
        </View>
        <View style={{ marginTop: 40 }}>
          <Text
            style={{ color: "red", fontSize: 18, textAlign: "center" }}
            onPress={logout}
          >
            Logout
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  settingText: {
    fontSize: 18,
  },
});
