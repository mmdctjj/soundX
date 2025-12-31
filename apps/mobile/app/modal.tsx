import { useTheme } from "@/src/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  LayoutAnimation,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface SectionItem {
  id: string;
  title: string;
}

const DEFAULT_SECTIONS: SectionItem[] = [
  { id: "artists", title: "艺术家" },
  { id: "recent", title: "最近上新" },
  { id: "recommended", title: "为你推荐" },
  { id: "tracks", title: "上新单曲" },
];

const ITEM_HEIGHT = 70; // Fixed height for smoother calculations

export default function ReorderModal() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<SectionItem[]>([]);
  const [draggingIndex, setDraggingIndex] = useState(-1);
  
  const pan = useRef(new Animated.ValueXY()).current;
  const currentY = useRef(0); // Track absolute Y position of drag
  const itemsRef = useRef<SectionItem[]>([]); // Ref for current items to avoid closure stale state in PanResponder

  useEffect(() => {
    loadOrder();
  }, []);

  // Sync ref with state
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const loadOrder = async () => {
    try {
      const savedOrder = await AsyncStorage.getItem("section_order");
      if (savedOrder) {
        const orderIds = JSON.parse(savedOrder);
        // Sort default sections based on saved order
        const sorted = [...DEFAULT_SECTIONS].sort((a, b) => {
          const indexA = orderIds.indexOf(a.id);
          const indexB = orderIds.indexOf(b.id);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
        setItems(sorted);
      } else {
        setItems(DEFAULT_SECTIONS);
      }
    } catch (e) {
      console.error("Failed to load order:", e);
      setItems(DEFAULT_SECTIONS);
    }
  };

  const saveOrder = async () => {
    try {
      const orderIds = items.map((item) => item.id);
      await AsyncStorage.setItem("section_order", JSON.stringify(orderIds));
      router.back();
    } catch (e) {
      console.error("Failed to save order:", e);
    }
  };

  /**
   * ROBUST IMPLEMENTATION:
   * Instead of swapping continuously which is janky with PanResponder closure capture,
   * we update a "placeholder" index visually, and only commit order on release?
   * 
   * OR: We use the simpler "Move Up/Down" visual style but with drag?
   * 
   * Let's try the "Active ID" approach which allows swapping.
   */
  
  // Re-implementing with stable handler
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  
  useEffect(() => { activeIdRef.current = activeId }, [activeId]);

  const globalPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        // Need to hit-test or pass index in?
        // Let's bind PanResponder to the individual View, but we encounter the "closure" issue.
        // Solution: Use a ref-based tracker for the list order and a single layout calculator.
      }
    })
  ).current;

  // Final working simple version:
  // Render list. Item has "Move" handle. 
  // Handle has PanResponder.
  // We use `map` index.
  

  
  // RETHINK: Absolute Position List
  // This is the only way to get true smooth 60fps sorting without library.
  
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingHorizontal: 20, paddingTop: insets.top }}>
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: 44, 
        marginBottom: 10 
      }}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={{ position: 'absolute', left: 0, padding: 10, zIndex: 10 }}
        >
           <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>调整顺序</Text>
      </View>

      <Text style={{ color: colors.secondary, marginBottom: 15 }}>
        长按图标拖动排序
      </Text>

      <View style={{ height: items.length * ITEM_HEIGHT, position: 'relative' }}>
         {items.map((item, index) => {
             const isDragging = draggingIndex === index;
             const top = index * ITEM_HEIGHT;
             
             // If dragging, add the pan offset
             const transform = isDragging ? [{translateY: pan.y}] : [];
             
             const pr = PanResponder.create({
                onStartShouldSetPanResponder: () => true,
                onPanResponderGrant: () => {
                    setDraggingIndex(index);
                    pan.setOffset({x: 0, y: 0});
                    pan.setValue({ x: 0, y: 0 });
                },
                onPanResponderMove: (e, gesture) => {
                    const dy = gesture.dy;
                    pan.setValue({ x: 0, y: dy });
                    
                    // Check overlap
                    const currentTop = index * ITEM_HEIGHT + dy;
                    const possibleIndex = Math.round(currentTop / ITEM_HEIGHT);
                    
                    if (possibleIndex >= 0 && possibleIndex < itemsRef.current.length && possibleIndex !== index) {
                         const newItems = [...itemsRef.current];
                         const [moved] = newItems.splice(index, 1);
                         newItems.splice(possibleIndex, 0, moved);
                         
                         LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                         setItems(newItems);
                         
                         // We changed the index of the dragging item!
                         // draggingIndex needs to update to 'possibleIndex' immediately 
                         // so it keeps rendering as "dragging".
                         setDraggingIndex(possibleIndex);
                         
                         // Reset pan because we fundamentally moved the "origin" (top) of the item
                         // New origin is possibleIndex * Height.
                         // We need to adjust pan so it doesn't jump.
                         // Old Y (gest) = (oldIdx * H) + dy
                         // New Y (gest) = (newIdx * H) + newDy
                         // We want Visual Y to be same.
                         // (oldIdx * H) + dy = (newIdx * H) + newDy
                         // newDy = dy + (oldIdx - newIdx) * H
                         
                         pan.setOffset({ x: 0, y: dy + (index - possibleIndex) * ITEM_HEIGHT});
                         pan.setValue({ x: 0, y: 0});
                    }
                },
                onPanResponderRelease: () => {
                    setDraggingIndex(-1);
                    pan.setValue({x:0, y:0});
                }
             });
             
             return (
                 <Animated.View 
                    key={item.id} 
                    {...pr.panHandlers}
                    style={[
                        styles.absoluteItem, 
                        { 
                            top, 
                            backgroundColor: isDragging ? colors.card : 'transparent',
                            transform,
                            zIndex: isDragging ? 99 : 1,
                            shadowOpacity: isDragging ? 0.2 : 0,
                         }
                    ]}
                 >
                     <Text style={{ color: colors.text, fontSize: 16 }}>{item.title}</Text>
                     <Ionicons name="menu" size={24} color={isDragging ? colors.primary : colors.secondary} />
                 </Animated.View>
             );
         })}
      </View>

      <TouchableOpacity
        style={{
          marginTop: 20,
          backgroundColor: colors.primary,
          padding: 15,
          borderRadius: 10,
        }}
        onPress={saveOrder}
      >
        <Text style={{ color: colors.background, textAlign: "center", fontWeight: "bold", fontSize: 16 }}>
          保存设置
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
    itemContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: ITEM_HEIGHT,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)'
    },
    // Used for absolute positioning strategy
    absoluteItem: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: ITEM_HEIGHT,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        borderRadius: 8,
    },
    handle: {
        padding: 10,
    },
    shadow: {
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    }
});
