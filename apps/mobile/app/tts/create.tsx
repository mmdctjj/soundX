import { Ionicons } from "@expo/vector-icons";
import {
  createTtsBatchTasks,
  getTtsLocalFiles,
  getTtsPreviewUrl,
  getTtsVoices,
  getTtsProviders,
  identifyTtsBatch,
  TtsFileItem,
  TtsReviewItem,
  TtsVoice,
  TtsProvider,
  plusGetMe,
} from "@soundx/services";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/context/ThemeContext";
import { trackEvent } from "../../src/services/tracking";

export default function TtsCreateTaskScreen() {
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"select" | "review">("select");

  // [NEW] 服务商相关状态
  const [providers, setProviders] = useState<TtsProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("edge");

  const [voices, setVoices] = useState<TtsVoice[]>([]);
  const [localFiles, setLocalFiles] = useState<TtsFileItem[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("zh-CN-XiaoxiaoNeural");
  const [reviewData, setReviewData] = useState<TtsReviewItem[]>([]);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  const ensureVipAccess = useCallback(async () => {
    const plusToken = await AsyncStorage.getItem("plus_token");
    const plusUserId = await AsyncStorage.getItem("plus_user_id");
    if (!plusToken || !plusUserId) {
      Alert.alert("提示", "请先登录会员账号", [
        { text: "取消", style: "cancel" },
        { text: "去登录", onPress: () => router.replace("/member-login" as any) },
      ]);
      return false;
    }
    let id:any = plusUserId;
    try { id = JSON.parse(plusUserId); } catch {}
    const res = await plusGetMe(id);
    const tier = res?.data?.data?.vipTier;
    if (!tier || tier === "NONE") {
      Alert.alert("提示", "该功能需要开通会员", [
        { text: "取消", style: "cancel" },
        { text: "去开通", onPress: () => router.replace("/member-benefits" as any) },
      ]);
      return false;
    }
    return true;
  }, [router]);

  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    ensureVipAccess().then((ok)=>{ if (ok) { fetchProviders(); fetchLocalFiles(); } });
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // [NEW] 服务商变更时重新加载音色
  useEffect(() => {
    if (selectedProvider) {
      fetchVoices(selectedProvider);
    }
  }, [selectedProvider]);

  // [NEW] 加载服务商列表
  const fetchProviders = async () => {
    try {
      const data = await getTtsProviders();
      if (data.providers && Array.isArray(data.providers)) {
        setProviders(data.providers);
        if (data.providers.length > 0) {
          setSelectedProvider(data.providers[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch providers", err);
    }
  };

  // [MODIFIED] 加载音色列表，带 provider 参数
  const fetchVoices = async (provider: string = selectedProvider) => {
    try {
      const data = await getTtsVoices(provider);
      console.log("Fetched voices:", data);
      if (data.voices && Array.isArray(data.voices)) {
        setVoices(data.voices);
        if (data.voices.length > 0) {
          setSelectedVoice(data.voices[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch voices", err);
    }
  };

  const fetchLocalFiles = async () => {
    setLoading(true);
    try {
      const res = await getTtsLocalFiles();
      if (res.success) {
        setLocalFiles(res.files);
      }
    } catch (err) {
      console.error("Failed to fetch local files", err);
    } finally {
      setLoading(false);
    }
  };

  // [MODIFIED] 预览传入 provider
  const handlePreview = async (voice: string, provider: string = selectedProvider) => {
    if (previewLoading) return;
    setPreviewLoading(voice);
    trackEvent({
      feature: "tts",
      eventName: "tts_voice_preview",
      metadata: { voice, provider },
    });
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      const previewUrl = await getTtsPreviewUrl(voice, provider);
      console.log("Previewing voice:", voice, "provider:", provider, "URL:", previewUrl);
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: previewUrl },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setPreviewLoading(null);
          }
        }
      );
      soundRef.current = sound;
      // 停止转圈，表示已经开始播放了
      setPreviewLoading(null);
    } catch (err) {
      console.error("Preview failed", err);
      Alert.alert("播放失败", "试听音频加载失败");
      setPreviewLoading(null);
    }
  };

  const toggleFileSelection = (path: string) => {
    trackEvent({
      feature: "tts",
      eventName: "tts_file_select",
      metadata: { path },
    });
    setSelectedPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const handleNextStep = async () => {
    if (selectedPaths.length === 0) {
      Alert.alert("提示", "请选择至少一个文件");
      return;
    }

    setLoading(true);
    trackEvent({
      feature: "tts",
      eventName: "tts_batch_identify",
      metadata: { selectedCount: selectedPaths.length },
    });
    try {
      const res = await identifyTtsBatch(selectedPaths);
      if (res.success) {
        const items: TtsReviewItem[] = res.results.map((r) => ({
          key: r.full_path,
          filename: r.filename,
          full_path: r.full_path,
          title: r.title,
          author: r.author,
          voice: selectedVoice,
          provider: selectedProvider,
        }));
        setReviewData(items);
        setView("review");
      }
    } catch (err) {
      Alert.alert("错误", "文件识别失败");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessAll = async () => {
    setLoading(true);
    trackEvent({
      feature: "tts",
      eventName: "tts_task_submit",
      metadata: { taskCount: reviewData.length },
    });
    try {
      const res = await createTtsBatchTasks(
        reviewData.map((item) => ({
          full_path: item.full_path,
          title: item.title,
          author: item.author,
          voice: item.voice,
          provider: item.provider || selectedProvider,
          file_id: item.file_id,
          temp_path: item.temp_path,
        }))
      );

      if (res.success) {
        Alert.alert("成功", `成功开启 ${res.count} 个任务`);
        router.replace("/tts/tasks");
      }
    } catch (err) {
      Alert.alert("错误", "开启任务失败");
    } finally {
      setLoading(false);
    }
  };

  const updateReviewItem = (
    key: string,
    field: keyof TtsReviewItem,
    value: string
  ) => {
    setReviewData((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, [field]: value } : item
      )
    );
  };

  const renderSelectView = () => (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.scrollContent}>
        {/* [NEW] 服务商选择 */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>TTS 服务商</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.providerChipScroll}>
            {providers.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.providerChip,
                  { borderColor: colors.border },
                  selectedProvider === p.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
                onPress={() => setSelectedProvider(p.id)}
              >
                <Text style={[styles.providerChipText, { color: selectedProvider === p.id ? colors.background : colors.secondary }]}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>预设音色</Text>
          <View style={styles.voicePickerRow}>
            <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
               <Text style={{ color: colors.text, paddingHorizontal: 12 }}>
                 {voices.find(v => v.id === selectedVoice)?.name || selectedVoice}
               </Text>
            </View>
            <TouchableOpacity
              style={[styles.previewBtn, { backgroundColor: colors.primary }]}
              onPress={() => handlePreview(selectedVoice, selectedProvider)}
              disabled={previewLoading === selectedVoice}
            >
              {previewLoading === selectedVoice ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Ionicons name="volume-high" size={20} color={colors.background} />
              )}
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.voiceChipScroll}>
             {voices.map(v => (
               <TouchableOpacity
                 key={v.id}
                 style={[
                   styles.voiceChip,
                   { borderColor: colors.border },
                   selectedVoice === v.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                 ]}
                 onPress={() => setSelectedVoice(v.id)}
               >
                 <Text style={[styles.voiceChipText, { color: selectedVoice === v.id ? colors.background : colors.secondary }]}>
                   {v.name} {v.gender === 'male' ? '♂' : v.gender === 'female' ? '♀' : ''}
                 </Text>
               </TouchableOpacity>
             ))}
          </ScrollView>
        </View>

        <View style={styles.listHeaderRow}>
          <Text style={[styles.listLabel, { color: colors.secondary }]}>
            待转换文件 ({localFiles.length})
          </Text>
          <TouchableOpacity
            onPress={() => {
              trackEvent({
                feature: "tts",
                eventName: "tts_local_files_refresh",
              });
              fetchLocalFiles();
            }}
            disabled={loading}
          >
            <Ionicons name="refresh" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {localFiles.map((item) => (
          <TouchableOpacity
            key={item.full_path}
            style={[
              styles.fileItem,
              { borderBottomColor: colors.border },
              item.is_generated && { opacity: 0.5 }
            ]}
            onPress={() => !item.is_generated && toggleFileSelection(item.full_path)}
            disabled={item.is_generated}
          >
            <Ionicons
              name={selectedPaths.includes(item.full_path) ? "checkbox" : "square-outline"}
              size={24}
              color={selectedPaths.includes(item.full_path) ? colors.primary : colors.secondary}
            />
            <View style={styles.fileInfo}>
              <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                {item.filename}
              </Text>
              <Text style={[styles.filePath, { color: colors.secondary }]} numberOfLines={1}>
                {item.full_path}
              </Text>
            </View>
            {item.is_generated && (
              <View style={[styles.badge, { backgroundColor: colors.border }]}>
                <Text style={{ fontSize: 10, color: colors.secondary }}>已生成</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16, borderTopColor: colors.border }]}>
        <View style={styles.selectionInfo}>
           <Text style={{ color: colors.text }}>已选 {selectedPaths.length} 个文件</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { backgroundColor: colors.primary },
            (selectedPaths.length === 0 || loading) && { opacity: 0.5 }
          ]}
          onPress={handleNextStep}
          disabled={selectedPaths.length === 0 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.primaryBtnText}>下一步</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderReviewView = () => (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.scrollContent}>
        <Text style={[styles.reviewHeader, { color: colors.text }]}>确认任务详情</Text>
        {reviewData.map((item) => (
          <View key={item.key} style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.reviewInputRow}>
              <Text style={[styles.inputLabel, { color: colors.secondary }]}>标题</Text>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.border }]}
                value={item.title}
                onChangeText={(val) => updateReviewItem(item.key, "title", val)}
              />
            </View>
            <View style={styles.reviewInputRow}>
              <Text style={[styles.inputLabel, { color: colors.secondary }]}>作者</Text>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.border }]}
                value={item.author}
                onChangeText={(val) => updateReviewItem(item.key, "author", val)}
              />
            </View>
            <View style={styles.reviewInputRow}>
              <Text style={[styles.inputLabel, { color: colors.secondary }]}>服务商</Text>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {providers.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.smallProviderChip,
                        { borderColor: colors.border },
                        item.provider === p.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}
                      onPress={() => updateReviewItem(item.key, "provider", p.id)}
                    >
                      <Text style={{ fontSize: 11, color: item.provider === p.id ? "#fff" : colors.secondary }}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            <View style={styles.reviewInputRow}>
              <Text style={[styles.inputLabel, { color: colors.secondary }]}>音色</Text>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.textInput, { borderColor: colors.border, justifyContent: 'center', flex: 1 }]}>
                    <Text style={{ color: colors.text, fontSize: 14 }}>
                      {voices.find(v => v.id === item.voice)?.name || item.voice}
                    </Text>
                </View>
                <TouchableOpacity
                  style={[styles.smallPreviewBtn, { backgroundColor: colors.primary + '20' }]}
                  onPress={() => handlePreview(item.voice, item.provider || selectedProvider)}
                  disabled={previewLoading === item.voice}
                >
                   {previewLoading === item.voice ? (
                     <ActivityIndicator size="small" color={colors.primary} />
                   ) : (
                     <Ionicons name="volume-high" size={18} color={colors.primary} />
                   )}
                </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
               {voices.map(v => (
                 <TouchableOpacity
                   key={v.id}
                   style={[
                     styles.smallVoiceChip,
                     { borderColor: colors.border },
                     item.voice === v.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                   ]}
                   onPress={() => updateReviewItem(item.key, "voice", v.id)}
                 >
                   <Text style={{ fontSize: 11, color: item.voice === v.id ? "#fff" : colors.secondary }}>
                     {v.name}
                   </Text>
                 </TouchableOpacity>
               ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => setReviewData(prev => prev.filter(i => i.key !== item.key))}
            >
              <Text style={{ color: "#ff4d4f", fontSize: 13 }}>移除此任务</Text>
            </TouchableOpacity>
          </View>
        ))}
        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: colors.border }]}
          onPress={() => setView("select")}
        >
          <Text style={{ color: colors.text }}>返回编辑</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { backgroundColor: colors.primary },
            (reviewData.length === 0 || loading) && { opacity: 0.5 }
          ]}
          onPress={handleProcessAll}
          disabled={reviewData.length === 0 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>启动 {reviewData.length} 个任务</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => view === "review" ? setView("select") : router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>创建 TTS 任务</Text>
        <View style={{ width: 40 }} />
      </View>

      {view === "select" ? renderSelectView() : renderReviewView()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  scrollContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  providerChipScroll: {
    marginTop: 8,
  },
  providerChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  providerChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  voicePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  inputContainer: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
  },
  previewBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  voiceChipScroll: {
    marginTop: 8,
  },
  voiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  voiceChipText: {
    fontSize: 13,
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  listLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 2,
  },
  filePath: {
    fontSize: 11,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    alignItems: "center",
    borderTopWidth: 1,
  },
  selectionInfo: {
    flex: 1,
  },
  primaryBtn: {
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 24,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryBtn: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  reviewHeader: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  reviewCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  reviewInputRow: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  textInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  smallPreviewBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  smallVoiceChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 6,
  },
  smallProviderChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 8,
  },
  removeBtn: {
    marginTop: 12,
    alignItems: "flex-end",
  },
});
