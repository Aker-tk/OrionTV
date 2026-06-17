import React, { useCallback, useRef, useState, useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  BackHandler,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleProp,
  ViewStyle,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { getCommonResponsiveStyles } from "@/utils/ResponsiveStyles";

interface CustomScrollViewProps {
  data: any[];
  renderItem: ({ item, index }: { item: any; index: number }) => React.ReactNode;
  numColumns?: number; // 如果不提供，将使用响应式默认值
  itemWidth?: number;
  itemSpacing?: number;
  contentHorizontalPadding?: number;
  columnWrapperStyle?: StyleProp<ViewStyle>;
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
  itemWidth,
  itemSpacing,
  contentHorizontalPadding,
  columnWrapperStyle,
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
  const endReachedPendingRef = useRef(false);
  const previousLoadingMoreRef = useRef(loadingMore);
  const previousDataLengthRef = useRef(data.length);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const responsiveConfig = useResponsiveLayout();
  const commonStyles = getCommonResponsiveStyles(responsiveConfig);
  const { deviceType } = responsiveConfig;

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    // 滚动动画结束后聚焦第一个卡片
    setTimeout(() => {
      firstCardRef.current?.focus();
    }, 500); // 500ms 适配大多数动画时长
  }, []);

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
  }, [showScrollToTop, deviceType, scrollToTop]);

  useEffect(() => {
    const completedLoadingMore = previousLoadingMoreRef.current && !loadingMore;
    const dataLengthChanged = previousDataLengthRef.current !== data.length;

    if (completedLoadingMore || dataLengthChanged) {
      endReachedPendingRef.current = false;
    }

    previousLoadingMoreRef.current = loadingMore;
    previousDataLengthRef.current = data.length;
  }, [data.length, loadingMore]);

  // 使用响应式列数，如果没有明确指定的话
  const effectiveColumns = numColumns || responsiveConfig.columns;
  const effectiveItemWidth = itemWidth || responsiveConfig.cardWidth;
  const effectiveItemSpacing = itemSpacing ?? responsiveConfig.spacing;
  const effectiveHorizontalPadding = contentHorizontalPadding ?? responsiveConfig.spacing / 2;
  const shouldDistributeColumns = Boolean(columnWrapperStyle) && effectiveColumns > 1;
  const windowSize = deviceType === 'tv' ? 7 : 5;

  const handleScroll = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
      const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - loadMoreThreshold;

      // 显示/隐藏返回顶部按钮
      const shouldShowScrollToTop = contentOffset.y > 200;
      setShowScrollToTop((current) => (current === shouldShowScrollToTop ? current : shouldShowScrollToTop));

      if (isCloseToBottom && !loadingMore && onEndReached && !endReachedPendingRef.current) {
        endReachedPendingRef.current = true;
        onEndReached();
      }
    },
    [onEndReached, loadingMore, loadMoreThreshold]
  );

  const renderFooter = useCallback(() => {
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
  }, [ListFooterComponent, loadingMore]);

  // 动态样式
  const listStyles = useMemo(() => StyleSheet.create({
    listContent: {
      paddingBottom: responsiveConfig.spacing * 2,
      paddingHorizontal: effectiveHorizontalPadding,
    },
    itemContainer: {
      width: effectiveItemWidth,
      marginRight: shouldDistributeColumns ? 0 : effectiveItemSpacing,
      marginBottom: effectiveItemSpacing,
    },
  }), [
    effectiveHorizontalPadding,
    effectiveItemSpacing,
    effectiveItemWidth,
    responsiveConfig.spacing,
    shouldDistributeColumns,
  ]);

  const scrollToTopStyles = useMemo(() => StyleSheet.create({
    scrollToTopButton: {
      position: 'absolute',
      right: responsiveConfig.spacing,
      bottom: responsiveConfig.spacing * 2,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      padding: responsiveConfig.spacing,
      borderRadius: responsiveConfig.spacing,
      opacity: showScrollToTop ? 1 : 0,
    },
  }), [
    responsiveConfig.spacing,
    showScrollToTop,
  ]);

  const renderGridItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <View style={listStyles.itemContainer}>{renderItem({ item, index })}</View>
    ),
    [listStyles.itemContainer, renderItem]
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
        key={`${effectiveColumns}-${effectiveItemWidth}`}
        numColumns={effectiveColumns}
        contentContainerStyle={listStyles.listContent}
        columnWrapperStyle={columnWrapperStyle}
        onScroll={handleScroll}
        updateCellsBatchingPeriod={50}
        scrollEventThrottle={64}
        showsVerticalScrollIndicator={responsiveConfig.deviceType !== 'tv'}
        initialNumToRender={effectiveColumns * 2}
        maxToRenderPerBatch={effectiveColumns * 2}
        windowSize={windowSize}
        removeClippedSubviews={true}
        ListFooterComponent={renderFooter}
      />
      {deviceType!=='tv' && (
        <TouchableOpacity
          style={scrollToTopStyles.scrollToTopButton}
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
