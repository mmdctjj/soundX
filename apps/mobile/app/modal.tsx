import { useTheme } from "@/src/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";

interface Section {
  id: string;
  title: string;
  data: any[];
  type: "artist" | "album" | "track";
}

export default function ReorderModal() {
  const { colors } = useTheme();
  const router = useRouter();

  // 如果你需要传 sections 数据，可以用 router params
  const { sections } = useLocalSearchParams<{ sections: any[] }>();
  const [tempSections, setTempSections] = useState(sections || []);

  const saveOrder = () => {
    // 保存顺序逻辑，例如通过 context 或 redux
    router.back(); // 关闭 modal
  };

  const renderReorderItem = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<Section>) => {
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          disabled={isActive}
          style={[{ backgroundColor: isActive ? colors.card : "transparent" }]}
        >
          <Text style={[{ color: colors.text }]}>{item.title}</Text>
          <Ionicons name="menu" size={24} color={colors.secondary} />
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.card, padding: 20 }}>
      <Text style={{ color: colors.text, fontSize: 18, marginBottom: 20 }}>
        调整顺序
      </Text>

      <View style={{ height: 200 }}>
        <DraggableFlatList
          data={tempSections}
          onDragEnd={({ data }) => setTempSections(data)}
          keyExtractor={(item) => item.id}
          renderItem={renderReorderItem}
        />
      </View>

      <TouchableOpacity
        style={{
          marginTop: 20,
          backgroundColor: colors.primary,
          padding: 10,
          borderRadius: 5,
        }}
        onPress={saveOrder}
      >
        <Text style={{ color: colors.background, textAlign: "center" }}>
          确定
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{ marginTop: 10, padding: 10 }}
        onPress={() => router.back()}
      >
        <Text style={{ color: colors.secondary, textAlign: "center" }}>
          取消
        </Text>
      </TouchableOpacity>
    </View>
  );
}
