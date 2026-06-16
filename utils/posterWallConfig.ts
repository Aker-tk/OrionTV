import { ResponsiveConfig } from "@/hooks/useResponsiveLayout";
import { getPosterWallLayout } from "@/utils/posterWallLayout";

export interface PosterWallConfig {
  numColumns: number;
  itemWidth: number;
  cardHeight: number;
  itemSpacing: number;
  contentHorizontalPadding: number;
  columnWrapperStyle?: { justifyContent: "space-between" };
}

export const getPosterWallConfig = (responsiveConfig: ResponsiveConfig): PosterWallConfig => {
  if (responsiveConfig.deviceType !== "tv") {
    return {
      numColumns: responsiveConfig.columns,
      itemWidth: responsiveConfig.cardWidth,
      cardHeight: responsiveConfig.cardHeight,
      itemSpacing: responsiveConfig.spacing,
      contentHorizontalPadding: responsiveConfig.spacing / 2,
    };
  }

  const layout = getPosterWallLayout({
    containerWidth: responsiveConfig.screenWidth,
    horizontalPadding: responsiveConfig.spacing,
    gap: responsiveConfig.spacing,
    minCardWidth: 160,
    aspectRatio: 2 / 3,
    maxColumns: 8,
  });

  return {
    numColumns: layout.columns,
    itemWidth: layout.cardWidth,
    cardHeight: layout.cardHeight,
    itemSpacing: responsiveConfig.spacing,
    contentHorizontalPadding: 0,
    columnWrapperStyle: { justifyContent: "space-between" },
  };
};
