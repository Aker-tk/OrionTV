import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  BackHandler,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { getCommonResponsiveStyles } from "@/utils/ResponsiveStyles";

interface CustomScrollViewProps {
  data: any[];
  renderItem: ({ item, index }: { item: any; index: number }) => React.ReactNode;
  numColumns?: number; // 如果不提供，将使用响应式默认值
  loading?: boolean;
  loadingMore?: boolean;
  error?: string | null;
  onEndReached?: () => void;
  loadMoreThreshold?: number;
  emptyMessage?: string;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
}

const CustomScrollView: React.FC<CustomScrollViewProps> = ({
  data,
  renderItem,
  numColumns,
  loading = false,
  loadingMore = false,
  error = null,
  onEndReached,
  loadMoreThreshold = 200,
  emptyMessage = "暂无内容",
  ListFooterComponent,
}) => {
  const listRef = useRef<FlatList<any>>(null);
  const firstCardRef = useRef<any>(null); // <--- 新增
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const responsiveConfig = useResponsiveLayout();
  const commonStyles = getCommonResponsiveStyles(responsiveConfig);
  const { deviceType } = responsiveConfig;

  // 添加返回键处理逻辑
  useEffect(() => {
    if (deviceType === 'tv') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (showScrollToTop) {
          scrollToTop();
          return true; // 阻止默认的返回行为
        }
        return false; // 允许默认的返回行为
      });

      return () => backHandler.remove();
    }
  }, [showScrollToTop,deviceType]);

  // 使用响应式列数，如果没有明确指定的话
  const effectiveColumns = numColumns || responsiveConfig.columns;

  const handleScroll = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
      const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - loadMoreThreshold;

      // 显示/隐藏返回顶部按钮
      const shouldShowScrollToTop = contentOffset.y > 200;
      setShowScrollToTop((current) => (current === shouldShowScrollToTop ? current : shouldShowScrollToTop));

      if (isCloseToBottom && !loadingMore && onEndReached) {
        onEndReached();
      }
    },
    [onEndReached, loadingMore, loadMoreThreshold]
  );

  const scrollToTop = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    // 滚动动画结束后聚焦第一个卡片
    setTimeout(() => {
      firstCardRef.current?.focus();
    }, 500); // 500ms 适配大多数动画时长
  };

  const renderFooter = () => {
    if (ListFooterComponent) {
      if (React.isValidElement(ListFooterComponent)) {
        return ListFooterComponent;
      } else if (typeof ListFooterComponent === "function") {
        const Component = ListFooterComponent as React.ComponentType<any>;
        return <Component />;
      }
      return null;
    }
    if (loadingMore) {
      return <ActivityIndicator style={{ marginVertical: 20 }} size="large" />;
    }
    return null;
  };

  // 动态样式
  const dynamicStyles = StyleSheet.create({
    listContent: {
      paddingBottom: responsiveConfig.spacing * 2,
      paddingHorizontal: responsiveConfig.spacing / 2,
    },
    itemContainer: {
      width: responsiveConfig.cardWidth,
      marginRight: responsiveConfig.spacing,
      marginBottom: responsiveConfig.spacing,
    },
    scrollToTopButton: {
      position: 'absolute',
      right: responsiveConfig.spacing,
      bottom: responsiveConfig.spacing * 2,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      padding: responsiveConfig.spacing,
      borderRadius: responsiveConfig.spacing,
      opacity: showScrollToTop ? 1 : 0,
    },
  });

  const renderGridItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <View style={dynamicStyles.itemContainer}>{renderItem({ item, index })}</View>
    ),
    [dynamicStyles.itemContainer, renderItem]
  );

  const keyExtractor = useCallback((item: any, index: number) => {
    const stableKey = item?.id ?? item?.title ?? item?.source;
    return stableKey ? `${stableKey}-${index}` : `item-${index}`;
  }, []);

  if (loading) {
    return (
      <View style={commonStyles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={commonStyles.center}>
        <ThemedText type="subtitle" style={{ padding: responsiveConfig.spacing }}>
          {error}
        </ThemedText>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={commonStyles.center}>
        <ThemedText>{emptyMessage}</ThemedText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        ref={listRef}
        data={data}
        renderItem={renderGridItem}
        keyExtractor={keyExtractor}
        key={effectiveColumns}
        numColumns={effectiveColumns}
        contentContainerStyle={dynamicStyles.listContent}
        onScroll={handleScroll}
        scrollEventThrottle={64}
        showsVerticalScrollIndicator={responsiveConfig.deviceType !== 'tv'}
        initialNumToRender={effectiveColumns * 2}
        maxToRenderPerBatch={effectiveColumns * 2}
        windowSize={5}
        removeClippedSubviews={true}
        ListFooterComponent={renderFooter}
      />
      {deviceType!=='tv' && (
        <TouchableOpacity
          style={dynamicStyles.scrollToTopButton}
          onPress={scrollToTop}
          activeOpacity={0.8}
        >
          <ThemedText>⬆️</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default CustomScrollView;
