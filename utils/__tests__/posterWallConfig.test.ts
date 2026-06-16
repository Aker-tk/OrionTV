import { ResponsiveConfig } from "@/hooks/useResponsiveLayout";

import { getPosterWallConfig } from "../posterWallConfig";

describe("getPosterWallConfig", () => {
  const tvConfig: ResponsiveConfig = {
    deviceType: "tv",
    columns: 5,
    cardWidth: 160,
    cardHeight: 240,
    spacing: 16,
    isPortrait: false,
    screenWidth: 1920,
    screenHeight: 1080,
  };

  const mobileConfig: ResponsiveConfig = {
    deviceType: "mobile",
    columns: 3,
    cardWidth: 110,
    cardHeight: 132,
    spacing: 8,
    isPortrait: true,
    screenWidth: 390,
    screenHeight: 844,
  };

  it("returns a space-between TV poster wall config", () => {
    const config = getPosterWallConfig(tvConfig);

    expect(config.numColumns).toBe(8);
    expect(config.itemWidth).toBe(222);
    expect(config.cardHeight).toBe(333);
    expect(config.itemSpacing).toBe(16);
    expect(config.contentHorizontalPadding).toBe(0);
    expect(config.columnWrapperStyle).toEqual({ justifyContent: "space-between" });
  });

  it("keeps non-TV devices on their existing responsive layout", () => {
    const config = getPosterWallConfig(mobileConfig);

    expect(config.numColumns).toBe(3);
    expect(config.itemWidth).toBe(110);
    expect(config.cardHeight).toBe(132);
    expect(config.columnWrapperStyle).toBeUndefined();
  });
});
