import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../src/context/AuthContext";
import { useTheme } from "../src/context/ThemeContext";
import { setBaseURL } from "../src/https";

export default function LoginScreen() {
  const { colors } = useTheme();
  const { login, register } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [serverAddress, setServerAddress] = useState("http://localhost:3000");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [statusMessage, setStatusMessage] = useState<'ok' | 'error' >('error');

  useEffect(() => {
    loadServerAddress();
  }, []);

  const checkServerConnectivity = async (address: string) => {
    if (!address) {
      setStatusMessage('error');
      return;
    }

    // Simple URL validation
    if (!address.startsWith("http://") && !address.startsWith("https://")) {
      setStatusMessage('error');
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(
        `${address.endsWith("/") ? address : address + "/"}hello`,
        {
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        if (text.includes("hello")) {
          setStatusMessage("ok");
          return;
        }
      }
      throw new Error();
    } catch (error) {
      setStatusMessage("error");
    }
  };

  const loadServerAddress = async () => {
    try {
      const savedAddress = await AsyncStorage.getItem("serverAddress");
      if (savedAddress) {
        setServerAddress(savedAddress);
        checkServerConnectivity(savedAddress);
      }
    } catch (error) {
      console.error("Failed to load server address:", error);
    }
  };

  const handleSubmit = async () => {
    if (!serverAddress) {
      Alert.alert("Error", "Please enter server address");
      return;
    }
    if (!username || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await AsyncStorage.setItem("serverAddress", serverAddress);
      setBaseURL(serverAddress); // Update base URL immediately

      if (isLogin) {
        await login({ username, password });
      } else {
        await register({ username, password });
      }

      // Navigation is handled by _layout.tsx based on token state,
      // but we can also manually replace if needed.
      // For now, let the auth state change trigger the redirect or we do it here.
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>
            {isLogin ? "欢迎登录" : "欢迎注册"}
          </Text>

          <View style={styles.form}>
            <Text style={[styles.label, { color: colors.text }]}>
              数据源地址
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.inputWarp,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                  },
                ]}
                placeholder="http://localhost:3000"
                placeholderTextColor={colors.secondary}
                value={serverAddress}
                onChangeText={setServerAddress}
                onBlur={() => checkServerConnectivity(serverAddress)}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {statusMessage === "error" ?  (
                <MaterialIcons style={styles.statusMessage} name="error" size={24} color="red" />
              ) : (
                <FontAwesome style={styles.statusMessage} name="check-circle" size={24} color="black" />
              )}
            </View>

            <Text style={[styles.label, { color: colors.text }]}>用户名</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                },
              ]}
              placeholder="用户名"
              placeholderTextColor={colors.secondary}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />

            <Text style={[styles.label, { color: colors.text }]}>密码</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                },
              ]}
              placeholder="密码"
              placeholderTextColor={colors.secondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {!isLogin && (
              <>
                <Text style={[styles.label, { color: colors.text }]}>
                  确认密码
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.card,
                    },
                  ]}
                  placeholder="确认密码"
                  placeholderTextColor={colors.secondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.background }]}>
                  {isLogin ? "登陆" : "注册"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setIsLogin(!isLogin)}
            >
              <Text style={[styles.switchText, { color: colors.secondary }]}>
                {isLogin
                  ? "没有账号？注册"
                  : "已有账号？登录"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 40,
    textAlign: "center",
  },
  form: {
    width: "100%",
    gap: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  switchButton: {
    marginTop: 20,
    alignItems: "center",
  },
  switchText: {
    fontSize: 14,
  },
  statusMessage: {},
  inputContainer: {
    display: "flex",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  inputWarp: {
    flex: 4,
  },
});
