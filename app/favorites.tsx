import React, { useEffect, useCallback, useMemo, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import useFavoritesStore from "@/stores/favoritesStore";
import { Favorite } from "@/services/storage";
import VideoCard from "@/components/VideoCard";
import { api } from "@/services/api";
import CustomScrollView from "@/components/CustomScrollView";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { getCommonResponsiveStyles } from "@/utils/ResponsiveStyles";
import ResponsiveNavigation from "@/components/navigation/ResponsiveNavigation";
import ResponsiveHeader from "@/components/navigation/ResponsiveHeader";
import { getPosterWallConfig } from "@/utils/posterWallConfig";
import { PerfTracker } from "@/utils/PerfTracker";

export default function FavoritesScreen() {
  const { favorites, loading, error, fetchFavorites } = useFavoritesStore();
  const loadMeasurementPendingRef = useRef(false);

  // 响应式布局配置
  const responsiveConfig = useResponsiveLayout();
  const commonStyles = getCommonResponsiveStyles(responsiveConfig);
  const { deviceType, spacing } = responsiveConfig;
  const posterWallConfig = useMemo(
    () => getPosterWallConfig(responsiveConfig),
    [
      responsiveConfig.cardHeight,
      responsiveConfig.cardWidth,
      responsiveConfig.columns,
      responsiveConfig.deviceType,
      responsiveConfig.screenWidth,
      responsiveConfig.spacing,
    ]
  );

  useEffect(() => {
    PerfTracker.mark("Favorites", "load");
    loadMeasurementPendingRef.current = true;
    fetchFavorites();
  }, [fetchFavorites]);

  useEffect(() => {
    if (loading || !loadMeasurementPendingRef.current) return;
    PerfTracker.measure("Favorites", "load", "content-rendered", `${favorites.length} items`);
    loadMeasurementPendingRef.current = false;
  }, [favorites.length, loading, error]);

  const renderItem = useCallback(
    ({ item }: { item: Favorite & { key: string }; index: number }) => {
      const [source, id] = item.key.split("+");
      return (
        <VideoCard
          id={id}
          source={source}
          title={item.title}
          sourceName={item.source_name}
          poster={item.cover}
          year={item.year}
          api={api}
          episodeIndex={1}
          progress={0}
          deviceType={deviceType}
          cardWidth={posterWallConfig.itemWidth}
          cardHeight={posterWallConfig.cardHeight}
          spacing={posterWallConfig.itemSpacing}
        />
      );
    },
    [deviceType, posterWallConfig.cardHeight, posterWallConfig.itemSpacing, posterWallConfig.itemWidth]
  );

  // 动态样式
  const dynamicStyles = useMemo(() => createResponsiveStyles(deviceType, spacing), [deviceType, spacing]);

  const renderFavoritesContent = () => (
    <>
      {deviceType === 'tv' && (
        <View style={dynamicStyles.headerContainer}>
          <ThemedText style={dynamicStyles.headerTitle}>我的收藏</ThemedText>
        </View>
      )}
      <CustomScrollView
        data={favorites}
        renderItem={renderItem}
        numColumns={posterWallConfig.numColumns}
        itemWidth={posterWallConfig.itemWidth}
        itemSpacing={posterWallConfig.itemSpacing}
        contentHorizontalPadding={posterWallConfig.contentHorizontalPadding}
        columnWrapperStyle={posterWallConfig.columnWrapperStyle}
        loading={loading}
        error={error}
        emptyMessage="暂无收藏"
      />
    </>
  );

  const content = (
    <ThemedView style={[commonStyles.container, dynamicStyles.container]}>
      {renderFavoritesContent()}
    </ThemedView>
  );

  // 根据设备类型决定是否包装在响应式导航中
  if (deviceType === 'tv') {
    return content;
  }

  return (
    <ResponsiveNavigation>
      <ResponsiveHeader title="我的收藏" showBackButton />
      {content}
    </ResponsiveNavigation>
  );
}

const createResponsiveStyles = (deviceType: string, spacing: number) => {
  const isMobile = deviceType === 'mobile';
  const isTablet = deviceType === 'tablet';
  const isTV = deviceType === 'tv';

  return StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: isTV ? spacing * 2 : 0,
    },
    headerContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing * 1.5,
      marginBottom: spacing / 2,
    },
    headerTitle: {
      fontSize: isMobile ? 24 : isTablet ? 28 : 32,
      fontWeight: "bold",
      paddingTop: spacing,
      color: 'white',
    },
  });
};
