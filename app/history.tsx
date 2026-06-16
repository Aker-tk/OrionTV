import React, { useCallback, useEffect } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import VideoCard from "@/components/VideoCard";
import CustomScrollView from "@/components/CustomScrollView";
import ResponsiveNavigation from "@/components/navigation/ResponsiveNavigation";
import ResponsiveHeader from "@/components/navigation/ResponsiveHeader";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { getCommonResponsiveStyles } from "@/utils/ResponsiveStyles";
import usePlayHistoryStore from "@/stores/playHistoryStore";
import { api } from "@/services/api";
import { getPosterWallConfig } from "@/utils/posterWallConfig";

export default function HistoryScreen() {
  const { items, loading, error, fetchHistory, clearHistory } = usePlayHistoryStore();
  const responsiveConfig = useResponsiveLayout();
  const commonStyles = getCommonResponsiveStyles(responsiveConfig);
  const { deviceType, spacing } = responsiveConfig;
  const posterWallConfig = getPosterWallConfig(responsiveConfig);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleClearHistory = useCallback(() => {
    Alert.alert("清空播放历史", "确定要清空所有播放历史吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "清空",
        style: "destructive",
        onPress: () => {
          clearHistory();
        },
      },
    ]);
  }, [clearHistory]);

  const renderItem = ({ item }: { item: (typeof items)[number]; index: number }) => (
    <VideoCard
      id={item.id}
      source={item.source}
      title={item.title}
      poster={item.cover}
      year={item.year}
      progress={item.progress}
      playTime={item.play_time}
      episodeIndex={item.episodeIndex}
      sourceName={item.sourceName}
      totalEpisodes={item.totalEpisodes}
      api={api}
      onRecordDeleted={fetchHistory}
      deviceType={deviceType}
      cardWidth={posterWallConfig.itemWidth}
      cardHeight={posterWallConfig.cardHeight}
      spacing={posterWallConfig.itemSpacing}
    />
  );

  const dynamicStyles = createResponsiveStyles(deviceType, spacing);

  const content = (
    <ThemedView style={[commonStyles.container, dynamicStyles.container]}>
      {deviceType === "tv" && (
        <View style={dynamicStyles.headerContainer}>
          <View>
            <ThemedText style={dynamicStyles.headerTitle}>播放历史</ThemedText>
            <ThemedText style={dynamicStyles.headerSubtitle}>
              共 {items.length} 条记录
            </ThemedText>
          </View>
          {items.length > 0 && (
            <ThemedText style={dynamicStyles.clearText} onPress={handleClearHistory}>
              清空全部
            </ThemedText>
          )}
        </View>
      )}

      <CustomScrollView
        data={items}
        renderItem={renderItem}
        numColumns={posterWallConfig.numColumns}
        itemWidth={posterWallConfig.itemWidth}
        itemSpacing={posterWallConfig.itemSpacing}
        contentHorizontalPadding={posterWallConfig.contentHorizontalPadding}
        columnWrapperStyle={posterWallConfig.columnWrapperStyle}
        loading={loading}
        error={error}
        emptyMessage="暂无播放历史"
      />
    </ThemedView>
  );

  if (deviceType === "tv") {
    return content;
  }

  return (
    <ResponsiveNavigation>
      <ResponsiveHeader
        title="播放历史"
        showBackButton
        rightComponent={
          items.length > 0 ? (
            <ThemedText style={dynamicStyles.mobileClearText} onPress={handleClearHistory}>
              清空
            </ThemedText>
          ) : null
        }
      />
      {content}
    </ResponsiveNavigation>
  );
}

const createResponsiveStyles = (deviceType: string, spacing: number) => {
  const isMobile = deviceType === "mobile";
  const isTablet = deviceType === "tablet";
  const isTV = deviceType === "tv";

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
      color: "white",
    },
    headerSubtitle: {
      marginTop: spacing / 4,
      color: "#a1a1aa",
      fontSize: isMobile ? 12 : 14,
    },
    clearText: {
      color: "#f87171",
      fontSize: isMobile ? 14 : 16,
      paddingTop: spacing,
    },
    mobileClearText: {
      color: "#f87171",
      fontSize: 14,
      fontWeight: "600",
    },
  });
};
